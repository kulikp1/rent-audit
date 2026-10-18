import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null };
	await connectDb();
	const doc = await User.findById(locals.user.id).lean();
	if (!doc) return { user: null };
	return {
		user: {
			id: String(doc._id),
			name: doc.name,
			email: doc.email,
			picture: doc.picture,
			role: doc.role
		}
	};
};
