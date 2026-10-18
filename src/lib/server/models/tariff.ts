import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const tariffServices = ['electricity', 'gas', 'water'] as const;
export type TariffService = (typeof tariffServices)[number];

const tariffSchema = new Schema(
	{
		scope: { type: String, enum: ['national', 'local'], required: true, index: true },
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
		service: { type: String, enum: tariffServices, required: true },
		price: { type: Number, required: true, min: 0 },
		nightPrice: { type: Number, min: 0 },
		effectiveFrom: { type: Date, required: true }
	},
	{ timestamps: true }
);

export type TariffDoc = InferSchemaType<typeof tariffSchema> & { _id: mongoose.Types.ObjectId };

export const Tariff =
	(mongoose.models.Tariff as mongoose.Model<TariffDoc>) ||
	mongoose.model<TariffDoc>('Tariff', tariffSchema);
