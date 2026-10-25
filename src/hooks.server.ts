import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { resolveSession } from '#lib/server/auth/session.js';

const THEME_COOKIE = 'ra_theme';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
						.replace('%app.theme%', event.cookies.get(THEME_COOKIE) === 'light' ? 'light' : 'dark')
			}
		)
	);

const handleAuth: Handle = async ({ event, resolve }) => {
	const claims = await resolveSession(event.cookies, event.url.protocol === 'https:');
	event.locals.user = claims ? { id: claims.userId, role: claims.role } : null;
	return resolve(event);
};

const handleHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
	if (event.url.protocol === 'https:') {
		response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	return response;
};

export const handle: Handle = sequence(handleParaglide, handleAuth, handleHeaders);
