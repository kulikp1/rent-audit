import { z } from 'zod';
import { GEMINI_API_KEY, GEMINI_MODEL } from '$app/env/private';

export function geminiConfigured(): boolean {
	return !!GEMINI_API_KEY;
}

export const recognitionSchema = z.object({
	meterType: z.enum(['water', 'gas', 'electricity', 'unknown']),
	serial: z.string().nullable(),
	values: z.array(z.string()),
	legible: z.boolean(),
	confidence: z.number().min(0).max(1)
});

export type Recognition = z.infer<typeof recognitionSchema> & { numbers: number[] };

const PROMPT = [
	'You read utility meters from photos and answer with JSON only.',
	'Identify the meter type: water, gas or electricity. Use "unknown" if the device is not a utility meter.',
	'Read the serial number printed on the device. Use null if it is not visible.',
	'Read the current register value.',
	'For water meters the black digits are cubic metres and the red digits (or digits on a red background) are the fractional part. Combine them as "black.red", for example "00123.456".',
	'For two-tariff electricity meters return two values in order [tariff 1 / day, tariff 2 / night] as shown on the display. For single-tariff meters return one value.',
	'Each value is a plain string made of digits and at most one decimal point, without spaces or units.',
	'Never guess. If the digits cannot be read reliably, set legible to false.',
	'confidence is your certainty from 0 to 1.'
].join(' ');

const RESPONSE_SCHEMA = {
	type: 'OBJECT',
	properties: {
		meter_type: { type: 'STRING', enum: ['water', 'gas', 'electricity', 'unknown'] },
		serial_number: { type: 'STRING', nullable: true },
		values: { type: 'ARRAY', items: { type: 'STRING' } },
		legible: { type: 'BOOLEAN' },
		confidence: { type: 'NUMBER' }
	},
	required: ['meter_type', 'serial_number', 'values', 'legible', 'confidence']
};

export function parseRecognition(text: string): Recognition | null {
	let raw: unknown;
	try {
		raw = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof raw !== 'object' || raw === null) return null;
	const source = raw as Record<string, unknown>;
	const parsed = recognitionSchema.safeParse({
		meterType: source.meter_type,
		serial: typeof source.serial_number === 'string' ? source.serial_number.trim() || null : null,
		values: source.values,
		legible: source.legible,
		confidence: source.confidence
	});
	if (!parsed.success) return null;
	const numbers = parsed.data.values.map((value) =>
		Number(value.replace(',', '.').replace(/\s+/g, ''))
	);
	if (numbers.some((value) => !Number.isFinite(value) || value < 0)) {
		return { ...parsed.data, legible: false, numbers: [] };
	}
	return { ...parsed.data, numbers };
}

export class AiUnavailableError extends Error {}

export async function recognizeMeter(image: { data: Buffer; mime: string }): Promise<Recognition> {
	if (!geminiConfigured()) throw new AiUnavailableError('gemini_not_configured');
	let response: Response;
	try {
		response = await fetch(
			`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
			{
				method: 'POST',
				headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
				body: JSON.stringify({
					contents: [
						{
							parts: [
								{ text: PROMPT },
								{ inline_data: { mime_type: image.mime, data: image.data.toString('base64') } }
							]
						}
					],
					generationConfig: {
						temperature: 0,
						responseMimeType: 'application/json',
						responseSchema: RESPONSE_SCHEMA
					}
				}),
				signal: AbortSignal.timeout(25_000)
			}
		);
	} catch {
		throw new AiUnavailableError('gemini_unreachable');
	}
	if (!response.ok) throw new AiUnavailableError(`gemini_http_${response.status}`);
	const body = (await response.json()) as {
		candidates?: { content?: { parts?: { text?: string }[] } }[];
	};
	const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
	const recognition = text ? parseRecognition(text) : null;
	if (!recognition) throw new AiUnavailableError('gemini_bad_response');
	return recognition;
}
