import { error } from '@sveltejs/kit';
import mongoose, { Types, type Model, type QueryFilter } from 'mongoose';
import { connectDb } from './db';
import { Apartment, type ApartmentDoc } from './models/apartment';
import { Invite, type InviteDoc } from './models/invite';
import { Invoice, type InvoiceDoc } from './models/invoice';
import { Lease, type LeaseDoc } from './models/lease';
import { Meter, type MeterDoc } from './models/meter';
import { Reading, type ReadingDoc } from './models/reading';

export function parseId(value: string): Types.ObjectId {
	if (!Types.ObjectId.isValid(value)) error(404);
	return new Types.ObjectId(value);
}

function scoped<T>(model: Model<T>, realtorId: Types.ObjectId) {
	const withScope = (filter: QueryFilter<T> = {}) => ({ ...filter, realtorId }) as QueryFilter<T>;
	return {
		find: (filter?: QueryFilter<T>) => model.find(withScope(filter)),
		findOne: (filter?: QueryFilter<T>) => model.findOne(withScope(filter)),
		findById: (id: Types.ObjectId | string) =>
			model.findOne(withScope({ _id: id } as QueryFilter<T>)),
		count: (filter?: QueryFilter<T>) => model.countDocuments(withScope(filter)),
		create: (data: { [K in keyof T]?: unknown }) =>
			model.create({ ...data, realtorId } as unknown as T),
		updateOne: (filter: QueryFilter<T>, update: mongoose.UpdateQuery<T>) =>
			model.updateOne(withScope(filter), update),
		deleteOne: (filter: QueryFilter<T>) => model.deleteOne(withScope(filter)),
		deleteMany: (filter: QueryFilter<T>) => model.deleteMany(withScope(filter))
	};
}

export async function repo(realtorId: string | Types.ObjectId) {
	await connectDb();
	const id = typeof realtorId === 'string' ? new Types.ObjectId(realtorId) : realtorId;
	return {
		realtorId: id,
		apartments: scoped<ApartmentDoc>(Apartment, id),
		meters: scoped<MeterDoc>(Meter, id),
		invites: scoped<InviteDoc>(Invite, id),
		invoices: scoped<InvoiceDoc>(Invoice, id),
		leases: scoped<LeaseDoc>(Lease, id),
		readings: scoped<ReadingDoc>(Reading, id)
	};
}

export type Repo = Awaited<ReturnType<typeof repo>>;
