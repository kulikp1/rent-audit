import { redirect } from '@sveltejs/kit';
import { buildAuthUrl } from '#lib/server/auth/google.js';
import { randomToken } from '#lib/server/auth/tokens.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ cookies, url }) => {
	const state = randomToken(16);
	const verifier = randomToken(48);
	cookies.set('ra_oauth', JSON.stringify({ state, verifier }), {
		path: '/auth',
		httpOnly: true,
		secure: url.protocol === 'https:',
		sameSite: 'lax',
		maxAge: 600
	});
	redirect(302, buildAuthUrl(state, verifier), { external: true });
};
