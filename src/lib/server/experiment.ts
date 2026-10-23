import { checkReading, type MeterKind, type ReadingFlag } from './validation/reading.ts';

export type Sample = {
	file: string;
	condition: string;
	type: MeterKind;
	serial: string;
	digits: number;
	previous: number[] | null;
	expected: number[];
};

export type RecognitionResult = {
	meterType: MeterKind | 'unknown';
	serial: string | null;
	legible: boolean;
	confidence: number;
	numbers: number[];
};

export type Decision =
	'accepted_correct' | 'accepted_wrong' | 'manual_justified' | 'manual_unnecessary' | 'unavailable';

export type Outcome = { baselineCorrect: boolean | null; flags: ReadingFlag[]; decision: Decision };

const TOLERANCE = 0.0005;

export function valuesEqual(a: number[], b: number[]): boolean {
	return (
		a.length === b.length && a.every((value, index) => Math.abs(value - b[index]!) < TOLERANCE)
	);
}

function numbers(raw: string): number[] {
	return raw
		.split('|')
		.map((part) => part.trim())
		.filter(Boolean)
		.map((part) => Number(part.replace(',', '.')));
}

export function parseExpectedCsv(text: string): Sample[] {
	const [header, ...rows] = text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	if (!header) return [];
	const columns = header.split(',').map((column) => column.trim());
	const index = (name: string) => columns.indexOf(name);
	const required = ['file', 'condition', 'type', 'serial', 'digits', 'expected'];
	for (const name of required) {
		if (index(name) < 0) throw new Error(`Missing column "${name}" in expected.csv`);
	}
	return rows.map((row, line) => {
		const cells = row.split(',').map((cell) => cell.trim());
		const get = (name: string) => cells[index(name)] ?? '';
		const type = get('type');
		if (type !== 'water' && type !== 'gas' && type !== 'electricity') {
			throw new Error(`Row ${line + 2}: unknown type "${type}"`);
		}
		const expected = numbers(get('expected'));
		if (expected.length === 0 || expected.some(Number.isNaN)) {
			throw new Error(`Row ${line + 2}: invalid expected value`);
		}
		const previous = numbers(index('previous') >= 0 ? get('previous') : '');
		return {
			file: get('file'),
			condition: get('condition') || 'normal',
			type,
			serial: get('serial'),
			digits: Number(get('digits')) || 5,
			previous: previous.length > 0 ? previous : null,
			expected
		};
	});
}

export function evaluate(sample: Sample, recognition: RecognitionResult | null): Outcome {
	if (!recognition) return { baselineCorrect: null, flags: [], decision: 'unavailable' };
	const recognizedValues = recognition.numbers;
	const baselineCorrect = valuesEqual(recognizedValues, sample.expected);

	const check = checkReading({
		meterType: sample.type,
		digits: sample.digits,
		serial: sample.serial,
		values: recognizedValues.length > 0 ? recognizedValues : sample.expected.map(() => 0),
		previous: sample.previous,
		recognized: {
			meterType: recognition.meterType,
			serial: recognition.serial,
			legible: recognition.legible && recognizedValues.length > 0,
			confidence: recognition.confidence
		}
	});

	if (!check.ok) {
		return {
			baselineCorrect,
			flags: check.flags,
			decision: baselineCorrect ? 'manual_unnecessary' : 'manual_justified'
		};
	}
	return {
		baselineCorrect,
		flags: [],
		decision: baselineCorrect ? 'accepted_correct' : 'accepted_wrong'
	};
}

export type Summary = {
	condition: string;
	total: number;
	unavailable: number;
	baselineCorrect: number;
	baselineWrong: number;
	acceptedCorrect: number;
	acceptedWrong: number;
	manualJustified: number;
	manualUnnecessary: number;
};

export function summarize(items: { sample: Sample; outcome: Outcome }[]): Summary[] {
	const empty = (condition: string): Summary => ({
		condition,
		total: 0,
		unavailable: 0,
		baselineCorrect: 0,
		baselineWrong: 0,
		acceptedCorrect: 0,
		acceptedWrong: 0,
		manualJustified: 0,
		manualUnnecessary: 0
	});
	const groups = new Map<string, Summary>();
	const total = empty('all');
	for (const { sample, outcome } of items) {
		const group = groups.get(sample.condition) ?? empty(sample.condition);
		groups.set(sample.condition, group);
		for (const target of [group, total]) {
			target.total += 1;
			if (outcome.decision === 'unavailable') {
				target.unavailable += 1;
				continue;
			}
			if (outcome.baselineCorrect) target.baselineCorrect += 1;
			else target.baselineWrong += 1;
			if (outcome.decision === 'accepted_correct') target.acceptedCorrect += 1;
			if (outcome.decision === 'accepted_wrong') target.acceptedWrong += 1;
			if (outcome.decision === 'manual_justified') target.manualJustified += 1;
			if (outcome.decision === 'manual_unnecessary') target.manualUnnecessary += 1;
		}
	}
	return [...groups.values(), total];
}
