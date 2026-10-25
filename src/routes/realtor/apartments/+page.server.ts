import { fail, redirect } from '@sveltejs/kit';
import { PUBLIC_APP_URL } from '$app/env/private';
import { Types } from 'mongoose';
import { fieldErrors } from '#lib/schemas/errors.js';
import { apartmentSchema, apartmentUpdateSchema } from '#lib/schemas/apartment.js';
import { dashboardAnomalies } from '#lib/server/billing/anomaly-service.js';
import { createInvite } from '#lib/server/invites.js';
import { currentRent } from '#lib/server/rent.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { Invite } from '#lib/server/models/invite.js';
import { User } from '#lib/server/models/user.js';
import { parseId, repo } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

function currentPeriodKey(now = new Date()) {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const [apartments, leases, meters, readings, invites, anomalies] = await Promise.all([
		scope.apartments.find().sort({ createdAt: -1 }).lean(),
		scope.leases.find({ endedAt: null }).lean(),
		scope.meters.find({ active: true }).sort({ createdAt: 1 }).lean(),
		scope.readings.find({ period: currentPeriodKey() }).lean(),
		scope.invites
			.find({ usedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } })
			.select('apartmentId')
			.lean(),
		dashboardAnomalies(scope)
	]);
	const tenants = await User.find({ _id: { $in: leases.map((lease) => lease.tenantId) } })
		.select('name picture avatarColor')
		.lean();
	const tenantById = new Map(tenants.map((tenant) => [String(tenant._id), tenant]));
	const tenantByApartment = new Map(
		leases.map((lease) => [String(lease.apartmentId), tenantById.get(String(lease.tenantId))])
	);
	const readingByMeter = new Map(readings.map((reading) => [String(reading.meterId), reading]));
	const problems = new Set(anomalies.map((item) => `${item.apartmentId}:${item.service}`));
	const invited = new Set(invites.map((invite) => String(invite.apartmentId)));

	return {
		apartments: apartments.map((apartment) => {
			const id = String(apartment._id);
			const tenant = tenantByApartment.get(id);
			return {
				id,
				name: apartment.name,
				address: apartment.address,
				rentAmount: currentRent(apartment),
				residents: apartment.residents ?? 1,
				status: apartment.status,
				tenant: tenant
					? {
							name: tenant.name,
							picture: tenant.picture,
							avatarColor: tenant.avatarColor ?? 'blue'
						}
					: null,
				hasInvite: invited.has(id),
				meters: meters
					.filter((meter) => String(meter.apartmentId) === id)
					.map((meter) => {
						const reading = readingByMeter.get(String(meter._id));
						const status: 'received' | 'waiting' | 'problem' = problems.has(`${id}:${meter.type}`)
							? 'problem'
							: reading?.status === 'confirmed'
								? 'received'
								: 'waiting';
						return { id: String(meter._id), type: meter.type, status };
					})
			};
		})
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

	createInvite: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const id = parseId(String((await request.formData()).get('id') ?? ''));
		const scope = await repo(user.id);
		if (!(await scope.apartments.findById(id))) return fail(404, { errors: {} });
		if (await scope.leases.findOne({ apartmentId: id, endedAt: null })) {
			return fail(400, { errors: {}, formError: 'has_tenant' });
		}
		const { token } = await createInvite(scope.realtorId, id);
		return { success: true, inviteUrl: new URL(`/invite/${token}`, PUBLIC_APP_URL).toString() };
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
