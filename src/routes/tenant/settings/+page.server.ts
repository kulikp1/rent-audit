import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { avatarColorKeys } from '#lib/avatar-colors.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { cloudinaryConfigured } from '#lib/server/cloudinary.js';
import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import type { Actions, PageServerLoad } from './$types';

const profileSchema = z.object({ avatarColor: z.enum(avatarColorKeys) });

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const user = requireRole(locals, 'tenant');
	await connectDb();
	const doc = await User.findById(user.id).select('name picture avatarColor').lean();
	const themeCookie = cookies.get('ra_theme');
	const themePreference: 'light' | 'dark' | 'system' =
		themeCookie === 'light' || themeCookie === 'system' ? themeCookie : 'dark';
	return {
		themePreference,
		avatarUploadEnabled: cloudinaryConfigured(),
		name: doc?.name ?? '',
		picture: doc?.picture ?? '',
		avatarColor: doc?.avatarColor ?? 'blue'
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals, 'tenant');
		const parsed = profileSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: {} });
		await connectDb();
		await User.updateOne({ _id: user.id }, { $set: { avatarColor: parsed.data.avatarColor } });
		return { success: true, errors: {} };
	}
};
