export type Service = 'electricity' | 'gas' | 'water';
export type Unit = 'kwh' | 'm3' | 'month' | 'pcs';
export type Zone = 'single' | 'day' | 'night';

export type TariffRow = { price: number; nightPrice?: number | null; effectiveFrom: Date };

export type InvoiceLineInput = {
	kind: 'rent' | 'utility' | 'manual';
	service?: Service;
	serial?: string;
	zone?: Zone;
	description?: string;
	quantity: number;
	unit: Unit;
	price: number;
	sum: number;
};

export const unitFor: Record<Service, Unit> = { water: 'm3', gas: 'm3', electricity: 'kwh' };

export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
export const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

export function tariffAt<T extends { effectiveFrom: Date }>(rows: T[], at: Date): T | null {
	let best: T | null = null;
	for (const row of rows) {
		if (row.effectiveFrom.getTime() > at.getTime()) continue;
		if (!best || row.effectiveFrom.getTime() > best.effectiveFrom.getTime()) best = row;
	}
	return best;
}

export function consumption(previous: number[], current: number[]): number[] | null {
	const result = current.map((value, zone) => round3(value - (previous[zone] ?? 0)));
	return result.some((value) => value < 0) ? null : result;
}

export function sumLines(lines: { sum: number }[]): number {
	return round2(lines.reduce((total, line) => total + line.sum, 0));
}

export type UtilityItem = {
	service: Service;
	serial: string;
	zones: number;
	previous: number[];
	current: number[];
};

export type PriceLookup = (service: Service) => { price: number; nightPrice: number | null } | null;

export type BuildResult =
	| { ok: true; lines: InvoiceLineInput[] }
	| {
			ok: false;
			reason: 'missing_tariff' | 'negative_consumption';
			service?: Service;
			serial?: string;
	  };

export function buildUtilityLines(items: UtilityItem[], priceFor: PriceLookup): BuildResult {
	const lines: InvoiceLineInput[] = [];
	for (const item of items) {
		const delta = consumption(item.previous, item.current);
		if (!delta)
			return {
				ok: false,
				reason: 'negative_consumption',
				service: item.service,
				serial: item.serial
			};
		const tariff = priceFor(item.service);
		if (!tariff)
			return { ok: false, reason: 'missing_tariff', service: item.service, serial: item.serial };
		const twoZones = item.zones === 2;
		delta.forEach((quantity, index) => {
			const zone: Zone = twoZones ? (index === 0 ? 'day' : 'night') : 'single';
			const price = twoZones && index === 1 ? (tariff.nightPrice ?? tariff.price) : tariff.price;
			lines.push({
				kind: 'utility',
				service: item.service,
				serial: item.serial,
				zone,
				quantity,
				unit: unitFor[item.service],
				price,
				sum: round2(quantity * price)
			});
		});
	}
	return { ok: true, lines };
}

export function rentAt(
	history: { amount: number; effectiveFrom: Date }[],
	fallback: number,
	at: Date
): number {
	return tariffAt(history, at)?.amount ?? fallback;
}

export function endOfPeriod(period: string): Date {
	const [year, month] = period.split('-').map(Number);
	return new Date(year!, month!, 0, 23, 59, 59, 999);
}

export function previousPeriod(date = new Date()): string {
	const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export const DUE_DAYS = 10;

export function dueDateFrom(issuedAt: Date): Date {
	return new Date(issuedAt.getTime() + DUE_DAYS * 24 * 60 * 60 * 1000);
}

export type StatusLike = { status: string; dueDate?: Date | null };

export function effectiveStatus(invoice: StatusLike, now = new Date()): string {
	if (invoice.status === 'issued' && invoice.dueDate && invoice.dueDate.getTime() < now.getTime()) {
		return 'overdue';
	}
	return invoice.status;
}

export function isOpenStatus(status: string): boolean {
	return status === 'issued' || status === 'overdue';
}

export function canEdit(status: string): boolean {
	return status === 'draft';
}

export function canIssue(status: string): boolean {
	return status === 'draft';
}

export function canMarkPaid(status: string): boolean {
	return isOpenStatus(status);
}

export function canCancel(status: string): boolean {
	return isOpenStatus(status);
}

export function periodStart(period: string): Date {
	const [year, month] = period.split('-').map(Number);
	return new Date(year!, month! - 1, 1);
}

export function inPeriod(date: Date, period: string): boolean {
	return (
		date.getTime() >= periodStart(period).getTime() &&
		date.getTime() <= endOfPeriod(period).getTime()
	);
}
