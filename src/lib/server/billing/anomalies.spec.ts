import { describe, expect, it } from 'vitest';
import {
	analyzePoint,
	analyzeSeries,
	consumptionSeries,
	mergeSeries,
	median,
	periodIndex,
	type ConsumptionPoint
} from './anomalies';

const series = (values: number[], start = '2026-01'): ConsumptionPoint[] => {
	const [year, month] = start.split('-').map(Number);
	return values.map((value, offset) => {
		const index = year! * 12 + (month! - 1) + offset;
		return {
			period: `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`,
			value
		};
	});
};

const water = { service: 'water' as const, residents: 2 };

describe('median and periods', () => {
	it('computes the median', () => {
		expect(median([])).toBe(0);
		expect(median([5, 1, 3])).toBe(3);
		expect(median([1, 2, 3, 4])).toBe(2.5);
	});

	it('numbers months consecutively across years', () => {
		expect(periodIndex('2027-01') - periodIndex('2026-12')).toBe(1);
	});
});

describe('consumptionSeries', () => {
	it('derives monthly consumption from consecutive readings', () => {
		const result = consumptionSeries(
			[
				{ period: '2026-01', values: [110] },
				{ period: '2026-02', values: [125] }
			],
			[100]
		);
		expect(result).toEqual([
			{ period: '2026-01', value: 10 },
			{ period: '2026-02', value: 15 }
		]);
	});

	it('sums the zones of a two-zone meter', () => {
		expect(consumptionSeries([{ period: '2026-01', values: [120, 70] }], [100, 50])[0]?.value).toBe(
			40
		);
	});

	it('skips months that follow a gap, because the value would cover several months', () => {
		const result = consumptionSeries(
			[
				{ period: '2026-01', values: [110] },
				{ period: '2026-04', values: [150] }
			],
			[100]
		);
		expect(result.map((point) => point.period)).toEqual(['2026-01']);
	});

	it('drops negative consumption', () => {
		expect(consumptionSeries([{ period: '2026-01', values: [90] }], [100])).toEqual([]);
	});

	it('adds consumption of several meters per month', () => {
		expect(
			mergeSeries([
				[{ period: '2026-01', value: 4 }],
				[
					{ period: '2026-01', value: 6 },
					{ period: '2026-02', value: 1 }
				]
			])
		).toEqual([
			{ period: '2026-01', value: 10 },
			{ period: '2026-02', value: 1 }
		]);
	});
});

describe('analyzePoint', () => {
	it('flags consumption far above the median of the last months', () => {
		const history = series([6, 7, 6, 8, 7]);
		const reasons = analyzePoint({ period: '2026-06', value: 18 }, history, water);
		expect(reasons.map((reason) => reason.code)).toContain('above_median');
	});

	it('does not flag normal fluctuations', () => {
		const history = series([6, 7, 6, 8, 7]);
		expect(analyzePoint({ period: '2026-06', value: 9 }, history, water)).toEqual([]);
	});

	it('flags a sudden drop far below the median', () => {
		const history = series([20, 22, 21, 20]);
		const reasons = analyzePoint({ period: '2026-05', value: 2 }, history, water);
		expect(reasons.map((reason) => reason.code)).toContain('below_median');
	});

	it('ignores small absolute differences even if the ratio is large', () => {
		const history = series([0.4, 0.5, 0.4]);
		expect(analyzePoint({ period: '2026-04', value: 1.2 }, history, water)).toEqual([]);
	});

	it('flags zero consumption after a normal history', () => {
		const history = series([6, 7, 6]);
		const reasons = analyzePoint({ period: '2026-04', value: 0 }, history, water);
		expect(reasons.map((reason) => reason.code)).toContain('zero_consumption');
	});

	it('uses only the last six months for the median', () => {
		const history = series([100, 100, 100, 100, 5, 5, 5, 5, 5, 5]);
		const reasons = analyzePoint({ period: '2026-11', value: 12 }, history, water);
		expect(reasons.map((reason) => reason.code)).toContain('above_median');
	});

	it('applies the simpler jump rule to a new apartment with little history', () => {
		const history = series([10, 12]);
		const reasons = analyzePoint({ period: '2026-03', value: 20 }, history, water);
		expect(reasons.map((reason) => reason.code)).toEqual(['jump_vs_last_month']);
	});

	it('does not apply the jump rule for a rise of up to 50 percent', () => {
		expect(analyzePoint({ period: '2026-03', value: 17 }, series([10, 12]), water)).toEqual([]);
	});

	it('compares with the same month of last year once twelve months exist', () => {
		const history = series([10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
		const reasons = analyzePoint({ period: '2027-01', value: 16 }, history, water);
		expect(reasons.map((reason) => reason.code)).toContain('above_last_year');
	});

	it('flags consumption above the per-resident norm', () => {
		const reasons = analyzePoint({ period: '2026-01', value: 25 }, [], {
			service: 'water',
			residents: 2
		});
		expect(reasons.map((reason) => reason.code)).toContain('over_norm');
		expect(
			analyzePoint({ period: '2026-01', value: 25 }, [], { service: 'water', residents: 3 })
		).toEqual([]);
	});
});

describe('analyzeSeries', () => {
	it('marks only the anomalous month and uses earlier months as history', () => {
		const result = analyzeSeries(series([6, 7, 6, 8, 25]), water);
		expect(result.map((point) => point.reasons.length > 0)).toEqual([
			false,
			false,
			false,
			false,
			true
		]);
	});
});
