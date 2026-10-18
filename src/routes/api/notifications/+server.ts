import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { markRead } from '#lib/server/notifications.js';
import type { RequestHandler } from './$types';

const body = z.object({ id: z.string().optional() });

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401);
	const parsed = body.safeParse(await request.json().catch(() => ({})));
	if (!parsed.success) error(400);
	await markRead(locals.user.id, parsed.data.id);
	return json({ ok: true });
};
