import { redirect } from '@sveltejs/kit';
import { homeFor } from '#lib/server/auth/home.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	redirect(302, locals.user ? homeFor(locals.user.role) : '/login');
};
