import { GEMINI_API_KEY, GEMINI_MODEL } from '$app/env/private';
import { callGemini, type Recognition } from './gemini-core';

export { AiUnavailableError, parseRecognition, recognitionSchema } from './gemini-core';
export type { Recognition } from './gemini-core';

export function geminiConfigured(): boolean {
	return !!GEMINI_API_KEY;
}

export function recognizeMeter(image: { data: Buffer; mime: string }): Promise<Recognition> {
	return callGemini({ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL }, image);
}
