import { rentAt } from './billing/calc';

type RentEntry = {
	amount: number;
	effectiveFrom: Date;
	leaseId?: unknown;
	notifiedAt?: Date | null;
	ackedAt?: Date | null;
};

type RentSource = { rentAmount: number; rentHistory: RentEntry[] };

export function currentRent(apartment: RentSource, now = new Date()): number {
	return rentAt(apartment.rentHistory, apartment.rentAmount, now);
}

export function rentHistoryViews(apartment: RentSource) {
	return [...apartment.rentHistory]
		.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
		.map((entry) => ({
			amount: entry.amount,
			effectiveFrom: entry.effectiveFrom.toISOString(),
			notified: !!entry.notifiedAt,
			ackedAt: entry.ackedAt ? entry.ackedAt.toISOString() : null
		}));
}

export function pendingRentChange(apartment: RentSource, leaseId: unknown) {
	const entry = [...apartment.rentHistory]
		.filter((item) => item.notifiedAt && !item.ackedAt && String(item.leaseId) === String(leaseId))
		.sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())[0];
	if (!entry) return null;
	const previous = rentAt(
		apartment.rentHistory,
		apartment.rentAmount,
		new Date(entry.effectiveFrom.getTime() - 1)
	);
	return {
		amount: entry.amount,
		previous,
		effectiveFrom: entry.effectiveFrom.toISOString()
	};
}
