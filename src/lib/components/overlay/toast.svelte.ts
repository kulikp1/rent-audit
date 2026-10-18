export type ToastTone = 'success' | 'error' | 'info';

export type ToastItem = { id: number; tone: ToastTone; message: string };

export const toastState = $state<{ items: ToastItem[] }>({ items: [] });

let nextId = 1;

function push(tone: ToastTone, message: string) {
	toastState.items.push({ id: nextId++, tone, message });
}

export function dismissToast(id: number) {
	const index = toastState.items.findIndex((item) => item.id === id);
	if (index >= 0) toastState.items.splice(index, 1);
}

export const toast = {
	success: (message: string) => push('success', message),
	error: (message: string) => push('error', message),
	info: (message: string) => push('info', message)
};
