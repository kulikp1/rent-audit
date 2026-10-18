import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const inviteSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true, index: true },
		tokenHash: { type: String, required: true, unique: true },
		expiresAt: { type: Date, required: true },
		usedAt: { type: Date },
		revokedAt: { type: Date }
	},
	{ timestamps: true }
);

export type InviteDoc = InferSchemaType<typeof inviteSchema> & { _id: mongoose.Types.ObjectId };

export const Invite =
	(mongoose.models.Invite as mongoose.Model<InviteDoc>) ||
	mongoose.model<InviteDoc>('Invite', inviteSchema);
