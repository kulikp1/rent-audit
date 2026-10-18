import { requireRole } from '#lib/server/auth/guards.js';
import { notificationList } from '#lib/server/notifications.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	return { items: await notificationList(user.id) };
};
