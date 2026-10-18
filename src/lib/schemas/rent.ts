import { z } from 'zod';

const startOfToday = () => {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const rentChangeSchema = z.object({
	amount: z
		.string()
		.trim()
		.min(1, 'required')
		.transform((value) => Number(value.replace(',', '.')))
		.pipe(z.number('invalid_number').min(0, 'min_zero').max(10_000_000, 'invalid_number')),
	effectiveFrom: z
		.string()
		.trim()
		.min(1, 'required')
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date')
		.transform((value) => new Date(`${value}T00:00:00`))
		.pipe(z.date('invalid_date'))
		.refine((value) => value.getTime() >= startOfToday().getTime(), 'date_in_past')
});
