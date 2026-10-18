import { error, fail } from '@sveltejs/kit';
import { fieldErrors } from '#lib/schemas/errors.js';
import { tariffSchema } from '#lib/schemas/tariff.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { nationalTariffs, toTariffView } from '#lib/server/billing/tariffs.js';
import { connectDb } from '#lib/server/db.js';
import { Tariff } from '#lib/server/models/tariff.js';
import { parseId } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

const services = ['electricity', 'gas'] as const;

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	const rows = (await nationalTariffs()).map(toTariffView);
	return {
		electricity: rows.filter((row) => row.service === 'electricity'),
		gas: rows.filter((row) => row.service === 'gas')
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const parsed = tariffSchema(services).safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		await connectDb();
		const { service, price, nightPrice, effectiveFrom } = parsed.data;
		await Tariff.create({
			scope: 'national',
			service,
			price,
			nightPrice: service === 'electricity' ? nightPrice : undefined,
			effectiveFrom
		});
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		requireRole(locals, 'admin');
		const data = await request.formData();
		await connectDb();
		const tariff = await Tariff.findOne({
			_id: parseId(String(data.get('id') ?? '')),
			scope: 'national'
		});
		if (!tariff) error(404);
		if (tariff.effectiveFrom.getTime() <= Date.now()) return fail(400, { formError: 'in_effect' });
		await tariff.deleteOne();
		return { success: true };
	}
};
