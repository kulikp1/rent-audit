import type { Cookies } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { connectDb } from '../db';
import { Session } from '../models/session';
import { User, type Role } from '../models/user';
import { ACCESS_TTL_SECONDS, signAccessToken, verifyAccessToken, type AccessClaims } from './jwt';
import { randomToken, sha256 } from './tokens';

export const ACCESS_COOKIE = 'ra_access';
export const REFRESH_COOKIE = 'ra_refresh';
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

function cookieOptions(secure: boolean, maxAge: number) {
	return { path: '/', httpOnly: true, secure, sameSite: 'lax' as const, maxAge };
}

async function issueTokens(
	cookies: Cookies,
	secure: boolean,
	userId: string,
	role: Role,
	family: string
) {
	const refresh = randomToken();
	await Session.create({
		userId: new Types.ObjectId(userId),
		family,
		tokenHash: sha256(refresh),
		expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000)
	});
	cookies.set(
		ACCESS_COOKIE,
		await signAccessToken({ userId, role }),
		cookieOptions(secure, ACCESS_TTL_SECONDS)
	);
	cookies.set(REFRESH_COOKIE, refresh, cookieOptions(secure, REFRESH_TTL_SECONDS));
}

export async function startSession(cookies: Cookies, secure: boolean, userId: string, role: Role) {
	await connectDb();
	await issueTokens(cookies, secure, userId, role, randomToken(12));
}

export async function endSession(cookies: Cookies) {
	const refresh = cookies.get(REFRESH_COOKIE);
	if (refresh) {
		await connectDb();
		await Session.deleteOne({ tokenHash: sha256(refresh) });
	}
	cookies.delete(ACCESS_COOKIE, { path: '/' });
	cookies.delete(REFRESH_COOKIE, { path: '/' });
}

async function rotate(
	cookies: Cookies,
	secure: boolean,
	refresh: string
): Promise<AccessClaims | null> {
	await connectDb();
	const session = await Session.findOne({ tokenHash: sha256(refresh) });
	if (!session || session.expiresAt.getTime() < Date.now()) return null;
	if (session.usedAt) {
		await Session.deleteMany({ userId: session.userId });
		return null;
	}
	const user = await User.findById(session.userId).select('role');
	if (!user) return null;
	session.usedAt = new Date();
	await session.save();
	const userId = String(user._id);
	await issueTokens(cookies, secure, userId, user.role, session.family);
	return { userId, role: user.role };
}

export async function resolveSession(
	cookies: Cookies,
	secure: boolean
): Promise<AccessClaims | null> {
	const access = cookies.get(ACCESS_COOKIE);
	if (access) {
		const claims = await verifyAccessToken(access);
		if (claims) return claims;
	}
	const refresh = cookies.get(REFRESH_COOKIE);
	if (!refresh) return null;
	const claims = await rotate(cookies, secure, refresh);
	if (!claims) {
		cookies.delete(ACCESS_COOKIE, { path: '/' });
		cookies.delete(REFRESH_COOKIE, { path: '/' });
	}
	return claims;
}
