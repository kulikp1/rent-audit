import { SignJWT, jwtVerify } from 'jose';
import { JWT_ACCESS_SECRET } from '$app/env/private';
import { z } from 'zod';

const AUDIENCE = 'recognition';
const key = () => new TextEncoder().encode(JWT_ACCESS_SECRET);

const payloadSchema = z.object({
	meterId: z.string(),
	leaseId: z.string(),
	publicId: z.string(),
	meterType: z.enum(['water', 'gas', 'electricity', 'unknown']),
	serial: z.string().nullable(),
	numbers: z.array(z.number()),
	legible: z.boolean(),
	confidence: z.number()
});

export type RecognitionClaims = z.infer<typeof payloadSchema>;

export async function signRecognition(claims: RecognitionClaims): Promise<string> {
	return new SignJWT({ ...claims })
		.setProtectedHeader({ alg: 'HS256' })
		.setAudience(AUDIENCE)
		.setIssuedAt()
		.setExpirationTime('2h')
		.sign(key());
}

export async function verifyRecognition(token: string): Promise<RecognitionClaims | null> {
	try {
		const { payload } = await jwtVerify(token, key(), {
			audience: AUDIENCE,
			algorithms: ['HS256']
		});
		const parsed = payloadSchema.safeParse(payload);
		return parsed.success ? parsed.data : null;
	} catch {
		return null;
	}
}
