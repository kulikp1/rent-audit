import { deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import type { ActionResult } from '$app/forms';

export async function postAction(
	action: string,
	data: Record<string, string> = {}
): Promise<ActionResult> {
	const body = new FormData();
	for (const [key, value] of Object.entries(data)) body.set(key, value);
	const response = await fetch(action, {
		method: 'POST',
		body,
		headers: { 'x-sveltekit-action': 'true' }
	});
	const result = deserialize(await response.text());
	if (result.type === 'success' || result.type === 'redirect') await invalidateAll();
	return result;
}
