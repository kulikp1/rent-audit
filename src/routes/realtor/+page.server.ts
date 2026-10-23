import { requireRole } from '#lib/server/auth/guards.js';
import { dashboardAnomalies } from '#lib/server/billing/anomaly-service.js';
import { repo } from '#lib/server/repo.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const [apartments, pendingReadings, unpaidInvoices] = await Promise.all([
		scope.apartments.count(),
		scope.readings.count({ status: 'needs_confirmation' }),
		scope.invoices.count({ status: { $in: ['issued', 'overdue'] } })
	]);
	const anomalies = await dashboardAnomalies(scope);
	return {
		stats: { apartments, pendingReadings, unpaidInvoices, anomalies: anomalies.length },
		anomalies
	};
};
