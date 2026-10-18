import type { Role } from '../models/user';

export function homeFor(role: Role): string {
	if (role === 'admin') return '/admin';
	if (role === 'tenant') return '/tenant';
	return '/realtor';
}
