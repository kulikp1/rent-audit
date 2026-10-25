import { requireRole } from '#lib/server/auth/guards.js';
import { dashboardAnomalies } from '#lib/server/billing/anomaly-service.js';
import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import { repo } from '#lib/server/repo.js';
import type { PageServerLoad } from './$types';

const DAY_MS = 86_400_000;

function nextCollection(readingsDay: number, now = new Date()) {
	const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
	const thisMonth = Date.UTC(now.getFullYear(), now.getMonth(), readingsDay);
	const next =
		thisMonth >= today ? thisMonth : Date.UTC(now.getFullYear(), now.getMonth() + 1, readingsDay);
	const nextDate = new Date(next);
	const previous = Date.UTC(nextDate.getUTCFullYear(), nextDate.getUTCMonth() - 1, readingsDay);
	const days = Math.round((next - today) / DAY_MS);
	const cycle = Math.round((next - previous) / DAY_MS);
	return { date: nextDate.toISOString().slice(0, 10), days, progress: 1 - days / cycle };
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const [apartments, pendingReadings, unpaidInvoices] = await Promise.all([
		scope.apartments.count(),
		scope.readings.count({ status: 'needs_confirmation' }),
		scope.invoices.count({ status: { $in: ['issued', 'overdue'] } })
	]);
	const anomalies = await dashboardAnomalies(scope);
	await connectDb();
	const profile = await User.findById(user.id).select('realtorProfile').lean();
	return {
		stats: { apartments, pendingReadings, unpaidInvoices, anomalies: anomalies.length },
		anomalies,
		nextCollection: nextCollection(profile?.realtorProfile?.readingsDay ?? 1)
	};
};
