import { redirect } from '@sveltejs/kit';
import type { Role } from '../models/user';
import { homeFor } from './home';

export function requireRole(locals: App.Locals, role: Role) {
	if (!locals.user) redirect(302, '/login');
	if (locals.user.role !== role) redirect(302, homeFor(locals.user.role));
	return locals.user;
}
