import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { avatarColorKeys } from '#lib/avatar-colors.js';

export const roles = ['realtor', 'tenant', 'admin'] as const;
export type Role = (typeof roles)[number];

const realtorProfileSchema = new Schema(
	{
		iban: { type: String, default: '' },
		fullName: { type: String, default: '' },
		taxId: { type: String, default: '' },
		readingsDay: { type: Number, default: 1 },
		rentDay: { type: Number, default: 1 }
	},
	{ _id: false }
);

const userSchema = new Schema(
	{
		googleId: { type: String, required: true, unique: true },
		email: { type: String, required: true, lowercase: true, index: true },
		name: { type: String, required: true },
		picture: { type: String, default: '' },
		pictureCustom: { type: Boolean, default: false },
		avatarColor: { type: String, enum: avatarColorKeys, default: 'blue' },
		role: { type: String, enum: roles, required: true },
		locale: { type: String, enum: ['uk', 'en'], default: 'uk' },
		realtorProfile: { type: realtorProfileSchema, default: () => ({}) }
	},
	{ timestamps: true }
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: mongoose.Types.ObjectId };

export const User =
	(mongoose.models.User as mongoose.Model<UserDoc>) || mongoose.model<UserDoc>('User', userSchema);
