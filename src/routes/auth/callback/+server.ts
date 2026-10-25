import { redirect } from '@sveltejs/kit';
import { ADMIN_EMAIL } from '$app/env/private';
import { exchangeCode } from '#lib/server/auth/google.js';
import { homeFor } from '#lib/server/auth/home.js';
import { startSession } from '#lib/server/auth/session.js';
import { connectDb } from '#lib/server/db.js';
import { acceptInvite, findInvite } from '#lib/server/invites.js';
import { User, type Role } from '#lib/server/models/user.js';
import type { RequestHandler } from './$types';

function fail(code: string): never {
	redirect(302, `/login?error=${code}`);
}

export const GET: RequestHandler = async ({ cookies, url }) => {
	if (url.searchParams.get('error')) fail('cancelled');

	const stored = cookies.get('ra_oauth');
	cookies.delete('ra_oauth', { path: '/auth' });
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	if (!stored || !code || !state) fail('invalid');

	let verifier: string;
	try {
		const parsed = JSON.parse(stored) as { state: string; verifier: string };
		if (parsed.state !== state) fail('invalid');
		verifier = parsed.verifier;
	} catch {
		fail('invalid');
	}

	let profile;
	try {
		profile = await exchangeCode(code, verifier);
	} catch {
		fail('google');
	}

	await connectDb();
	const inviteToken = cookies.get('ra_invite');
	cookies.delete('ra_invite', { path: '/' });

	if (inviteToken) {
		const found = await findInvite(inviteToken);
		if (found.error) fail(`invite_${found.error}`);
	}

	const adminEmail = ADMIN_EMAIL.trim().toLowerCase();
	const isAdmin = adminEmail !== '' && profile.email === adminEmail;

	let user = await User.findOne({ googleId: profile.googleId });
	if (user) {
		user.name = profile.name;
		if (!user.pictureCustom) user.picture = profile.picture;
		user.email = profile.email;
		if (isAdmin) user.role = 'admin';
		await user.save();
	} else {
		const role: Role = isAdmin ? 'admin' : inviteToken ? 'tenant' : 'realtor';
		user = await User.create({ ...profile, role });
	}

	if (inviteToken) {
		if (user.role !== 'tenant') fail('invite_role');
		const accepted = await acceptInvite(inviteToken, user._id);
		if (!accepted.ok) fail(`invite_${accepted.error}`);
	}

	await startSession(cookies, url.protocol === 'https:', String(user._id), user.role);
	redirect(302, homeFor(user.role));
};
