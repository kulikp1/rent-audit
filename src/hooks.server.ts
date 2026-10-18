import type { Handle } from '@sveltejs/kit/hooks';
import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';
import { resolveSession } from '#lib/server/auth/session.js';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) =>
		resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		)
	);

const handleAuth: Handle = async ({ event, resolve }) => {
	const claims = await resolveSession(event.cookies, event.url.protocol === 'https:');
	event.locals.user = claims ? { id: claims.userId, role: claims.role } : null;
	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleAuth);
