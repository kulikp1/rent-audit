export type ReadingFlag =
	| 'lower_than_previous'
	| 'digits_mismatch'
	| 'type_mismatch'
	| 'serial_mismatch'
	| 'unrealistic_growth'
	| 'unreadable';

export type MeterKind = 'water' | 'gas' | 'electricity';

export type ReadingCheckInput = {
	meterType: MeterKind;
	digits: number;
	serial: string;
	values: number[];
	previous: number[] | null;
	history?: number[][];
	recognized?: {
		meterType: MeterKind | 'unknown';
		serial: string | null;
		legible: boolean;
		confidence: number;
	};
};

export type ReadingCheck = { ok: boolean; flags: ReadingFlag[] };

const MIN_CONFIDENCE = 0.6;

const growthFloor: Record<MeterKind, number> = { water: 5, gas: 50, electricity: 300 };
const growthCap: Record<MeterKind, number> = { water: 100, gas: 1000, electricity: 5000 };

export function normalizeSerial(value: string): string {
	return value
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.replace(/^0+/, '');
}

export function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

export function monthlyDeltas(history: number[][], zone: number): number[] {
	const deltas: number[] = [];
	for (let index = 1; index < history.length; index += 1) {
		const delta = (history[index]![zone] ?? 0) - (history[index - 1]![zone] ?? 0);
		if (delta >= 0) deltas.push(delta);
	}
	return deltas;
}

export function growthThreshold(kind: MeterKind, deltas: number[]): number {
	if (deltas.length === 0) return growthCap[kind];
	return Math.max(median(deltas) * 4, growthFloor[kind]);
}

export function checkReading(input: ReadingCheckInput): ReadingCheck {
	const flags = new Set<ReadingFlag>();
	const { values, previous, recognized } = input;

	if (recognized) {
		if (!recognized.legible || recognized.confidence < MIN_CONFIDENCE) flags.add('unreadable');
		if (recognized.meterType !== 'unknown' && recognized.meterType !== input.meterType) {
			flags.add('type_mismatch');
		}
		if (recognized.serial && normalizeSerial(recognized.serial) !== normalizeSerial(input.serial)) {
			flags.add('serial_mismatch');
		}
	}

	if (!fitsDigits(values, input.digits)) flags.add('digits_mismatch');

	if (previous) {
		values.forEach((value, zone) => {
			const before = previous[zone];
			if (before === undefined) return;
			if (value < before) {
				flags.add('lower_than_previous');
				return;
			}
			const series = [...(input.history ?? []), previous];
			const threshold = growthThreshold(input.meterType, monthlyDeltas(series, zone));
			if (value - before > threshold) flags.add('unrealistic_growth');
		});
	}

	return { ok: flags.size === 0, flags: [...flags] };
}

export function fitsDigits(values: number[], digits: number): boolean {
	const limit = 10 ** digits;
	return values.every((value) => Number.isFinite(value) && value >= 0 && value < limit);
}
