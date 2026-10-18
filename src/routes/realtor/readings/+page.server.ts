import { error, fail } from '@sveltejs/kit';
import { requireRole } from '#lib/server/auth/guards.js';
import { readingViews } from '#lib/server/reading-views.js';
import { parseId, repo } from '#lib/server/repo.js';
import { checkReadingAnomaly } from '#lib/server/billing/anomaly-service.js';
import { utilitiesLocked } from '#lib/server/billing/invoices.js';
import { fitsDigits } from '#lib/server/validation/reading.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const all = url.searchParams.get('status') === 'all';
	const readings = await readingViews(scope, all ? {} : { status: 'needs_confirmation' });
	const apartments = await scope.apartments.find().select('name').sort({ name: 1 }).lean();
	return {
		all,
		readings,
		apartments: apartments.map((apartment) => ({ id: String(apartment._id), name: apartment.name }))
	};
};

export const actions: Actions = {
	confirm: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const scope = await repo(user.id);
		const reading = await scope.readings.findById(parseId(String(data.get('id') ?? '')));
		if (!reading) error(404);
		if (reading.status !== 'needs_confirmation') return fail(400, { formError: 'not_pending' });
		if (await utilitiesLocked(scope, reading.apartmentId, reading.period)) {
			return fail(400, { formError: 'locked' });
		}
		reading.status = 'confirmed';
		reading.confirmedAt = new Date();
		await reading.save();
		await checkReadingAnomaly(scope, reading);
		return { success: true };
	},

	correct: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const scope = await repo(user.id);
		const reading = await scope.readings.findById(parseId(String(data.get('id') ?? '')));
		if (!reading) error(404);
		const meter = await scope.meters.findById(reading.meterId);
		if (!meter) error(404);
		if (reading.status === 'rejected') return fail(400, { errors: {}, formError: 'not_pending' });
		if (await utilitiesLocked(scope, reading.apartmentId, reading.period)) {
			return fail(400, { errors: {}, formError: 'locked' });
		}

		const errors: Record<string, string> = {};
		const values = Array.from({ length: meter.zones }, (_, zone) => {
			const raw = String(data.get(`v_${meter._id}_${zone}`) ?? '')
				.trim()
				.replace(',', '.');
			const value = /^\d+(\.\d{1,3})?$/.test(raw) ? Number(raw) : Number.NaN;
			if (Number.isNaN(value) || !fitsDigits([value], meter.digits)) {
				errors[`v_${meter._id}_${zone}`] = raw === '' ? 'required' : 'invalid_reading';
			}
			return value;
		});
		const reason = String(data.get('reason') ?? '').trim();
		if (!reason) errors.reason = 'required';
		if (Object.keys(errors).length > 0) return fail(400, { errors });

		reading.history.push({ values, label: 'realtor', reason, at: new Date() });
		reading.values = values;
		reading.status = 'confirmed';
		reading.confirmedAt = new Date();
		await reading.save();
		await checkReadingAnomaly(scope, reading);
		return { success: true };
	},

	reject: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const scope = await repo(user.id);
		const reading = await scope.readings.findById(parseId(String(data.get('id') ?? '')));
		if (!reading) error(404);
		if (await utilitiesLocked(scope, reading.apartmentId, reading.period)) {
			return fail(400, { errors: {}, formError: 'locked' });
		}
		const reason = String(data.get('reason') ?? '').trim();
		if (!reason) return fail(400, { errors: { reason: 'required' } });
		reading.status = 'rejected';
		reading.rejectReason = reason;
		await reading.save();
		return { success: true };
	}
};
