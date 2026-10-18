import { z } from 'zod';

const money = z
	.string()
	.trim()
	.min(1, 'required')
	.transform((value) => Number(value.replace(',', '.')))
	.pipe(z.number('invalid_number').min(0, 'min_zero').max(10_000_000, 'invalid_number'));

export const apartmentSchema = z.object({
	name: z.string().trim().min(1, 'required').max(80, 'too_long'),
	address: z.string().trim().max(200, 'too_long').default(''),
	rentAmount: money,
	residents: z.coerce
		.number('invalid_number')
		.int('invalid_number')
		.min(1, 'invalid_number')
		.max(20, 'invalid_number')
		.default(1)
});

export const apartmentUpdateSchema = apartmentSchema.omit({ rentAmount: true });

export type ApartmentInput = z.infer<typeof apartmentSchema>;
