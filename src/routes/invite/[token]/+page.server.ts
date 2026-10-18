import { fail, redirect } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { homeFor } from '#lib/server/auth/home.js';
import { acceptInvite, findInvite } from '#lib/server/invites.js';
import { User } from '#lib/server/models/user.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const found = await findInvite(params.token);
	if (found.error) return { error: found.error };
	const realtor = await User.findById(found.invite.realtorId).select('name').lean();
	return {
		error: null,
		apartment: { name: found.apartment.name, address: found.apartment.address },
		realtorName: realtor?.name ?? '',
		viewerRole: locals.user?.role ?? null
	};
};

export const actions: Actions = {
	accept: async ({ params, cookies, locals, url }) => {
		if (locals.user) {
			if (locals.user.role !== 'tenant') return fail(400, { error: 'role' });
			const accepted = await acceptInvite(params.token, new Types.ObjectId(locals.user.id));
			if (!accepted.ok) return fail(400, { error: accepted.error });
			redirect(303, homeFor('tenant'));
		}
		cookies.set('ra_invite', params.token, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 3600
		});
		redirect(303, '/auth/google');
	}
};
