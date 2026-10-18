import { describe, expect, it } from 'vitest';
import {
	buildUtilityLines,
	canCancel,
	canEdit,
	canIssue,
	canMarkPaid,
	inPeriod,
	periodStart,
	consumption,
	dueDateFrom,
	effectiveStatus,
	endOfPeriod,
	previousPeriod,
	rentAt,
	round2,
	round3,
	sumLines,
	tariffAt
} from './calc';

const d = (value: string) => new Date(value);

describe('tariffAt', () => {
	const rows = [
		{ price: 4, effectiveFrom: d('2026-01-01') },
		{ price: 5, effectiveFrom: d('2026-06-01') },
		{ price: 6, effectiveFrom: d('2026-12-01') }
	];

	it('picks the latest tariff that is already in effect', () => {
		expect(tariffAt(rows, d('2026-07-15'))?.price).toBe(5);
		expect(tariffAt(rows, d('2026-06-01'))?.price).toBe(5);
	});

	it('ignores tariffs from the future', () => {
		expect(tariffAt(rows, d('2026-02-01'))?.price).toBe(4);
	});

	it('returns null before the first tariff', () => {
		expect(tariffAt(rows, d('2025-12-31'))).toBeNull();
	});

	it('keeps an already issued price unchanged when a new one is added later', () => {
		const issued = tariffAt(rows, d('2026-07-15'))!.price;
		const withNew = [...rows, { price: 9, effectiveFrom: d('2026-08-01') }];
		expect(tariffAt(withNew, d('2026-07-15'))!.price).toBe(issued);
		expect(tariffAt(withNew, d('2026-08-02'))!.price).toBe(9);
	});
});

describe('rounding and consumption', () => {
	it('rounds money to cents and quantities to three decimals', () => {
		expect(round2(1.005)).toBe(1.01);
		expect(round3(0.1 + 0.2)).toBe(0.3);
	});

	it('computes consumption per zone', () => {
		expect(consumption([100, 50], [130.5, 80])).toEqual([30.5, 30]);
	});

	it('rejects a negative consumption', () => {
		expect(consumption([100], [90])).toBeNull();
	});
});

describe('buildUtilityLines', () => {
	const price = (service: string) =>
		({
			water: { price: 40, nightPrice: null },
			gas: { price: 7.96, nightPrice: null },
			electricity: { price: 4.32, nightPrice: 2.16 }
		})[service as 'water']!;

	it('creates one line for a single-zone meter', () => {
		const result = buildUtilityLines(
			[{ service: 'water', serial: 'W1', zones: 1, previous: [100], current: [112.5] }],
			price
		);
		expect(result).toEqual({
			ok: true,
			lines: [
				{
					kind: 'utility',
					service: 'water',
					serial: 'W1',
					zone: 'single',
					quantity: 12.5,
					unit: 'm3',
					price: 40,
					sum: 500
				}
			]
		});
	});

	it('uses the night price for the second zone of a two-zone meter', () => {
		const result = buildUtilityLines(
			[
				{
					service: 'electricity',
					serial: 'E1',
					zones: 2,
					previous: [1000, 500],
					current: [1100, 600]
				}
			],
			price
		);
		expect(result.ok && result.lines.map((line) => [line.zone, line.price, line.sum])).toEqual([
			['day', 4.32, 432],
			['night', 2.16, 216]
		]);
	});

	it('fails when a tariff is missing', () => {
		const result = buildUtilityLines(
			[{ service: 'gas', serial: 'G1', zones: 1, previous: [1], current: [2] }],
			() => null
		);
		expect(result).toEqual({ ok: false, reason: 'missing_tariff', service: 'gas', serial: 'G1' });
	});

	it('fails on a negative consumption', () => {
		const result = buildUtilityLines(
			[{ service: 'water', serial: 'W1', zones: 1, previous: [10], current: [5] }],
			price
		);
		expect(result.ok).toBe(false);
	});

	it('sums the lines to cents', () => {
		const result = buildUtilityLines(
			[
				{ service: 'water', serial: 'W1', zones: 1, previous: [0], current: [3.333] },
				{ service: 'gas', serial: 'G1', zones: 1, previous: [0], current: [10] }
			],
			price
		);
		expect(result.ok && sumLines(result.lines)).toBe(round2(3.333 * 40 + 10 * 7.96));
	});
});

describe('rent and periods', () => {
	const history = [
		{ amount: 10000, effectiveFrom: d('2026-01-01') },
		{ amount: 12000, effectiveFrom: d('2026-09-01') }
	];

	it('uses the rent that was in effect at the given date', () => {
		expect(rentAt(history, 1, d('2026-08-31'))).toBe(10000);
		expect(rentAt(history, 1, d('2026-09-01'))).toBe(12000);
	});

	it('falls back to the current rent without history', () => {
		expect(rentAt([], 9000, d('2026-01-01'))).toBe(9000);
	});

	it('finds the end of a period and the previous period', () => {
		expect(endOfPeriod('2026-02').getDate()).toBe(28);
		expect(previousPeriod(d('2026-01-15T12:00:00'))).toBe('2025-12');
	});
});

describe('effectiveStatus', () => {
	const now = d('2026-10-20');

	it('marks an issued invoice past its due date as overdue', () => {
		expect(effectiveStatus({ status: 'issued', dueDate: d('2026-10-10') }, now)).toBe('overdue');
	});

	it('keeps other statuses', () => {
		expect(effectiveStatus({ status: 'issued', dueDate: d('2026-11-01') }, now)).toBe('issued');
		expect(effectiveStatus({ status: 'paid', dueDate: d('2026-10-10') }, now)).toBe('paid');
		expect(effectiveStatus({ status: 'draft' }, now)).toBe('draft');
	});

	it('sets the due date ten days after issuing', () => {
		expect(dueDateFrom(d('2026-10-01T00:00:00Z')).toISOString()).toBe('2026-10-11T00:00:00.000Z');
	});
});

describe('invoice transitions', () => {
	it('allows editing and issuing only drafts', () => {
		expect(canEdit('draft')).toBe(true);
		expect(canIssue('draft')).toBe(true);
		for (const status of ['issued', 'paid', 'overdue', 'cancelled']) {
			expect(canEdit(status)).toBe(false);
			expect(canIssue(status)).toBe(false);
		}
	});

	it('allows paying and cancelling only open invoices', () => {
		for (const status of ['issued', 'overdue']) {
			expect(canMarkPaid(status)).toBe(true);
			expect(canCancel(status)).toBe(true);
		}
		for (const status of ['draft', 'paid', 'cancelled']) {
			expect(canMarkPaid(status)).toBe(false);
			expect(canCancel(status)).toBe(false);
		}
	});

	it('detects whether a date falls into a period', () => {
		expect(periodStart('2026-03').getMonth()).toBe(2);
		expect(inPeriod(new Date(2026, 2, 31, 12), '2026-03')).toBe(true);
		expect(inPeriod(new Date(2026, 3, 1), '2026-03')).toBe(false);
	});
});
