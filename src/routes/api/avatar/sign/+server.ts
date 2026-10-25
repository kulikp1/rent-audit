import { error, json } from '@sveltejs/kit';
import { cloudinaryConfigured, signAvatarUpload } from '#lib/server/cloudinary.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals }) => {
	if (!locals.user) error(401);
	if (!cloudinaryConfigured()) error(503, 'storage_unavailable');
	return json(signAvatarUpload(locals.user.id));
};
