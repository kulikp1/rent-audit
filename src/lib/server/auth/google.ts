import { createRemoteJWKSet, jwtVerify } from 'jose';
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PUBLIC_APP_URL } from '$app/env/private';
import { pkceChallenge } from './tokens';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export type GoogleProfile = {
	googleId: string;
	email: string;
	name: string;
	picture: string;
};

export function redirectUri(): string {
	return new URL('/auth/callback', PUBLIC_APP_URL).toString();
}

export function buildAuthUrl(state: string, verifier: string): string {
	const url = new URL(AUTH_URL);
	url.search = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri(),
		response_type: 'code',
		scope: 'openid email profile',
		state,
		code_challenge: pkceChallenge(verifier),
		code_challenge_method: 'S256',
		prompt: 'select_account'
	}).toString();
	return url.toString();
}

export async function exchangeCode(code: string, verifier: string): Promise<GoogleProfile> {
	const response = await fetch(TOKEN_URL, {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			code,
			client_id: GOOGLE_CLIENT_ID,
			client_secret: GOOGLE_CLIENT_SECRET,
			redirect_uri: redirectUri(),
			grant_type: 'authorization_code',
			code_verifier: verifier
		})
	});
	if (!response.ok) throw new Error('google_token_exchange_failed');
	const { id_token: idToken } = (await response.json()) as { id_token?: string };
	if (!idToken) throw new Error('google_missing_id_token');
	const { payload } = await jwtVerify(idToken, jwks, {
		issuer: ['https://accounts.google.com', 'accounts.google.com'],
		audience: GOOGLE_CLIENT_ID
	});
	if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) {
		throw new Error('google_email_unverified');
	}
	return {
		googleId: payload.sub,
		email: payload.email.toLowerCase(),
		name: typeof payload.name === 'string' ? payload.name : payload.email,
		picture: typeof payload.picture === 'string' ? payload.picture : ''
	};
}
