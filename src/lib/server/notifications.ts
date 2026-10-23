import { Types } from 'mongoose';
import { connectDb } from './db';
import { Notification, type NotificationType } from './models/notification';

export type NotificationView = {
	id: string;
	type: NotificationType;
	payload: Record<string, string | number>;
	createdAt: string;
	read: boolean;
};

export async function notify(
	userId: Types.ObjectId | string,
	type: NotificationType,
	payload: Record<string, string | number> = {},
	dedupeKey?: string
): Promise<boolean> {
	await connectDb();
	try {
		await Notification.create({
			userId: new Types.ObjectId(String(userId)),
			type,
			payload,
			dedupeKey
		});
		return true;
	} catch (error) {
		if ((error as { code?: number }).code !== 11000) throw error;
		return false;
	}
}

export async function notificationSummary(userId: string, limit = 8) {
	await connectDb();
	const id = new Types.ObjectId(userId);
	const [unread, recent] = await Promise.all([
		Notification.countDocuments({ userId: id, readAt: null }),
		Notification.find({ userId: id }).sort({ createdAt: -1 }).limit(limit).lean()
	]);
	return { unread, recent: recent.map(toView) };
}

export async function notificationList(userId: string, limit = 100): Promise<NotificationView[]> {
	await connectDb();
	const rows = await Notification.find({ userId: new Types.ObjectId(userId) })
		.sort({ createdAt: -1 })
		.limit(limit)
		.lean();
	return rows.map(toView);
}

export async function markRead(userId: string, id?: string): Promise<void> {
	await connectDb();
	const filter: Record<string, unknown> = { userId: new Types.ObjectId(userId), readAt: null };
	if (id) {
		if (!Types.ObjectId.isValid(id)) return;
		filter._id = new Types.ObjectId(id);
	}
	await Notification.updateMany(filter, { readAt: new Date() });
}

function toView(row: {
	_id: Types.ObjectId;
	type: NotificationType;
	payload?: unknown;
	createdAt: Date;
	readAt?: Date | null;
}): NotificationView {
	return {
		id: String(row._id),
		type: row.type,
		payload: (row.payload ?? {}) as Record<string, string | number>,
		createdAt: row.createdAt.toISOString(),
		read: !!row.readAt
	};
}
