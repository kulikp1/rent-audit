import { fail } from '@sveltejs/kit';
import { fieldErrors } from '#lib/schemas/errors.js';
import { settingsSchema } from '#lib/schemas/settings.js';
import { requireRole } from '#lib/server/auth/guards.js';
import { connectDb } from '#lib/server/db.js';
import { User } from '#lib/server/models/user.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'realtor');
	await connectDb();
	const doc = await User.findById(user.id).select('name email realtorProfile').lean();
	const profile = doc?.realtorProfile;
	return {
		name: doc?.name ?? '',
		email: doc?.email ?? '',
		profile: {
			fullName: profile?.fullName ?? '',
			iban: profile?.iban ?? '',
			taxId: profile?.taxId ?? '',
			readingsDay: profile?.readingsDay ?? 1,
			rentDay: profile?.rentDay ?? 1
		}
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const user = requireRole(locals, 'realtor');
		const values = Object.fromEntries(await request.formData());
		const parsed = settingsSchema.safeParse(values);
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error), values });
		await connectDb();
		await User.updateOne({ _id: user.id }, { $set: { realtorProfile: parsed.data } });
		return { success: true, errors: {} };
	}
};
