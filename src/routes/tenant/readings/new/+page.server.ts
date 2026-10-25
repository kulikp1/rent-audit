import { fail, redirect } from '@sveltejs/kit';
import { requireRole } from '#lib/server/auth/guards.js';
import { notify } from '#lib/server/notifications.js';
import { User } from '#lib/server/models/user.js';
import { cloudinaryConfigured, publicIdBelongsTo } from '#lib/server/cloudinary.js';
import { geminiConfigured } from '#lib/server/gemini.js';
import { verifyRecognition, type RecognitionClaims } from '#lib/server/recognition-token.js';
import { previousFor, submitReading } from '#lib/server/readings.js';
import { requireTenantContext, tenantContext } from '#lib/server/tenant.js';
import { fitsDigits } from '#lib/server/validation/reading.js';
import { currentPeriod } from '#lib/utils/format.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	const context = await tenantContext(user.id);
	if (!context) redirect(303, '/tenant');
	const { lease, apartment, scope } = context;
	const period = currentPeriod();
	const [meters, existing] = await Promise.all([
		scope.meters.find({ apartmentId: apartment._id, active: true }),
		scope.readings.find({ leaseId: lease._id, period }).lean()
	]);
	const state = new Map(existing.map((reading) => [String(reading.meterId), reading]));
	const sent = meters
		.map((meter) => ({ meter, reading: state.get(String(meter._id)) }))
		.filter(({ reading }) => reading && reading.status !== 'rejected')
		.map(({ meter, reading }) => ({
			id: String(meter._id),
			type: meter.type,
			values: reading!.values,
			sentAt: reading!.createdAt.toISOString()
		}));
	const open = meters.filter((meter) => {
		const reading = state.get(String(meter._id));
		return !reading || reading.status === 'rejected';
	});
	return {
		period,
		sent,
		capabilities: {
			photos: cloudinaryConfigured(),
			ai: cloudinaryConfigured() && geminiConfigured()
		},
		meters: await Promise.all(
			open.map(async (meter) => ({
				id: String(meter._id),
				type: meter.type,
				serial: meter.serial,
				digits: meter.digits,
				zones: meter.zones,
				previous: (await previousFor(scope, meter)).previous,
				rejectReason: state.get(String(meter._id))?.rejectReason ?? ''
			}))
		)
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals, 'tenant');
		const { lease, apartment, scope } = await requireTenantContext(user.id);
		const data = await request.formData();
		const period = currentPeriod();

		const meters = await scope.meters.find({ apartmentId: apartment._id, active: true });
		const errors: Record<string, string> = {};
		const accepted: {
			meter: (typeof meters)[number];
			values: number[];
			claims: RecognitionClaims | null;
			photoPublicId: string;
			reason: string;
		}[] = [];

		for (const meter of meters) {
			const raw = Array.from({ length: meter.zones }, (_, zone) =>
				String(data.get(`v_${meter._id}_${zone}`) ?? '')
					.trim()
					.replace(',', '.')
			);
			if (raw.every((value) => value === '')) continue;

			const values = raw.map((value) =>
				/^\d+(\.\d{1,3})?$/.test(value) ? Number(value) : Number.NaN
			);
			let valid = true;
			values.forEach((value, zone) => {
				if (Number.isNaN(value) || !fitsDigits([value], meter.digits)) {
					errors[`v_${meter._id}_${zone}`] = raw[zone] === '' ? 'required' : 'invalid_reading';
					valid = false;
				}
			});

			const token = String(data.get(`rec_${meter._id}`) ?? '');
			let claims: RecognitionClaims | null = null;
			if (token) {
				claims = await verifyRecognition(token);
				if (
					!claims ||
					claims.meterId !== String(meter._id) ||
					claims.leaseId !== String(lease._id) ||
					!publicIdBelongsTo(claims.publicId, String(apartment._id))
				) {
					claims = null;
				}
			}

			const photo = String(data.get(`photo_${meter._id}`) ?? '');
			const photoPublicId = publicIdBelongsTo(photo, String(apartment._id)) ? photo : '';
			const reason = String(data.get(`reason_${meter._id}`) ?? '').trim();

			if (
				valid &&
				claims &&
				claims.numbers.length > 0 &&
				values.some((value, zone) => value !== claims.numbers[zone]) &&
				!reason
			) {
				errors[`reason_${meter._id}`] = 'required';
				valid = false;
			}

			if (valid) accepted.push({ meter, values, claims, photoPublicId, reason });
		}

		if (Object.keys(errors).length > 0) return fail(400, { errors });
		if (accepted.length === 0) return fail(400, { errors: {}, formError: 'nothing' });

		for (const item of accepted) {
			await submitReading({
				scope,
				leaseId: lease._id,
				apartmentId: apartment._id,
				meter: item.meter,
				period,
				values: item.values,
				claims: item.claims,
				photoPublicId: item.photoPublicId,
				reason: item.reason
			});
		}

		const tenant = await User.findById(user.id).select('name').lean();
		await notify(scope.realtorId, 'readings_submitted', {
			apartmentId: String(apartment._id),
			apartmentName: apartment.name,
			tenantName: tenant?.name ?? '',
			count: accepted.length
		});

		redirect(303, '/tenant/readings?sent=1');
	}
};
