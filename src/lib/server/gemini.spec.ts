import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ GEMINI_API_KEY: '', GEMINI_MODEL: 'test' }));

const { parseRecognition } = await import('./gemini');

const ok = {
	meter_type: 'water',
	serial_number: ' W-1 ',
	values: ['00123.456'],
	legible: true,
	confidence: 0.92
};

describe('parseRecognition', () => {
	it('parses a valid response', () => {
		expect(parseRecognition(JSON.stringify(ok))).toEqual({
			meterType: 'water',
			serial: 'W-1',
			values: ['00123.456'],
			legible: true,
			confidence: 0.92,
			numbers: [123.456]
		});
	});

	it('supports two-zone electricity values', () => {
		expect(
			parseRecognition(
				JSON.stringify({ ...ok, meter_type: 'electricity', values: ['02000', '1000,5'] })
			)?.numbers
		).toEqual([2000, 1000.5]);
	});

	it('turns an empty serial into null', () => {
		expect(parseRecognition(JSON.stringify({ ...ok, serial_number: '  ' }))?.serial).toBeNull();
	});

	it('marks unparsable numbers as not legible', () => {
		const result = parseRecognition(JSON.stringify({ ...ok, values: ['12x4'] }));
		expect(result?.legible).toBe(false);
		expect(result?.numbers).toEqual([]);
	});

	it('rejects malformed JSON and wrong shapes', () => {
		expect(parseRecognition('not json')).toBeNull();
		expect(parseRecognition('null')).toBeNull();
		expect(parseRecognition(JSON.stringify({ ...ok, confidence: 2 }))).toBeNull();
		expect(parseRecognition(JSON.stringify({ ...ok, meter_type: 'heat' }))).toBeNull();
	});
});
