import { error, json } from '@sveltejs/kit';
import { avatarBelongsTo, avatarUrl, cloudinaryConfigured } from '#lib/server/cloudinary.js';
import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) error(401);
	if (!cloudinaryConfigured()) error(503, 'storage_unavailable');
	const body = (await request.json().catch(() => null)) as { publicId?: unknown } | null;
	const publicId = typeof body?.publicId === 'string' ? body.publicId : '';
	if (!avatarBelongsTo(publicId, locals.user.id)) error(400, 'invalid_public_id');
	const picture = avatarUrl(publicId);
	await connectDb();
	await User.updateOne({ _id: locals.user.id }, { $set: { picture, pictureCustom: true } });
	return json({ picture });
};
