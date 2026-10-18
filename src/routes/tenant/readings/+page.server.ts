import { requireRole } from '#lib/server/auth/guards.js';
import { tenantContext } from '#lib/server/tenant.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	const context = await tenantContext(user.id);
	if (!context) return { readings: [] };
	const { lease, apartment, scope } = context;
	const [meters, readings] = await Promise.all([
		scope.meters.find({ apartmentId: apartment._id }).lean(),
		scope.readings.find({ leaseId: lease._id }).sort({ period: -1, createdAt: -1 }).lean()
	]);
	const meterById = new Map(meters.map((meter) => [String(meter._id), meter]));
	return {
		readings: readings.map((reading) => {
			const meter = meterById.get(String(reading.meterId));
			return {
				id: String(reading._id),
				period: reading.period,
				values: reading.values,
				status: reading.status,
				rejectReason: reading.rejectReason ?? '',
				meterType: meter?.type ?? 'water',
				serial: meter?.serial ?? ''
			};
		})
	};
};
