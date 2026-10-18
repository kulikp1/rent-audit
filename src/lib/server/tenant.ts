import { error } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { invoiceViews } from './billing/invoices';
import { connectDb } from './db';
import { Lease } from './models/lease';
import { repo } from './repo';

export async function tenantContext(userId: string) {
	await connectDb();
	const lease = await Lease.findOne({ tenantId: new Types.ObjectId(userId), endedAt: null });
	if (!lease) return null;
	const scope = await repo(lease.realtorId);
	const apartment = await scope.apartments.findById(lease.apartmentId);
	if (!apartment) return null;
	return { lease, apartment, scope };
}

export async function requireTenantContext(userId: string) {
	const context = await tenantContext(userId);
	if (!context) error(404);
	return context;
}

export async function tenantInvoices(userId: string) {
	await connectDb();
	const leases = await Lease.find({ tenantId: new Types.ObjectId(userId) }).lean();
	if (leases.length === 0) return [];
	const byRealtor = new Map<string, typeof leases>();
	for (const lease of leases) {
		const key = String(lease.realtorId);
		byRealtor.set(key, [...(byRealtor.get(key) ?? []), lease]);
	}
	const views = [];
	for (const [realtorId, realtorLeases] of byRealtor) {
		const scope = await repo(realtorId);
		const invoices = await scope.invoices
			.find({ leaseId: { $in: realtorLeases.map((lease) => lease._id) }, status: { $ne: 'draft' } })
			.sort({ createdAt: -1 })
			.lean();
		views.push(...(await invoiceViews(scope, invoices)));
	}
	return views.sort((a, b) => b.number.localeCompare(a.number));
}
