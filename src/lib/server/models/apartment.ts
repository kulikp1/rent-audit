import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const apartmentStatuses = ['free', 'rented'] as const;

const rentChangeSchema = new Schema(
	{
		amount: { type: Number, required: true },
		effectiveFrom: { type: Date, required: true },
		leaseId: { type: Schema.Types.ObjectId },
		notifiedAt: { type: Date },
		ackedAt: { type: Date }
	},
	{ _id: false }
);

const apartmentSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		name: { type: String, required: true, trim: true },
		address: { type: String, default: '', trim: true },
		rentAmount: { type: Number, required: true, min: 0 },
		residents: { type: Number, default: 1, min: 1, max: 20 },
		status: { type: String, enum: apartmentStatuses, default: 'free' },
		rentHistory: { type: [rentChangeSchema], default: [] }
	},
	{ timestamps: true }
);

export type ApartmentDoc = InferSchemaType<typeof apartmentSchema> & {
	_id: mongoose.Types.ObjectId;
};

export const Apartment =
	(mongoose.models.Apartment as mongoose.Model<ApartmentDoc>) ||
	mongoose.model<ApartmentDoc>('Apartment', apartmentSchema);
