import type { Service } from './calc';

export type ConsumptionPoint = { period: string; value: number };

export type AnomalyCode =
	| 'zero_consumption'
	| 'above_median'
	| 'below_median'
	| 'above_last_year'
	| 'jump_vs_last_month'
	| 'over_norm';

export type AnomalyReason = { code: AnomalyCode; value: number; expected: number };

export type AnomalyContext = { service: Service; residents: number };

const floor: Record<Service, number> = { water: 1, gas: 10, electricity: 50 };
const normPerResident: Record<Service, number> = { water: 10, gas: 30, electricity: 300 };

export const HIGH_RATIO = 1.5;
export const LOW_RATIO = 0.3;
export const MIN_HISTORY_FOR_MEDIAN = 3;
export const MAX_HISTORY_FOR_MEDIAN = 6;
export const YEAR_HISTORY = 12;

export function periodIndex(period: string): number {
	const [year, month] = period.split('-').map(Number);
	return year! * 12 + (month! - 1);
}

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function consumptionSeries(
	readings: { period: string; values: number[] }[],
	baseline: number[]
): ConsumptionPoint[] {
	const sorted = [...readings].sort((a, b) => a.period.localeCompare(b.period));
	const points: ConsumptionPoint[] = [];
	sorted.forEach((reading, index) => {
		const previous = index > 0 ? sorted[index - 1]! : null;
		const before = previous ? previous.values : baseline;
		const adjacent = !previous || periodIndex(reading.period) - periodIndex(previous.period) === 1;
		const delta = reading.values.reduce((sum, value, zone) => sum + value - (before[zone] ?? 0), 0);
		if (adjacent && delta >= 0) {
			points.push({ period: reading.period, value: Math.round(delta * 1000) / 1000 });
		}
	});
	return points;
}

export function mergeSeries(series: ConsumptionPoint[][]): ConsumptionPoint[] {
	const totals = new Map<string, number>();
	for (const points of series) {
		for (const point of points)
			totals.set(point.period, (totals.get(point.period) ?? 0) + point.value);
	}
	return [...totals.entries()]
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([period, value]) => ({ period, value: Math.round(value * 1000) / 1000 }));
}

export function analyzePoint(
	point: ConsumptionPoint,
	history: ConsumptionPoint[],
	context: AnomalyContext
): AnomalyReason[] {
	const reasons: AnomalyReason[] = [];
	const minimum = floor[context.service];
	const previousMonth = history.find(
		(item) => periodIndex(item.period) === periodIndex(point.period) - 1
	);

	if (point.value === 0 && (history.length === 0 || history.some((item) => item.value > 0))) {
		reasons.push({
			code: 'zero_consumption',
			value: 0,
			expected: median(history.map((item) => item.value))
		});
	}

	const sameMonthLastYear =
		history.length >= YEAR_HISTORY
			? history.find((item) => periodIndex(item.period) === periodIndex(point.period) - 12)
			: undefined;
	const matchesLastYear =
		!!sameMonthLastYear && point.value <= sameMonthLastYear.value * HIGH_RATIO + minimum;

	const recent = history.slice(-MAX_HISTORY_FOR_MEDIAN);
	if (recent.length >= MIN_HISTORY_FOR_MEDIAN) {
		const expected = median(recent.map((item) => item.value));
		if (point.value > expected * HIGH_RATIO && point.value - expected > minimum) {
			if (!matchesLastYear) reasons.push({ code: 'above_median', value: point.value, expected });
		} else if (
			point.value > 0 &&
			point.value < expected * LOW_RATIO &&
			expected - point.value > minimum
		) {
			reasons.push({ code: 'below_median', value: point.value, expected });
		}
	} else if (previousMonth) {
		if (
			point.value > previousMonth.value * HIGH_RATIO &&
			point.value - previousMonth.value > minimum
		) {
			reasons.push({
				code: 'jump_vs_last_month',
				value: point.value,
				expected: previousMonth.value
			});
		}
	}

	if (
		sameMonthLastYear &&
		point.value > sameMonthLastYear.value * HIGH_RATIO &&
		point.value - sameMonthLastYear.value > minimum
	) {
		reasons.push({
			code: 'above_last_year',
			value: point.value,
			expected: sameMonthLastYear.value
		});
	}

	const norm = normPerResident[context.service] * Math.max(1, context.residents);
	if (point.value > norm) reasons.push({ code: 'over_norm', value: point.value, expected: norm });

	return reasons;
}

export type AnalyzedPoint = ConsumptionPoint & { reasons: AnomalyReason[] };

export function analyzeSeries(
	points: ConsumptionPoint[],
	context: AnomalyContext
): AnalyzedPoint[] {
	return points.map((point, index) => ({
		...point,
		reasons: analyzePoint(point, points.slice(0, index), context)
	}));
}
