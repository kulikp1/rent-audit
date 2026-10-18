import { describe, expect, it } from 'vitest';
import { settingsSchema, validIban } from './settings';

describe('validIban', () => {
	it('accepts a valid Ukrainian IBAN', () => {
		expect(validIban('UA213223130000026007233566001')).toBe(true);
	});

	it('rejects a wrong checksum', () => {
		expect(validIban('UA223223130000026007233566001')).toBe(false);
	});

	it('rejects foreign or malformed values', () => {
		expect(validIban('DE89370400440532013000')).toBe(false);
		expect(validIban('UA21')).toBe(false);
	});
});

describe('settingsSchema', () => {
	const base = { fullName: '', iban: '', taxId: '', readingsDay: '5', rentDay: '1' };

	it('normalizes spaces and case in the IBAN', () => {
		const parsed = settingsSchema.parse({ ...base, iban: 'ua21 3223 1300 0002 6007 2335 6600 1' });
		expect(parsed.iban).toBe('UA213223130000026007233566001');
	});

	it('allows an empty IBAN and tax id', () => {
		expect(settingsSchema.safeParse(base).success).toBe(true);
	});

	it('rejects a tax id that is not 10 digits', () => {
		expect(settingsSchema.safeParse({ ...base, taxId: '123' }).success).toBe(false);
	});

	it('limits the days to 1-28', () => {
		expect(settingsSchema.safeParse({ ...base, rentDay: '31' }).success).toBe(false);
	});
});
