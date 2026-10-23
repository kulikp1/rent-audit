import { requireRole } from '#lib/server/auth/guards.js';
import { connectDb } from '#lib/server/db.js';
import { Apartment } from '#lib/server/models/apartment.js';
import { User } from '#lib/server/models/user.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'admin');
	await connectDb();
	const [users, counts] = await Promise.all([
		User.find().sort({ createdAt: -1 }).lean(),
		Apartment.aggregate<{ _id: unknown; count: number }>([
			{ $group: { _id: '$realtorId', count: { $sum: 1 } } }
		])
	]);
	const apartments = new Map(counts.map((row) => [String(row._id), row.count]));
	return {
		users: users.map((user) => ({
			id: String(user._id),
			name: user.name,
			email: user.email,
			picture: user.picture,
			role: user.role,
			apartments: user.role === 'realtor' ? (apartments.get(String(user._id)) ?? 0) : null,
			createdAt: user.createdAt.toISOString()
		}))
	};
};
