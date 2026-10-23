import { requireRole } from '#lib/server/auth/guards.js';
import { allAnomalies } from '#lib/server/billing/anomaly-service.js';
import { repo } from '#lib/server/repo.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const apartments = await scope.apartments.find().sort({ name: 1 }).lean();
	return {
		apartments: apartments.map((item) => ({ id: String(item._id), name: item.name })),
		anomalies: await allAnomalies(scope)
	};
};
