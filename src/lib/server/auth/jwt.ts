import { SignJWT, jwtVerify } from 'jose';
import { JWT_ACCESS_SECRET } from '$app/env/private';
import type { Role } from '../models/user';

export const ACCESS_TTL_SECONDS = 15 * 60;

export type AccessClaims = { userId: string; role: Role };

const encode = (secret: string) => new TextEncoder().encode(secret);

export async function signAccessToken(claims: AccessClaims): Promise<string> {
	return new SignJWT({ role: claims.role })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(claims.userId)
		.setIssuedAt()
		.setExpirationTime(`${ACCESS_TTL_SECONDS}s`)
		.sign(encode(JWT_ACCESS_SECRET));
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
	try {
		const { payload } = await jwtVerify(token, encode(JWT_ACCESS_SECRET), {
			algorithms: ['HS256']
		});
		if (!payload.sub || typeof payload.role !== 'string') return null;
		return { userId: payload.sub, role: payload.role as Role };
	} catch {
		return null;
	}
}
