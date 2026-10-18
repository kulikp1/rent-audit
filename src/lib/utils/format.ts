import { getLocale } from '#lib/paraglide/runtime.js';

const intlLocale = () => (getLocale() === 'uk' ? 'uk-UA' : 'en-GB');

export function formatMoney(amount: number): string {
	return new Intl.NumberFormat(intlLocale(), {
		style: 'currency',
		currency: 'UAH',
		maximumFractionDigits: 2
	}).format(amount);
}

export function formatDate(value: string | Date): string {
	return new Intl.DateTimeFormat(intlLocale(), { dateStyle: 'medium' }).format(new Date(value));
}

export function formatPeriod(period: string): string {
	const [year, month] = period.split('-').map(Number);
	const name = new Intl.DateTimeFormat(intlLocale(), { month: 'long' }).format(
		new Date(year!, month! - 1, 1)
	);
	return `${name.charAt(0).toLocaleUpperCase(intlLocale())}${name.slice(1)} ${year}`;
}

export function formatPeriodShort(period: string): string {
	const [year, month] = period.split('-').map(Number);
	return new Intl.DateTimeFormat(intlLocale(), { month: 'short', year: '2-digit' }).format(
		new Date(year!, month! - 1, 1)
	);
}

export function formatReading(values: number[]): string {
	return values
		.map((value) => new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 3 }).format(value))
		.join(' / ');
}

export function currentPeriod(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
