import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const meterTypes = ['water', 'gas', 'electricity'] as const;
export type MeterType = (typeof meterTypes)[number];

const meterSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true, index: true },
		type: { type: String, enum: meterTypes, required: true },
		serial: { type: String, required: true, trim: true },
		digits: { type: Number, required: true, min: 3, max: 10 },
		zones: { type: Number, enum: [1, 2], default: 1 },
		initialReading: { type: [Number], default: [] },
		active: { type: Boolean, default: true },
		replacedById: { type: Schema.Types.ObjectId },
		replacesId: { type: Schema.Types.ObjectId },
		replacedAt: { type: Date },
		finalReading: { type: [Number], default: [] }
	},
	{ timestamps: true }
);

export type MeterDoc = InferSchemaType<typeof meterSchema> & { _id: mongoose.Types.ObjectId };

export const Meter =
	(mongoose.models.Meter as mongoose.Model<MeterDoc>) ||
	mongoose.model<MeterDoc>('Meter', meterSchema);
