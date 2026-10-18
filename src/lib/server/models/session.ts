import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const sessionSchema = new Schema({
	userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
	family: { type: String, required: true },
	tokenHash: { type: String, required: true, unique: true },
	expiresAt: { type: Date, required: true },
	usedAt: { type: Date }
});

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type SessionDoc = InferSchemaType<typeof sessionSchema>;

export const Session =
	(mongoose.models.Session as mongoose.Model<SessionDoc>) ||
	mongoose.model<SessionDoc>('Session', sessionSchema);
