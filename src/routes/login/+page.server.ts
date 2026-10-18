import { redirect } from '@sveltejs/kit';
import { homeFor } from '#lib/server/auth/home.js';
import type { PageServerLoad } from './$types';

const knownErrors = [
	'cancelled',
	'invalid',
	'google',
	'invite_invalid',
	'invite_expired',
	'invite_used',
	'invite_taken',
	'invite_role',
	'invite_has_lease'
] as const;

export const load: PageServerLoad = ({ locals, url }) => {
	if (locals.user) redirect(302, homeFor(locals.user.role));
	const error = url.searchParams.get('error');
	return { error: knownErrors.find((code) => code === error) ?? null };
};
