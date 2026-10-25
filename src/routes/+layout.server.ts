import { redirect } from '@sveltejs/kit';
import { endSession } from '#lib/server/auth/session.js';
import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) return { user: null };
	await connectDb();
	const doc = await User.findById(locals.user.id).lean();
	if (!doc) {
		await endSession(cookies);
		redirect(302, '/login');
	}
	return {
		user: {
			id: String(doc._id),
			name: doc.name,
			email: doc.email,
			picture: doc.picture,
			avatarColor: doc.avatarColor ?? 'blue',
			role: doc.role
		}
	};
};
