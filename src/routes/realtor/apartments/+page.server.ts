import { fail, redirect } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { fieldErrors } from '#lib/schemas/errors.js';
import { apartmentSchema, apartmentUpdateSchema } from '#lib/schemas/apartment.js';
import { currentRent } from '#lib/server/rent.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { Invite } from '#lib/server/models/invite.js';
import { User } from '#lib/server/models/user.js';
import { parseId, repo } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const [apartments, leases] = await Promise.all([
		scope.apartments.find().sort({ createdAt: -1 }).lean(),
		scope.leases.find({ endedAt: null }).lean()
	]);
	const tenants = await User.find({ _id: { $in: leases.map((lease) => lease.tenantId) } })
		.select('name')
		.lean();
	const tenantName = new Map(tenants.map((tenant) => [String(tenant._id), tenant.name]));
	const tenantByApartment = new Map(
		leases.map((lease) => [
			String(lease.apartmentId),
			tenantName.get(String(lease.tenantId)) ?? null
		])
	);
	return {
		apartments: apartments.map((apartment) => ({
			id: String(apartment._id),
			name: apartment.name,
			address: apartment.address,
			rentAmount: currentRent(apartment),
			residents: apartment.residents ?? 1,
			status: apartment.status,
			tenantName: tenantByApartment.get(String(apartment._id)) ?? null
		}))
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const parsed = apartmentSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const scope = await repo(user.id);
		const apartment = await scope.apartments.create({
			...parsed.data,
			rentHistory: [{ amount: parsed.data.rentAmount, effectiveFrom: new Date() }]
		});
		redirect(303, `/realtor/apartments/${apartment._id}`);
	},

	update: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = Object.fromEntries(await request.formData());
		const id = parseId(String(data.id ?? ''));
		const parsed = apartmentUpdateSchema.safeParse(data);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		const scope = await repo(user.id);
		const result = await scope.apartments.updateOne({ _id: id }, { $set: parsed.data });
		if (result.matchedCount === 0) return fail(404, { errors: {}, formError: 'not_found' });
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const data = await request.formData();
		const id = parseId(String(data.get('id') ?? ''));
		const scope = await repo(user.id);
		if (await scope.leases.findOne({ apartmentId: id, endedAt: null })) {
			return fail(400, { errors: {}, formError: 'has_tenant' });
		}
		const apartmentId = new Types.ObjectId(id);
		await Promise.all([
			scope.meters.deleteMany({ apartmentId }),
			scope.readings.deleteMany({ apartmentId }),
			scope.leases.deleteMany({ apartmentId }),
			scope.invites.deleteMany({ apartmentId }),
			Invite.deleteMany({ apartmentId, realtorId: scope.realtorId })
		]);
		await scope.apartments.deleteOne({ _id: id });
		return { success: true };
	}
};
