import { requireRole } from '#lib/server/auth/guards.js';
import { notificationSummary } from '#lib/server/notifications.js';
import { tenantContext } from '#lib/server/tenant.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	const context = await tenantContext(user.id);
	return { hasLease: !!context, notifications: await notificationSummary(user.id) };
};
