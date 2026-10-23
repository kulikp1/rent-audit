import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { CRON_SECRET } from '$app/env/private';
import { dev } from '$app/env';
import { connectDb } from './db';
import { createRentInvoice, issueInvoice } from './billing/invoices';
import { Invoice } from './models/invoice';
import { Lease } from './models/lease';
import { User } from './models/user';
import { notify } from './notifications';
import { repo } from './repo';
import { currentPeriod } from '../utils/format';

export function authorizeCron(request: Request): void {
	if (!CRON_SECRET) error(503, 'cron_not_configured');
	const header = request.headers.get('authorization') ?? '';
	const expected = Buffer.from(`Bearer ${CRON_SECRET}`);
	const actual = Buffer.from(header);
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) error(401);
}

export function cronNow(url: URL): Date {
	const override = dev ? url.searchParams.get('now') : null;
	const parsed = override ? new Date(override) : null;
	return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

export function isScheduledDay(day: number, now: Date): boolean {
	return now.getDate() === day;
}

export async function runRentInvoices(now: Date) {
	await connectDb();
	const realtors = await User.find({ role: 'realtor' }).select('realtorProfile').lean();
	const period = currentPeriod(now);
	const summary = { created: 0, issued: 0, skipped: 0 };
	for (const realtor of realtors) {
		if (!isScheduledDay(realtor.realtorProfile?.rentDay ?? 1, now)) continue;
		const scope = await repo(realtor._id);
		const leases = await scope.leases.find({ endedAt: null });
		for (const lease of leases) {
			const apartment = await scope.apartments.findById(lease.apartmentId);
			if (!apartment) continue;
			const result = await createRentInvoice(scope, apartment, lease, period);
			if (!result.ok) {
				summary.skipped += 1;
				continue;
			}
			summary.created += 1;
			const issued = await issueInvoice(result.invoice, scope.realtorId);
			if (issued.ok) {
				summary.issued += 1;
				await notify(lease.tenantId, 'invoice_issued', {
					invoiceId: String(result.invoice._id),
					number: result.invoice.number,
					total: result.invoice.total
				});
			}
		}
	}
	return summary;
}

export async function runReminders(now: Date) {
	await connectDb();
	const realtors = await User.find({ role: 'realtor' }).select('realtorProfile').lean();
	const period = currentPeriod(now);
	let notified = 0;
	for (const realtor of realtors) {
		if (!isScheduledDay(realtor.realtorProfile?.readingsDay ?? 1, now)) continue;
		const scope = await repo(realtor._id);
		const leases = await scope.leases.find({ endedAt: null });
		for (const lease of leases) {
			const meters = await scope.meters.find({ apartmentId: lease.apartmentId, active: true });
			if (meters.length === 0) continue;
			const submitted = await scope.readings.count({
				leaseId: lease._id,
				period,
				status: { $ne: 'rejected' }
			});
			if (submitted >= meters.length) continue;
			const created = await notify(
				lease.tenantId,
				'readings_reminder',
				{ period },
				`reminder:${lease._id}:${period}`
			);
			if (created) notified += 1;
		}
	}
	return { notified };
}

export async function runOverdue(now: Date) {
	await connectDb();
	const invoices = await Invoice.find({ status: 'issued', dueDate: { $lt: now } });
	let marked = 0;
	for (const invoice of invoices) {
		invoice.status = 'overdue';
		await invoice.save();
		marked += 1;
		const lease = await Lease.findById(invoice.leaseId).lean();
		const payload = { invoiceId: String(invoice._id), number: invoice.number };
		await notify(invoice.realtorId, 'invoice_overdue', payload, `overdue:${invoice._id}:realtor`);
		if (lease)
			await notify(lease.tenantId, 'invoice_overdue', payload, `overdue:${invoice._id}:tenant`);
	}
	return { marked };
}
