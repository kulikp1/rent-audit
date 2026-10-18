import { error, json } from '@sveltejs/kit';
import { requireRole } from '#lib/server/auth/guards.js';
import { cloudinaryConfigured, signUpload } from '#lib/server/cloudinary.js';
import { requireTenantContext } from '#lib/server/tenant.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	const { apartment } = await requireTenantContext(user.id);
	if (!cloudinaryConfigured()) error(503, 'storage_unavailable');
	return json(signUpload(String(apartment._id)));
};
