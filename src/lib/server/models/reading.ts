import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const readingSources = ['manual', 'gemini'] as const;
export const readingStatuses = ['confirmed', 'needs_confirmation', 'rejected'] as const;

const historySchema = new Schema(
	{
		values: { type: [Number], required: true },
		label: { type: String, enum: ['recognized', 'tenant', 'realtor', 'manual'], required: true },
		reason: { type: String, default: '' },
		at: { type: Date, default: () => new Date() }
	},
	{ _id: false }
);

const readingSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true, index: true },
		meterId: { type: Schema.Types.ObjectId, ref: 'Meter', required: true, index: true },
		leaseId: { type: Schema.Types.ObjectId, ref: 'Lease', required: true },
		period: { type: String, required: true },
		values: { type: [Number], required: true },
		source: { type: String, enum: readingSources, default: 'manual' },
		status: { type: String, enum: readingStatuses, default: 'confirmed' },
		flags: { type: [String], default: [] },
		photoPublicId: { type: String, default: '' },
		rejectReason: { type: String, default: '' },
		confirmedAt: { type: Date },
		history: { type: [historySchema], default: [] }
	},
	{ timestamps: true }
);

readingSchema.index({ meterId: 1, period: 1 }, { unique: true });

export type ReadingDoc = InferSchemaType<typeof readingSchema> & { _id: mongoose.Types.ObjectId };

export const Reading =
	(mongoose.models.Reading as mongoose.Model<ReadingDoc>) ||
	mongoose.model<ReadingDoc>('Reading', readingSchema);
