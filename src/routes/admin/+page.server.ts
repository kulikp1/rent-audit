import { redirect } from '@sveltejs/kit';
import { requireRole } from '#lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireRole(locals, 'admin');
	redirect(302, '/admin/users');
};
