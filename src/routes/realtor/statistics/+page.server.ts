import { requireRole } from '#lib/server/auth/guards.js';
import { statsFor } from '#lib/server/billing/stats.js';
import { repo } from '#lib/server/repo.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	const apartments = await scope.apartments.find().sort({ name: 1 }).lean();
	const requested = url.searchParams.get('apartment');
	const selected =
		apartments.find((item) => String(item._id) === requested) ?? apartments[0] ?? null;
	return {
		apartments: apartments.map((item) => ({ id: String(item._id), name: item.name })),
		selectedId: selected ? String(selected._id) : null,
		stats: selected ? await statsFor(scope, selected) : []
	};
};
