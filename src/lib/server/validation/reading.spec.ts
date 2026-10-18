import { describe, expect, it } from 'vitest';
import {
	checkReading,
	fitsDigits,
	growthThreshold,
	median,
	monthlyDeltas,
	normalizeSerial,
	type ReadingCheckInput
} from './reading';

const base: ReadingCheckInput = {
	meterType: 'water',
	digits: 5,
	serial: 'W-123456',
	values: [110],
	previous: [100]
};

describe('checkReading', () => {
	it('accepts a plausible reading', () => {
		expect(checkReading(base)).toEqual({ ok: true, flags: [] });
	});

	it('accepts the first reading without a previous value', () => {
		expect(checkReading({ ...base, previous: null }).ok).toBe(true);
	});

	it('flags a reading lower than the previous one', () => {
		expect(checkReading({ ...base, values: [90] }).flags).toEqual(['lower_than_previous']);
	});

	it('checks every zone independently', () => {
		const result = checkReading({
			...base,
			meterType: 'electricity',
			values: [2200, 40],
			previous: [2000, 50]
		});
		expect(result.flags).toEqual(['lower_than_previous']);
	});

	it('flags values that need more digits than the meter has', () => {
		expect(checkReading({ ...base, values: [100000], previous: null }).flags).toEqual([
			'digits_mismatch'
		]);
	});

	it('flags unrealistic growth against the apartment history', () => {
		const result = checkReading({
			...base,
			values: [200],
			previous: [110],
			history: [[90], [100]]
		});
		expect(result.flags).toEqual(['unrealistic_growth']);
	});

	it('does not flag growth within the usual range', () => {
		expect(
			checkReading({ ...base, values: [118], previous: [110], history: [[90], [100]] }).ok
		).toBe(true);
	});

	it('uses a hard cap for the very first reading of a meter', () => {
		expect(checkReading({ ...base, values: [500], previous: [100] }).flags).toEqual([
			'unrealistic_growth'
		]);
	});

	describe('recognized readings', () => {
		const recognized = {
			meterType: 'water' as const,
			serial: 'W-123456',
			legible: true,
			confidence: 0.9
		};

		it('accepts a matching recognition', () => {
			expect(checkReading({ ...base, recognized }).ok).toBe(true);
		});

		it('flags another meter type', () => {
			expect(
				checkReading({ ...base, recognized: { ...recognized, meterType: 'gas' } }).flags
			).toContain('type_mismatch');
		});

		it('flags a different serial number but ignores formatting', () => {
			expect(checkReading({ ...base, recognized: { ...recognized, serial: 'w 123456' } }).ok).toBe(
				true
			);
			expect(
				checkReading({ ...base, recognized: { ...recognized, serial: '999999' } }).flags
			).toContain('serial_mismatch');
		});

		it('flags unreadable or low-confidence photos', () => {
			expect(
				checkReading({ ...base, recognized: { ...recognized, legible: false } }).flags
			).toContain('unreadable');
			expect(
				checkReading({ ...base, recognized: { ...recognized, confidence: 0.3 } }).flags
			).toContain('unreadable');
		});

		it('does not flag a missing serial', () => {
			expect(checkReading({ ...base, recognized: { ...recognized, serial: null } }).ok).toBe(true);
		});
	});
});

describe('helpers', () => {
	it('normalizes serial numbers', () => {
		expect(normalizeSerial(' w-00123 ')).toBe('W00123'.replace(/^0+/, ''));
		expect(normalizeSerial('0012-ab')).toBe('12AB');
	});

	it('computes the median', () => {
		expect(median([])).toBe(0);
		expect(median([3, 1, 2])).toBe(2);
		expect(median([1, 2, 3, 10])).toBe(2.5);
	});

	it('derives monthly deltas and drops negative ones', () => {
		expect(monthlyDeltas([[10], [15], [12], [20]], 0)).toEqual([5, 8]);
	});

	it('scales the threshold with usage but never below the floor', () => {
		expect(growthThreshold('water', [])).toBe(100);
		expect(growthThreshold('water', [1, 2])).toBe(6);
		expect(growthThreshold('water', [0.2, 0.3])).toBe(5);
	});

	it('rejects negative and non-finite values', () => {
		expect(fitsDigits([-1], 5)).toBe(false);
		expect(fitsDigits([Number.NaN], 5)).toBe(false);
		expect(fitsDigits([99999.5], 5)).toBe(true);
	});
});
