import { error, redirect } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { cloudinaryConfigured, privateDownloadUrl } from '#lib/server/cloudinary.js';
import { connectDb } from '#lib/server/db.js';
import { Lease } from '#lib/server/models/lease.js';
import { Reading } from '#lib/server/models/reading.js';
import { parseId } from '#lib/server/repo.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
	if (!locals.user) error(401);
	await connectDb();
	const reading = await Reading.findById(parseId(params.id)).lean();
	if (!reading || !reading.photoPublicId) error(404);

	let allowed = false;
	if (locals.user.role === 'realtor') {
		allowed = String(reading.realtorId) === locals.user.id;
	} else if (locals.user.role === 'tenant') {
		allowed = !!(await Lease.exists({
			_id: reading.leaseId,
			tenantId: new Types.ObjectId(locals.user.id)
		}));
	}
	if (!allowed) error(404);
	if (!cloudinaryConfigured()) error(503);

	redirect(302, privateDownloadUrl(reading.photoPublicId), { external: true });
};
