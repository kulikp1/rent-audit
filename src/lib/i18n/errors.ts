import { m } from '#lib/paraglide/messages.js';

const messages: Record<string, () => string> = {
	required: () => m.err_required(),
	too_long: () => m.err_too_long(),
	invalid_number: () => m.err_invalid_number(),
	min_zero: () => m.err_min_zero(),
	invalid_digits: () => m.err_invalid_digits(),
	invalid_reading: () => m.err_invalid_reading(),
	reading_lower: () => m.err_reading_lower(),
	invalid_iban: () => m.err_invalid_iban(),
	invalid_tax_id: () => m.err_invalid_tax_id(),
	not_found: () => m.err_not_found(),
	invalid_date: () => m.err_invalid_date(),
	date_in_past: () => m.err_date_in_past()
};

export function errorText(code: string | undefined): string | undefined {
	if (!code) return undefined;
	return messages[code]?.() ?? m.error_generic();
}

export function errorTexts(errors: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(errors).map(([key, code]) => [key, errorText(code)!]));
}
