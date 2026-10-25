import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '#lib/server/auth/guards.js';
import {
	createRentInvoice,
	createUtilitiesInvoice,
	invoiceViews,
	type CreateError
} from '#lib/server/billing/invoices.js';
import { previousPeriod } from '#lib/server/billing/calc.js';
import { User } from '#lib/server/models/user.js';
import { parseId, repo } from '#lib/server/repo.js';
import { currentPeriod } from '#lib/utils/format.js';
import type { Actions, PageServerLoad } from './$types';

const createSchema = z.object({
	apartmentId: z.string().min(1, 'required'),
	type: z.enum(['rent', 'utilities'], 'required'),
	period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'invalid_date')
});

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const [invoices, leases, realtor] = await Promise.all([
		scope.invoices.find().sort({ createdAt: -1 }).limit(200).lean(),
		scope.leases.find({ endedAt: null }).lean(),
		User.findById(user.id).select('realtorProfile').lean()
	]);
	const rented = await scope.apartments
		.find({ _id: { $in: leases.map((lease) => lease.apartmentId) } })
		.select('name')
		.sort({ name: 1 })
		.lean();
	return {
		invoices: await invoiceViews(scope, invoices),
		apartments: rented.map((apartment) => ({ id: String(apartment._id), name: apartment.name })),
		payoutReady: !!(realtor?.realtorProfile?.iban && realtor.realtorProfile.fullName),
		defaults: { utilities: previousPeriod(), rent: currentPeriod() }
	};
};

function describe(error: CreateError) {
	const detail = 'serial' in error ? error.serial : 'service' in error ? error.service : '';
	return { formError: error.code, detail };
}

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = createSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { errors });
		}
		const scope = await repo(user.id);
		const apartment = await scope.apartments.findById(parseId(parsed.data.apartmentId));
		const lease = apartment
			? await scope.leases.findOne({ apartmentId: apartment._id, endedAt: null })
			: null;
		if (!apartment || !lease) return fail(400, { errors: {}, formError: 'no_tenant' });

		const result =
			parsed.data.type === 'rent'
				? await createRentInvoice(scope, apartment, lease, parsed.data.period)
				: await createUtilitiesInvoice(scope, apartment, lease, parsed.data.period);
		if (!result.ok) return fail(400, { errors: {}, ...describe(result.error) });
		redirect(303, `/realtor/invoices/${result.invoice._id}`);
	}
};
