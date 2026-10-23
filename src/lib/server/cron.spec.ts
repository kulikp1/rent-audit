import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/env/private', () => ({ CRON_SECRET: 'top-secret' }));
vi.mock('$app/env', () => ({ dev: true }));
vi.mock('@sveltejs/kit', () => ({
	error: (status: number, message?: string) => {
		throw Object.assign(new Error(message ?? String(status)), { status });
	}
}));

const { authorizeCron, cronNow, isScheduledDay } = await import('./cron');

const request = (authorization?: string) =>
	new Request('http://localhost/api/cron/x', { headers: authorization ? { authorization } : {} });

describe('authorizeCron', () => {
	it('accepts the secret token', () => {
		expect(() => authorizeCron(request('Bearer top-secret'))).not.toThrow();
	});

	it('rejects a missing or wrong token', () => {
		expect(() => authorizeCron(request())).toThrowError(expect.objectContaining({ status: 401 }));
		expect(() => authorizeCron(request('Bearer nope'))).toThrowError(
			expect.objectContaining({ status: 401 })
		);
		expect(() => authorizeCron(request('Bearer top-secret!'))).toThrowError(
			expect.objectContaining({ status: 401 })
		);
	});
});

describe('scheduling helpers', () => {
	it('matches the configured day of the month', () => {
		expect(isScheduledDay(5, new Date(2026, 9, 5))).toBe(true);
		expect(isScheduledDay(5, new Date(2026, 9, 6))).toBe(false);
	});

	it('allows overriding the current time only in development', () => {
		const url = new URL('http://localhost/?now=2026-10-05T08:00:00Z');
		expect(cronNow(url).toISOString()).toBe('2026-10-05T08:00:00.000Z');
		expect(cronNow(new URL('http://localhost/?now=garbage')).getFullYear()).toBeGreaterThan(2000);
	});
});
