import { describe, expect, it } from 'vitest';
import {
	evaluate,
	parseExpectedCsv,
	summarize,
	valuesEqual,
	type RecognitionResult,
	type Sample
} from './experiment';

const sample: Sample = {
	file: 'a.jpg',
	condition: 'normal',
	type: 'water',
	serial: 'W-1',
	digits: 5,
	previous: [100],
	expected: [123.456]
};

const recognized = (overrides: Partial<RecognitionResult> = {}): RecognitionResult => ({
	meterType: 'water',
	serial: 'W-1',
	legible: true,
	confidence: 0.95,
	numbers: [123.456],
	...overrides
});

describe('parseExpectedCsv', () => {
	it('parses rows with zones and optional previous values', () => {
		const rows = parseExpectedCsv(
			'file,condition,type,serial,digits,previous,expected\na.jpg,glare,electricity,E-1,5,2000|1000,2100|1150\nb.jpg,,water,W-1,5,,12.5\n'
		);
		expect(rows[0]).toMatchObject({
			condition: 'glare',
			previous: [2000, 1000],
			expected: [2100, 1150]
		});
		expect(rows[1]).toMatchObject({ condition: 'normal', previous: null, expected: [12.5] });
	});

	it('rejects a missing column and an unknown type', () => {
		expect(() => parseExpectedCsv('file,type\na.jpg,water')).toThrow(/Missing column/);
		expect(() =>
			parseExpectedCsv('file,condition,type,serial,digits,expected\na.jpg,normal,heat,S,5,1')
		).toThrow(/unknown type/);
	});
});

describe('evaluate', () => {
	it('accepts a correct reading that passes all checks', () => {
		expect(evaluate(sample, recognized()).decision).toBe('accepted_correct');
	});

	it('lets a wrong value slip through when it looks plausible', () => {
		const outcome = evaluate(sample, recognized({ numbers: [123.466] }));
		expect(outcome.baselineCorrect).toBe(false);
		expect(outcome.decision).toBe('accepted_wrong');
	});

	it('sends an implausible wrong value to manual confirmation as justified', () => {
		const outcome = evaluate(sample, recognized({ numbers: [12.456] }));
		expect(outcome.flags).toContain('lower_than_previous');
		expect(outcome.decision).toBe('manual_justified');
	});

	it('flags an unnecessary manual confirmation when the value is correct', () => {
		const outcome = evaluate(sample, recognized({ serial: '999999' }));
		expect(outcome.flags).toContain('serial_mismatch');
		expect(outcome.decision).toBe('manual_unnecessary');
	});

	it('treats an unreadable photo as wrong without checks and manual with checks', () => {
		const outcome = evaluate(sample, recognized({ legible: false, numbers: [] }));
		expect(outcome.baselineCorrect).toBe(false);
		expect(outcome.flags).toContain('unreadable');
		expect(outcome.decision).toBe('manual_justified');
	});

	it('reports unavailable recognition', () => {
		expect(evaluate(sample, null).decision).toBe('unavailable');
	});
});

describe('valuesEqual and summarize', () => {
	it('compares values within a tolerance', () => {
		expect(valuesEqual([1.0001], [1])).toBe(true);
		expect(valuesEqual([1.01], [1])).toBe(false);
		expect(valuesEqual([1], [1, 2])).toBe(false);
	});

	it('groups results by condition and adds a total row', () => {
		const items = [
			{ sample, outcome: evaluate(sample, recognized()) },
			{
				sample: { ...sample, condition: 'glare' },
				outcome: evaluate(sample, recognized({ numbers: [12.456] }))
			},
			{ sample: { ...sample, condition: 'glare' }, outcome: evaluate(sample, null) }
		];
		const rows = summarize(items);
		const glare = rows.find((row) => row.condition === 'glare')!;
		const all = rows.find((row) => row.condition === 'all')!;
		expect(glare).toMatchObject({ total: 2, unavailable: 1, manualJustified: 1, baselineWrong: 1 });
		expect(all).toMatchObject({ total: 3, acceptedCorrect: 1, baselineCorrect: 1 });
	});
});
