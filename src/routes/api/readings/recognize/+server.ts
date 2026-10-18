import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '#lib/server/auth/guards.js';
import {
	cloudinaryConfigured,
	fetchPrivateImage,
	publicIdBelongsTo
} from '#lib/server/cloudinary.js';
import { geminiConfigured, recognizeMeter } from '#lib/server/gemini.js';
import { signRecognition } from '#lib/server/recognition-token.js';
import { parseId } from '#lib/server/repo.js';
import { requireTenantContext } from '#lib/server/tenant.js';
import { previousFor } from '#lib/server/readings.js';
import { checkReading, type MeterKind } from '#lib/server/validation/reading.js';
import type { RequestHandler } from './$types';

const bodySchema = z.object({ meterId: z.string(), publicId: z.string().min(1).max(300) });

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = requireRole(locals, 'tenant');
	const { lease, apartment, scope } = await requireTenantContext(user.id);

	const body = bodySchema.safeParse(await request.json().catch(() => null));
	if (!body.success) error(400, 'bad_request');
	if (!cloudinaryConfigured() || !geminiConfigured()) error(503, 'ai_unavailable');
	if (!publicIdBelongsTo(body.data.publicId, String(apartment._id))) error(403);

	const meter = await scope.meters.findOne({
		_id: parseId(body.data.meterId),
		apartmentId: apartment._id,
		active: true
	});
	if (!meter) error(404);

	let recognition;
	try {
		recognition = await recognizeMeter(await fetchPrivateImage(body.data.publicId));
	} catch {
		error(503, 'ai_unavailable');
	}

	const token = await signRecognition({
		meterId: String(meter._id),
		leaseId: String(lease._id),
		publicId: body.data.publicId,
		meterType: recognition.meterType,
		serial: recognition.serial,
		numbers: recognition.numbers,
		legible: recognition.legible,
		confidence: recognition.confidence
	});

	const { previous, history } = await previousFor(scope, meter);
	const preview = checkReading({
		meterType: meter.type as MeterKind,
		digits: meter.digits,
		serial: meter.serial,
		values: recognition.numbers.length > 0 ? recognition.numbers : previous,
		previous,
		history,
		recognized: {
			meterType: recognition.meterType,
			serial: recognition.serial,
			legible: recognition.legible,
			confidence: recognition.confidence
		}
	});

	return json({
		token,
		numbers: recognition.numbers,
		serial: recognition.serial,
		meterType: recognition.meterType,
		legible: recognition.legible,
		flags: preview.flags
	});
};
