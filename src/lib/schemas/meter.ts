import { z } from 'zod';

const reading = z
	.string()
	.trim()
	.transform((value) => value.replace(',', '.'))
	.pipe(z.string().regex(/^\d+(\.\d{1,3})?$/, 'invalid_reading'));

export const meterSchema = z
	.object({
		type: z.enum(['water', 'gas', 'electricity'], 'required'),
		serial: z.string().trim().min(1, 'required').max(40, 'too_long'),
		digits: z.coerce
			.number('invalid_digits')
			.int('invalid_digits')
			.min(3, 'invalid_digits')
			.max(10, 'invalid_digits'),
		zones: z.coerce
			.number()
			.pipe(z.union([z.literal(1), z.literal(2)]))
			.default(1),
		initial1: reading,
		initial2: z.string().trim().default('')
	})
	.superRefine((value, ctx) => {
		const limit = 10 ** value.digits;
		const first = Number(value.initial1);
		if (first >= limit)
			ctx.addIssue({ code: 'custom', path: ['initial1'], message: 'invalid_reading' });
		if (value.zones === 2) {
			const normalized = value.initial2.replace(',', '.');
			if (!/^\d+(\.\d{1,3})?$/.test(normalized) || Number(normalized) >= limit) {
				ctx.addIssue({ code: 'custom', path: ['initial2'], message: 'invalid_reading' });
			}
		}
	});

export type MeterInput = z.infer<typeof meterSchema>;

export function meterInitialValues(input: MeterInput): number[] {
	const values = [Number(input.initial1)];
	if (input.zones === 2) values.push(Number(input.initial2.replace(',', '.')));
	return values;
}
