import { describe, expect, it } from 'vitest';
import { tariffSchema } from './tariff';

describe('tariffSchema', () => {
	const schema = tariffSchema(['water']);

	it('accepts a tariff without a night price', () => {
		const parsed = schema.parse({ service: 'water', price: '40,5', effectiveFrom: '2026-10-01' });
		expect(parsed.price).toBe(40.5);
		expect(parsed.nightPrice).toBeUndefined();
		expect(parsed.effectiveFrom.getFullYear()).toBe(2026);
	});

	it('parses an optional night price with a comma', () => {
		const parsed = tariffSchema(['electricity']).parse({
			service: 'electricity',
			price: '4.32',
			nightPrice: '2,16',
			effectiveFrom: '2026-10-01'
		});
		expect(parsed.nightPrice).toBe(2.16);
	});

	it('rejects a service outside the allowed list', () => {
		expect(
			schema.safeParse({ service: 'gas', price: '1', effectiveFrom: '2026-10-01' }).success
		).toBe(false);
	});

	it('rejects negative, empty and invalid values', () => {
		expect(
			schema.safeParse({ service: 'water', price: '-1', effectiveFrom: '2026-10-01' }).success
		).toBe(false);
		expect(
			schema.safeParse({ service: 'water', price: '', effectiveFrom: '2026-10-01' }).success
		).toBe(false);
		expect(
			schema.safeParse({ service: 'water', price: '1', effectiveFrom: '01.10.2026' }).success
		).toBe(false);
	});
});
