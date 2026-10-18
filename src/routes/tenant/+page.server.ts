import { requireRole } from '#lib/server/auth/guards.js';
import { latestValues } from '#lib/server/invites.js';
import { User } from '#lib/server/models/user.js';
import { currentPeriod } from '#lib/utils/format.js';
import { tenantContext, tenantInvoices } from '#lib/server/tenant.js';
import { currentRent, pendingRentChange } from '#lib/server/rent.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	const context = await tenantContext(user.id);
	if (!context) return { lease: null };
	const { lease, apartment, scope } = context;

	const openInvoices = (await tenantInvoices(user.id)).filter(
		(invoice) => invoice.status === 'issued' || invoice.status === 'overdue'
	);
	const [meters, realtor, readings] = await Promise.all([
		scope.meters.find({ apartmentId: apartment._id, active: true }).lean(),
		User.findById(apartment.realtorId).select('name').lean(),
		scope.readings.find({ leaseId: lease._id, period: currentPeriod() }).lean()
	]);
	const submitted = new Set(
		readings
			.filter((reading) => reading.status !== 'rejected')
			.map((reading) => String(reading.meterId))
	);
	const rejected = new Map(
		readings
			.filter((reading) => reading.status === 'rejected')
			.map((reading) => [String(reading.meterId), reading.rejectReason])
	);
	const pending = await Promise.all(
		meters.map(async (meter) => ({
			id: String(meter._id),
			type: meter.type,
			serial: meter.serial,
			submitted: submitted.has(String(meter._id)),
			rejectReason: rejected.get(String(meter._id)) ?? null,
			last: await latestValues(meter._id, meter.initialReading)
		}))
	);

	return {
		lease: { startedAt: lease.startedAt.toISOString() },
		apartment: {
			name: apartment.name,
			address: apartment.address,
			rentAmount: currentRent(apartment)
		},
		rentChange: pendingRentChange(apartment, lease._id),
		realtorName: realtor?.name ?? '',
		meters: pending,
		period: currentPeriod(),
		openInvoices: {
			count: openInvoices.length,
			total: openInvoices.reduce((sum, invoice) => sum + invoice.total, 0),
			overdue: openInvoices.some((invoice) => invoice.status === 'overdue')
		}
	};
};

export const actions: Actions = {
	ack: async ({ locals }) => {
		const user = requireRole(locals, 'tenant');
		const context = await tenantContext(user.id);
		if (!context) return { success: false };
		const { lease, apartment } = context;
		const now = new Date();
		for (const entry of apartment.rentHistory) {
			if (entry.notifiedAt && !entry.ackedAt && String(entry.leaseId) === String(lease._id)) {
				entry.ackedAt = now;
			}
		}
		apartment.markModified('rentHistory');
		await apartment.save();
		return { success: true };
	}
};
