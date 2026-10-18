import { requireRole } from '#lib/server/auth/guards.js';
import { notificationSummary } from '#lib/server/notifications.js';
import { repo } from '#lib/server/repo.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	const scope = await repo(user.id);
	return {
		pendingReadings: await scope.readings.count({ status: 'needs_confirmation' }),
		notifications: await notificationSummary(user.id)
	};
};
