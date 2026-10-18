import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';

type Line = {
	kind: 'rent' | 'utility' | 'manual';
	service?: 'electricity' | 'gas' | 'water';
	serial?: string;
	zone?: 'single' | 'day' | 'night';
	description?: string;
};

export function serviceLabel(service: 'electricity' | 'gas' | 'water'): string {
	return { electricity: m.meter_electricity(), gas: m.meter_gas(), water: m.meter_water() }[
		service
	];
}

export function lineLabel(line: Line): string {
	if (line.kind === 'rent') return m.invoice_line_rent();
	if (line.kind === 'manual') return line.description ?? '';
	const base = `${serviceLabel(line.service!)}${line.serial ? ` · ${line.serial}` : ''}`;
	if (line.zone === 'day') return `${base} · ${m.meter_zone_day()}`;
	if (line.zone === 'night') return `${base} · ${m.meter_zone_night()}`;
	return base;
}

export function unitLabel(unit: string): string {
	return (
		{
			kwh: m.unit_kwh(),
			m3: m.unit_m3(),
			month: m.unit_month(),
			pcs: m.unit_pcs()
		}[unit] ?? unit
	);
}

export function statusLabel(status: string): string {
	return (
		{
			draft: m.invoice_status_draft(),
			issued: m.invoice_status_issued(),
			paid: m.invoice_status_paid(),
			overdue: m.invoice_status_overdue(),
			cancelled: m.invoice_status_cancelled()
		}[status] ?? status
	);
}

export function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' | 'info' {
	return (
		(
			{
				draft: 'neutral',
				issued: 'info',
				paid: 'success',
				overdue: 'danger',
				cancelled: 'neutral'
			} as const
		)[status as 'draft'] ?? 'neutral'
	);
}

export function typeLabel(type: string): string {
	return type === 'rent' ? m.invoice_type_rent() : m.invoice_type_utilities();
}

export function formatQuantity(value: number): string {
	return new Intl.NumberFormat(getLocale() === 'uk' ? 'uk-UA' : 'en-GB', {
		maximumFractionDigits: 3
	}).format(value);
}
