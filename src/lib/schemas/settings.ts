import { z } from 'zod';
import { avatarColorKeys } from '../avatar-colors';

function validIban(value: string): boolean {
	if (!/^UA\d{27}$/.test(value)) return false;
	const rearranged = value.slice(4) + value.slice(0, 4);
	const digits = rearranged.replace(/[A-Z]/g, (char) => String(char.charCodeAt(0) - 55));
	let remainder = 0;
	for (const digit of digits) remainder = (remainder * 10 + Number(digit)) % 97;
	return remainder === 1;
}

export const settingsSchema = z.object({
	avatarColor: z.enum(avatarColorKeys).default('blue'),
	fullName: z.string().trim().max(120, 'too_long').default(''),
	iban: z
		.string()
		.transform((value) => value.replace(/\s+/g, '').toUpperCase())
		.refine((value) => value === '' || validIban(value), 'invalid_iban'),
	taxId: z
		.string()
		.trim()
		.refine((value) => value === '' || /^\d{10}$/.test(value), 'invalid_tax_id'),
	readingsDay: z.coerce
		.number('invalid_number')
		.int('invalid_number')
		.min(1, 'invalid_number')
		.max(28, 'invalid_number'),
	rentDay: z.coerce
		.number('invalid_number')
		.int('invalid_number')
		.min(1, 'invalid_number')
		.max(28, 'invalid_number')
});

export { validIban };
