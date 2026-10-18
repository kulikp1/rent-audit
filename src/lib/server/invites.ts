import { Types } from 'mongoose';
import { connectDb } from './db';
import { Apartment, type ApartmentDoc } from './models/apartment';
import { Invite, type InviteDoc } from './models/invite';
import { Lease } from './models/lease';
import { Meter } from './models/meter';
import { Reading } from './models/reading';
import { randomToken, sha256 } from './auth/tokens';

export const INVITE_TTL_DAYS = 7;

export type InviteError = 'invalid' | 'expired' | 'used' | 'taken' | 'has_lease';

export async function createInvite(realtorId: Types.ObjectId, apartmentId: Types.ObjectId) {
	await connectDb();
	await Invite.updateMany(
		{ realtorId, apartmentId, usedAt: null, revokedAt: null },
		{ revokedAt: new Date() }
	);
	const token = randomToken(32);
	const invite = await Invite.create({
		realtorId,
		apartmentId,
		tokenHash: sha256(token),
		expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)
	});
	return { token, expiresAt: invite.expiresAt };
}

type FoundInvite =
	{ error: InviteError } | { error?: undefined; invite: InviteDoc; apartment: ApartmentDoc };

export async function findInvite(token: string): Promise<FoundInvite> {
	await connectDb();
	const invite = await Invite.findOne({ tokenHash: sha256(token) });
	if (!invite) return { error: 'invalid' };
	if (invite.usedAt || invite.revokedAt) return { error: 'used' };
	if (invite.expiresAt.getTime() < Date.now()) return { error: 'expired' };
	const apartment = await Apartment.findOne({
		_id: invite.apartmentId,
		realtorId: invite.realtorId
	});
	if (!apartment) return { error: 'invalid' };
	const hasTenant = await Lease.exists({ apartmentId: apartment._id, endedAt: null });
	if (hasTenant) return { error: 'taken' };
	return { invite, apartment };
}

export async function latestValues(meterId: Types.ObjectId, fallback: number[]): Promise<number[]> {
	const last = await Reading.findOne({ meterId, status: 'confirmed' }).sort({ period: -1 });
	return last ? [...last.values] : [...fallback];
}

export async function acceptInvite(
	token: string,
	tenantId: Types.ObjectId
): Promise<{ ok: true } | { ok: false; error: InviteError }> {
	const found = await findInvite(token);
	if (found.error) return { ok: false, error: found.error };
	const { invite, apartment } = found;
	if (await Lease.exists({ tenantId, endedAt: null })) return { ok: false, error: 'has_lease' };

	const claimed = await Invite.updateOne(
		{ _id: invite._id, usedAt: null, revokedAt: null },
		{ usedAt: new Date() }
	);
	if (claimed.modifiedCount !== 1) return { ok: false, error: 'used' };

	const meters = await Meter.find({
		apartmentId: apartment._id,
		realtorId: apartment.realtorId,
		active: true
	});
	const moveInReadings = await Promise.all(
		meters.map(async (meter) => ({
			meterId: meter._id,
			values: await latestValues(meter._id, meter.initialReading)
		}))
	);

	await Lease.create({
		realtorId: apartment.realtorId,
		apartmentId: apartment._id,
		tenantId,
		startedAt: new Date(),
		moveInReadings
	});
	await Apartment.updateOne({ _id: apartment._id }, { status: 'rented' });
	return { ok: true };
}
