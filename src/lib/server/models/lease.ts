import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const meterReadingSchema = new Schema(
	{
		meterId: { type: Schema.Types.ObjectId, ref: 'Meter', required: true },
		values: { type: [Number], default: [] }
	},
	{ _id: false }
);

const leaseSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true, index: true },
		tenantId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		startedAt: { type: Date, required: true },
		endedAt: { type: Date },
		moveInReadings: { type: [meterReadingSchema], default: [] },
		moveOutReadings: { type: [meterReadingSchema], default: [] }
	},
	{ timestamps: true }
);

export type LeaseDoc = InferSchemaType<typeof leaseSchema> & { _id: mongoose.Types.ObjectId };

export const Lease =
	(mongoose.models.Lease as mongoose.Model<LeaseDoc>) ||
	mongoose.model<LeaseDoc>('Lease', leaseSchema);
