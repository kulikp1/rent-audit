import { requireRole } from '#lib/server/auth/guards.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => {
	requireRole(locals, 'admin');
};
