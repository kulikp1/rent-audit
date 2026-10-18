import { z } from 'zod';

const price = z
	.string()
	.trim()
	.min(1, 'required')
	.transform((value) => Number(value.replace(',', '.')))
	.pipe(z.number('invalid_number').min(0, 'min_zero').max(100000, 'invalid_number'));

const optionalPrice = z
	.string()
	.trim()
	.default('')
	.transform((value) => (value === '' ? undefined : Number(value.replace(',', '.'))))
	.pipe(z.number('invalid_number').min(0, 'min_zero').max(100000, 'invalid_number').optional());

const date = z
	.string()
	.trim()
	.min(1, 'required')
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date')
	.transform((value) => new Date(`${value}T00:00:00`))
	.pipe(z.date('invalid_date'));

export function tariffSchema<const S extends readonly [string, ...string[]]>(services: S) {
	return z.object({
		service: z.enum(services, 'required'),
		price,
		nightPrice: optionalPrice,
		effectiveFrom: date
	});
}
