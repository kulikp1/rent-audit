import mongoose, { Schema, type InferSchemaType } from 'mongoose';

export const notificationTypes = [
	'readings_submitted',
	'reading_pending',
	'anomaly',
	'tenant_paid',
	'invoice_overdue',
	'invoice_issued',
	'payment_confirmed',
	'rent_changed',
	'readings_reminder'
] as const;
export type NotificationType = (typeof notificationTypes)[number];

const notificationSchema = new Schema(
	{
		userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
		type: { type: String, enum: notificationTypes, required: true },
		payload: { type: Schema.Types.Mixed, default: {} },
		dedupeKey: { type: String },
		readAt: { type: Date }
	},
	{ timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index(
	{ userId: 1, dedupeKey: 1 },
	{
		unique: true,
		name: 'user_dedupe_unique',
		partialFilterExpression: { dedupeKey: { $type: 'string' } }
	}
);

export type NotificationDoc = InferSchemaType<typeof notificationSchema> & {
	_id: mongoose.Types.ObjectId;
	createdAt: Date;
};

export const Notification =
	(mongoose.models.Notification as mongoose.Model<NotificationDoc>) ||
	mongoose.model<NotificationDoc>('Notification', notificationSchema);
