import { error, fail } from '@sveltejs/kit';
import { fieldErrors } from '#lib/schemas/errors.js';
import { tariffSchema } from '#lib/schemas/tariff.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { localTariffs, toTariffView } from '#lib/server/billing/tariffs.js';
import { connectDb } from '#lib/server/db.js';
import { Tariff } from '#lib/server/models/tariff.js';
import { parseId, repo } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const rows = (await localTariffs(scope.realtorId)).map(toTariffView);
	return {
		electricity: rows.filter((row) => row.service === 'electricity'),
		gas: rows.filter((row) => row.service === 'gas'),
		water: rows.filter((row) => row.service === 'water')
	};
};

const services = ['electricity', 'gas', 'water'] as const;

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = tariffSchema(services).safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const scope = await repo(user.id);
		const { service, price, nightPrice, effectiveFrom } = parsed.data;
		await Tariff.create({
			realtorId: scope.realtorId,
			service,
			price,
			nightPrice: service === 'electricity' ? nightPrice : undefined,
			effectiveFrom
		});
		return { success: true };
	},

	remove: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const scope = await repo(user.id);
		await connectDb();
		const tariff = await Tariff.findOne({
			_id: parseId(String(data.get('id') ?? '')),
			realtorId: scope.realtorId
		});
		if (!tariff) error(404);
		if (tariff.effectiveFrom.getTime() <= Date.now()) return fail(400, { formError: 'in_effect' });
		await tariff.deleteOne();
		return { success: true };
	}
};
