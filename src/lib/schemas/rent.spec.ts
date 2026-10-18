import { describe, expect, it } from 'vitest';
import { rentChangeSchema } from './rent';

const tomorrow = () => {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

describe('rentChangeSchema', () => {
	it('accepts a future date and a decimal amount with a comma', () => {
		const parsed = rentChangeSchema.parse({ amount: '12500,5', effectiveFrom: tomorrow() });
		expect(parsed.amount).toBe(12500.5);
	});

	it('rejects a date in the past', () => {
		const result = rentChangeSchema.safeParse({ amount: '1', effectiveFrom: '2020-01-01' });
		expect(result.success).toBe(false);
	});

	it('rejects an empty or negative amount', () => {
		expect(rentChangeSchema.safeParse({ amount: '', effectiveFrom: tomorrow() }).success).toBe(
			false
		);
		expect(rentChangeSchema.safeParse({ amount: '-5', effectiveFrom: tomorrow() }).success).toBe(
			false
		);
	});
});
