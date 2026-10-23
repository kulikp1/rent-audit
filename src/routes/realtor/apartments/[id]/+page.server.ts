import { error, fail, redirect } from '@sveltejs/kit';
import { PUBLIC_APP_URL } from '$app/env/private';
import { fieldErrors } from '#lib/schemas/errors.js';
import { apartmentUpdateSchema } from '#lib/schemas/apartment.js';
import { rentChangeSchema } from '#lib/schemas/rent.js';
import { apartmentAnomalies } from '#lib/server/billing/anomaly-service.js';
import { statsFor } from '#lib/server/billing/stats.js';
import { notify } from '#lib/server/notifications.js';
import { currentRent, rentHistoryViews } from '#lib/server/rent.js';
import { meterInitialValues, meterSchema } from '#lib/schemas/meter.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { createInvite, latestValues } from '#lib/server/invites.js';
import { previousFor } from '#lib/server/readings.js';
import { Invite } from '#lib/server/models/invite.js';
import { readingViews } from '#lib/server/reading-views.js';
import { User } from '#lib/server/models/user.js';
import { parseId, repo } from '#lib/server/repo.js';
import { fitsDigits } from '#lib/server/validation/reading.js';
import type { Actions, PageServerLoad } from './$types';

const tabs = ['overview', 'meters', 'tenant', 'readings', 'rent', 'statistics'] as const;

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const apartmentId = parseId(params.id);
	const apartment = await scope.apartments.findById(apartmentId).lean();
	if (!apartment) error(404);

	const [meters, lease, invite, readings] = await Promise.all([
		scope.meters.find({ apartmentId }).sort({ createdAt: 1 }).lean(),
		scope.leases.findOne({ apartmentId, endedAt: null }).lean(),
		Invite.findOne({
			realtorId: scope.realtorId,
			apartmentId,
			usedAt: null,
			revokedAt: null,
			expiresAt: { $gt: new Date() }
		}).lean(),
		readingViews(scope, { apartmentId }, 60)
	]);
	const anomalies = await apartmentAnomalies(scope, apartment);
	const tenant = lease
		? await User.findById(lease.tenantId).select('name email picture').lean()
		: null;
	const requested = url.searchParams.get('tab');
	const tab = tabs.find((item) => item === requested) ?? 'overview';

	return {
		tab,
		anomalies,
		stats: tab === 'statistics' ? await statsFor(scope, apartment) : [],
		rent: { current: currentRent(apartment), history: rentHistoryViews(apartment) },
		apartment: {
			id: String(apartment._id),
			name: apartment.name,
			address: apartment.address,
			rentAmount: currentRent(apartment),
			residents: apartment.residents ?? 1,
			status: apartment.status,
			createdAt: apartment.createdAt.toISOString()
		},
		meters: meters.map((meter) => ({
			id: String(meter._id),
			type: meter.type,
			serial: meter.serial,
			digits: meter.digits,
			zones: meter.zones,
			initialReading: meter.initialReading,
			active: meter.active,
			replacedById: meter.replacedById ? String(meter.replacedById) : null,
			finalReading: meter.finalReading
		})),
		lease: lease ? { id: String(lease._id), startedAt: lease.startedAt.toISOString() } : null,
		tenant: tenant ? { name: tenant.name, email: tenant.email, picture: tenant.picture } : null,
		invite: invite ? { expiresAt: invite.expiresAt.toISOString() } : null,
		readings
	};
};

async function ownedApartment(userId: string, id: string) {
	const scope = await repo(userId);
	const apartmentId = parseId(id);
	const apartment = await scope.apartments.findById(apartmentId);
	if (!apartment) error(404);
	return { scope, apartment, apartmentId };
}

export const actions: Actions = {
	update: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = apartmentUpdateSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		await scope.apartments.updateOne({ _id: apartmentId }, { $set: parsed.data });
		return { success: true };
	},

	changeRent: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = rentChangeSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { scope, apartment, apartmentId } = await ownedApartment(user.id, params.id);
		const lease = await scope.leases.findOne({ apartmentId, endedAt: null });
		const now = new Date();
		apartment.rentHistory.push({
			amount: parsed.data.amount,
			effectiveFrom: parsed.data.effectiveFrom,
			leaseId: lease?._id,
			notifiedAt: lease ? now : undefined
		});
		if (parsed.data.effectiveFrom.getTime() <= now.getTime())
			apartment.rentAmount = parsed.data.amount;
		await apartment.save();
		if (lease) {
			await notify(lease.tenantId, 'rent_changed', {
				amount: parsed.data.amount,
				effectiveFrom: parsed.data.effectiveFrom.toISOString()
			});
		}
		return { success: true };
	},

	remove: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		if (await scope.leases.findOne({ apartmentId, endedAt: null })) {
			return fail(400, { errors: {}, formError: 'has_tenant' });
		}
		await Promise.all([
			scope.meters.deleteMany({ apartmentId }),
			scope.readings.deleteMany({ apartmentId }),
			scope.leases.deleteMany({ apartmentId }),
			Invite.deleteMany({ apartmentId, realtorId: scope.realtorId })
		]);
		await scope.apartments.deleteOne({ _id: apartmentId });
		redirect(303, '/realtor/apartments');
	},

	addMeter: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = meterSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		await scope.meters.create({
			apartmentId,
			type: parsed.data.type,
			serial: parsed.data.serial,
			digits: parsed.data.digits,
			zones: parsed.data.zones,
			initialReading: meterInitialValues(parsed.data)
		});
		return { success: true };
	},

	updateMeter: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = Object.fromEntries(await request.formData());
		const parsed = meterSchema.safeParse(data);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		const meterId = parseId(String(data.id ?? ''));
		const result = await scope.meters.updateOne(
			{ _id: meterId, apartmentId },
			{
				$set: {
					type: parsed.data.type,
					serial: parsed.data.serial,
					digits: parsed.data.digits,
					zones: parsed.data.zones,
					initialReading: meterInitialValues(parsed.data)
				}
			}
		);
		if (result.matchedCount === 0) error(404);
		return { success: true };
	},

	replaceMeter: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = Object.fromEntries(await request.formData());
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		const old = await scope.meters.findOne({
			_id: parseId(String(data.id ?? '')),
			apartmentId,
			active: true
		});
		if (!old) error(404);

		const parsed = meterSchema.safeParse({ ...data, type: old.type });
		const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

		const finalValues = Array.from({ length: old.zones }, (_, zone) => {
			const raw = String(data[`final_${old._id}_${zone}`] ?? '')
				.trim()
				.replace(',', '.');
			const value = /^\d+(\.\d{1,3})?$/.test(raw) ? Number(raw) : Number.NaN;
			if (Number.isNaN(value) || !fitsDigits([value], old.digits)) {
				errors[`final_${old._id}_${zone}`] = raw === '' ? 'required' : 'invalid_reading';
			}
			return value;
		});
		if (Object.keys(errors).length === 0) {
			const { previous } = await previousFor(scope, old);
			if (
				finalValues.some((value, zone) => previous[zone] !== undefined && value < previous[zone]!)
			) {
				errors[`final_${old._id}_0`] = 'reading_lower';
			}
		}
		if (!parsed.success || Object.keys(errors).length > 0) return fail(400, { errors });

		const replacement = await scope.meters.create({
			apartmentId,
			type: old.type,
			serial: parsed.data.serial,
			digits: parsed.data.digits,
			zones: parsed.data.zones,
			initialReading: meterInitialValues(parsed.data),
			replacesId: old._id
		});
		old.active = false;
		old.replacedById = replacement._id;
		old.replacedAt = new Date();
		old.set('finalReading', finalValues);
		await old.save();
		return { success: true };
	},

	toggleMeter: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		const meter = await scope.meters.findOne({
			_id: parseId(String(data.get('id') ?? '')),
			apartmentId
		});
		if (!meter) error(404);
		meter.active = !meter.active;
		await meter.save();
		return { success: true };
	},

	deleteMeter: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		const meterId = parseId(String(data.get('id') ?? ''));
		if (await scope.readings.count({ meterId }))
			return fail(400, { errors: {}, formError: 'has_readings' });
		await scope.meters.deleteOne({ _id: meterId, apartmentId });
		return { success: true };
	},

	createInvite: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		if (await scope.leases.findOne({ apartmentId, endedAt: null })) {
			return fail(400, { errors: {}, formError: 'has_tenant' });
		}
		const { token, expiresAt } = await createInvite(scope.realtorId, apartmentId);
		return {
			success: true,
			inviteUrl: new URL(`/invite/${token}`, PUBLIC_APP_URL).toString(),
			expiresAt: expiresAt.toISOString()
		};
	},

	revokeInvite: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, apartmentId } = await ownedApartment(user.id, params.id);
		await Invite.updateMany(
			{ realtorId: scope.realtorId, apartmentId, usedAt: null, revokedAt: null },
			{ revokedAt: new Date() }
		);
		return { success: true };
	},

	endLease: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const { scope, apartment, apartmentId } = await ownedApartment(user.id, params.id);
		const lease = await scope.leases.findOne({ apartmentId, endedAt: null });
		if (!lease) return fail(400, { errors: {}, formError: 'no_lease' });

		const meters = await scope.meters.find({ apartmentId, active: true });
		const errors: Record<string, string> = {};
		const moveOutReadings = [];
		for (const meter of meters) {
			const values: number[] = [];
			for (let zone = 0; zone < meter.zones; zone += 1) {
				const raw = String(data.get(`out_${meter._id}_${zone}`) ?? '')
					.trim()
					.replace(',', '.');
				values.push(/^\d+(\.\d{1,3})?$/.test(raw) ? Number(raw) : Number.NaN);
			}
			if (!fitsDigits(values, meter.digits)) {
				errors[`out_${meter._id}_0`] = 'invalid_reading';
				continue;
			}
			const previous = await latestValues(meter._id, meter.initialReading);
			if (values.some((value, zone) => previous[zone] !== undefined && value < previous[zone]!)) {
				errors[`out_${meter._id}_0`] = 'reading_lower';
				continue;
			}
			moveOutReadings.push({ meterId: meter._id, values });
		}
		if (Object.keys(errors).length > 0) return fail(400, { errors });

		lease.endedAt = new Date();
		lease.set('moveOutReadings', moveOutReadings);
		await lease.save();
		apartment.status = 'free';
		await apartment.save();
		await Invite.updateMany(
			{ realtorId: scope.realtorId, apartmentId, usedAt: null, revokedAt: null },
			{ revokedAt: new Date() }
		);
		return { success: true };
	}
};
