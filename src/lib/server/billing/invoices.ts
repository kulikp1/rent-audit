import type { Types } from 'mongoose';
import { Counter, Invoice, type InvoiceDoc } from '../models/invoice';
import type { LeaseDoc } from '../models/lease';
import type { ApartmentDoc } from '../models/apartment';
import type { MeterDoc } from '../models/meter';
import { User } from '../models/user';
import type { Repo } from '../repo';
import {
	buildUtilityLines,
	dueDateFrom,
	effectiveStatus,
	inPeriod,
	periodStart,
	rentAt,
	sumLines,
	type InvoiceLineInput,
	type UtilityItem
} from './calc';
import { priceLookup } from './tariffs';

export type InvoiceLineView = InvoiceLineInput & { id: string };

export type InvoiceView = {
	id: string;
	number: string;
	type: 'rent' | 'utilities';
	period: string;
	status: string;
	storedStatus: string;
	total: number;
	lines: InvoiceLineView[];
	apartmentId: string;
	apartmentName: string;
	tenantName: string;
	issuedAt: string | null;
	dueDate: string | null;
	paidAt: string | null;
	tenantPaidAt: string | null;
	cancelledAt: string | null;
	cancelledReason: string;
	replacesId: string | null;
	replacedById: string | null;
	payout: { iban: string; fullName: string; taxId: string } | null;
};

export async function nextInvoiceNumber(realtorId: Types.ObjectId): Promise<string> {
	const counter = await Counter.findOneAndUpdate(
		{ _id: `invoice:${realtorId}` },
		{ $inc: { seq: 1 } },
		{ upsert: true, returnDocument: 'after' }
	);
	return `INV-${String(counter.seq).padStart(4, '0')}`;
}

export function toInvoiceView(
	invoice: InvoiceDoc,
	names: { apartment: string; tenant: string }
): InvoiceView {
	return {
		id: String(invoice._id),
		number: invoice.number,
		type: invoice.type,
		period: invoice.period,
		status: effectiveStatus(invoice),
		storedStatus: invoice.status,
		total: invoice.total,
		lines: invoice.lines.map((line) => ({
			id: String(line._id),
			kind: line.kind,
			service: line.service ?? undefined,
			serial: line.serial ?? '',
			zone: line.zone ?? undefined,
			description: line.description ?? '',
			quantity: line.quantity,
			unit: line.unit,
			price: line.price,
			sum: line.sum
		})),
		apartmentId: String(invoice.apartmentId),
		apartmentName: names.apartment,
		tenantName: names.tenant,
		issuedAt: invoice.issuedAt?.toISOString() ?? null,
		dueDate: invoice.dueDate?.toISOString() ?? null,
		paidAt: invoice.paidAt?.toISOString() ?? null,
		tenantPaidAt: invoice.tenantPaidAt?.toISOString() ?? null,
		cancelledAt: invoice.cancelledAt?.toISOString() ?? null,
		cancelledReason: invoice.cancelledReason ?? '',
		replacesId: invoice.replacesId ? String(invoice.replacesId) : null,
		replacedById: invoice.replacedById ? String(invoice.replacedById) : null,
		payout: invoice.payout
			? {
					iban: invoice.payout.iban ?? '',
					fullName: invoice.payout.fullName ?? '',
					taxId: invoice.payout.taxId ?? ''
				}
			: null
	};
}

export type CreateError =
	| { code: 'exists' }
	| { code: 'no_meters' }
	| { code: 'readings_missing'; serial: string }
	| { code: 'readings_pending'; serial: string }
	| { code: 'missing_tariff'; service: string }
	| { code: 'negative_consumption'; serial: string };

export type CreateResult = { ok: true; invoice: InvoiceDoc } | { ok: false; error: CreateError };

async function hasLiveInvoice(
	scope: Repo,
	apartmentId: Types.ObjectId,
	type: 'rent' | 'utilities',
	period: string
) {
	return !!(await scope.invoices.findOne({
		apartmentId,
		type,
		period,
		status: { $ne: 'cancelled' }
	}));
}

async function previousBefore(
	scope: Repo,
	meter: MeterDoc,
	lease: LeaseDoc,
	period: string
): Promise<number[]> {
	const earlier = await scope.readings
		.find({ meterId: meter._id, status: 'confirmed', period: { $lt: period } })
		.sort({ period: -1 })
		.limit(1)
		.lean();
	if (earlier[0]) return [...earlier[0].values];
	const moveIn = lease.moveInReadings.find((entry) => String(entry.meterId) === String(meter._id));
	return moveIn ? [...moveIn.values] : [...meter.initialReading];
}

export async function createUtilitiesInvoice(
	scope: Repo,
	apartment: ApartmentDoc,
	lease: LeaseDoc,
	period: string
): Promise<CreateResult> {
	if (await hasLiveInvoice(scope, apartment._id, 'utilities', period)) {
		return { ok: false, error: { code: 'exists' } };
	}
	const meters = await scope.meters.find({ apartmentId: apartment._id });
	const items: UtilityItem[] = [];

	for (const meter of meters) {
		if (meter.active) {
			const reading = await scope.readings.findOne({ meterId: meter._id, period });
			if (!reading) return { ok: false, error: { code: 'readings_missing', serial: meter.serial } };
			if (reading.status !== 'confirmed') {
				return { ok: false, error: { code: 'readings_pending', serial: meter.serial } };
			}
			items.push({
				service: meter.type,
				serial: meter.serial,
				zones: meter.zones,
				previous: await previousBefore(scope, meter, lease, period),
				current: [...reading.values]
			});
		} else if (
			meter.replacedAt &&
			inPeriod(meter.replacedAt, period) &&
			meter.finalReading.length > 0
		) {
			items.push({
				service: meter.type,
				serial: meter.serial,
				zones: meter.zones,
				previous: await previousBefore(scope, meter, lease, period),
				current: [...meter.finalReading]
			});
		}
	}

	if (items.length === 0) return { ok: false, error: { code: 'no_meters' } };

	const lookup = await priceLookup(scope.realtorId, new Date());
	const built = buildUtilityLines(items, lookup);
	if (!built.ok) {
		return {
			ok: false,
			error:
				built.reason === 'missing_tariff'
					? { code: 'missing_tariff', service: built.service ?? '' }
					: { code: 'negative_consumption', serial: built.serial ?? '' }
		};
	}

	const invoice = await scope.invoices.create({
		apartmentId: apartment._id,
		leaseId: lease._id,
		type: 'utilities',
		period,
		number: await nextInvoiceNumber(scope.realtorId),
		lines: built.lines,
		total: sumLines(built.lines),
		status: 'draft'
	});
	return { ok: true, invoice };
}

export async function createRentInvoice(
	scope: Repo,
	apartment: ApartmentDoc,
	lease: LeaseDoc,
	period: string
): Promise<CreateResult> {
	if (await hasLiveInvoice(scope, apartment._id, 'rent', period)) {
		return { ok: false, error: { code: 'exists' } };
	}
	const amount = rentAt(apartment.rentHistory, apartment.rentAmount, periodStart(period));
	const line: InvoiceLineInput = {
		kind: 'rent',
		quantity: 1,
		unit: 'month',
		price: amount,
		sum: amount
	};
	const invoice = await scope.invoices.create({
		apartmentId: apartment._id,
		leaseId: lease._id,
		type: 'rent',
		period,
		number: await nextInvoiceNumber(scope.realtorId),
		lines: [line],
		total: amount,
		status: 'draft'
	});
	return { ok: true, invoice };
}

export type IssueError = 'no_payout' | 'empty';

export async function issueInvoice(
	invoice: InvoiceDoc & { save: () => Promise<unknown> },
	realtorId: Types.ObjectId
): Promise<{ ok: true } | { ok: false; error: IssueError }> {
	if (invoice.lines.length === 0) return { ok: false, error: 'empty' };
	const realtor = await User.findById(realtorId).select('realtorProfile').lean();
	const profile = realtor?.realtorProfile;
	if (!profile?.iban || !profile.fullName) return { ok: false, error: 'no_payout' };
	const now = new Date();
	invoice.status = 'issued';
	invoice.issuedAt = now;
	invoice.dueDate = dueDateFrom(now);
	invoice.payout = { iban: profile.iban, fullName: profile.fullName, taxId: profile.taxId ?? '' };
	await invoice.save();
	return { ok: true };
}

export async function utilitiesLocked(
	scope: Repo,
	apartmentId: Types.ObjectId,
	period: string
): Promise<boolean> {
	return !!(await scope.invoices.findOne({
		apartmentId,
		type: 'utilities',
		period,
		status: { $ne: 'cancelled' }
	}));
}

export async function lockedKeys(scope: Repo, apartmentIds: string[]): Promise<Set<string>> {
	if (apartmentIds.length === 0) return new Set();
	const rows = await scope.invoices
		.find({ apartmentId: { $in: apartmentIds }, type: 'utilities', status: { $ne: 'cancelled' } })
		.select('apartmentId period')
		.lean();
	return new Set(rows.map((row) => `${row.apartmentId}|${row.period}`));
}

export async function invoiceViews(scope: Repo, invoices: InvoiceDoc[]): Promise<InvoiceView[]> {
	if (invoices.length === 0) return [];
	const apartments = await scope.apartments
		.find({ _id: { $in: [...new Set(invoices.map((invoice) => String(invoice.apartmentId)))] } })
		.select('name')
		.lean();
	const leases = await scope.leases
		.find({ _id: { $in: [...new Set(invoices.map((invoice) => String(invoice.leaseId)))] } })
		.lean();
	const tenants = await User.find({ _id: { $in: leases.map((lease) => lease.tenantId) } })
		.select('name')
		.lean();
	const apartmentName = new Map(apartments.map((item) => [String(item._id), item.name]));
	const tenantByLease = new Map(
		leases.map((lease) => [
			String(lease._id),
			tenants.find((tenant) => String(tenant._id) === String(lease.tenantId))?.name ?? ''
		])
	);
	return invoices.map((invoice) =>
		toInvoiceView(invoice, {
			apartment: apartmentName.get(String(invoice.apartmentId)) ?? '',
			tenant: tenantByLease.get(String(invoice.leaseId)) ?? ''
		})
	);
}

export { Invoice };
