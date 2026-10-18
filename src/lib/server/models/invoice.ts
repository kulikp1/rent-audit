import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const invoiceTypes = ['rent', 'utilities'] as const;
export const invoiceStatuses = ['draft', 'issued', 'paid', 'overdue', 'cancelled'] as const;
export type InvoiceStatus = (typeof invoiceStatuses)[number];

const lineSchema = new Schema({
	kind: { type: String, enum: ['rent', 'utility', 'manual'], required: true },
	service: { type: String, enum: ['electricity', 'gas', 'water'] },
	serial: { type: String, default: '' },
	zone: { type: String, enum: ['single', 'day', 'night'] },
	description: { type: String, default: '' },
	quantity: { type: Number, required: true },
	unit: { type: String, enum: ['kwh', 'm3', 'month', 'pcs'], required: true },
	price: { type: Number, required: true },
	sum: { type: Number, required: true }
});

const payoutSchema = new Schema(
	{
		iban: { type: String, default: '' },
		fullName: { type: String, default: '' },
		taxId: { type: String, default: '' }
	},
	{ _id: false }
);

const invoiceSchema = new Schema(
	{
		realtorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		apartmentId: { type: Schema.Types.ObjectId, ref: 'Apartment', required: true, index: true },
		leaseId: { type: Schema.Types.ObjectId, ref: 'Lease', required: true, index: true },
		type: { type: String, enum: invoiceTypes, required: true },
		period: { type: String, required: true },
		number: { type: String, required: true },
		lines: { type: [lineSchema], default: [] },
		total: { type: Number, required: true, default: 0 },
		status: { type: String, enum: invoiceStatuses, default: 'draft', index: true },
		issuedAt: { type: Date },
		dueDate: { type: Date },
		paidAt: { type: Date },
		tenantPaidAt: { type: Date },
		cancelledAt: { type: Date },
		cancelledReason: { type: String, default: '' },
		replacesId: { type: Schema.Types.ObjectId },
		replacedById: { type: Schema.Types.ObjectId },
		payout: { type: payoutSchema }
	},
	{ timestamps: true }
);

export type InvoiceDoc = InferSchemaType<typeof invoiceSchema> & { _id: mongoose.Types.ObjectId };

export const Invoice =
	(mongoose.models.Invoice as mongoose.Model<InvoiceDoc>) ||
	mongoose.model<InvoiceDoc>('Invoice', invoiceSchema);

const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });

export const Counter =
	(mongoose.models.Counter as mongoose.Model<{ _id: string; seq: number }>) ||
	mongoose.model<{ _id: string; seq: number }>('Counter', counterSchema);
