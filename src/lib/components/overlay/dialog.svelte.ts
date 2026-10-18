export type ConfirmOptions = {
	title: string;
	description?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: 'default' | 'danger';
	reason?: { label: string; required?: boolean };
};

export type ConfirmResult = { confirmed: boolean; reason: string };

export type PendingConfirm = ConfirmOptions & { resolve: (result: ConfirmResult) => void };

export const dialogState = $state<{ queue: PendingConfirm[] }>({ queue: [] });

function ask(options: ConfirmOptions): Promise<ConfirmResult> {
	return new Promise((resolve) => {
		dialogState.queue.push({ ...options, resolve });
	});
}

export const dialog = {
	async confirm(options: Omit<ConfirmOptions, 'reason'>): Promise<boolean> {
		return (await ask(options)).confirmed;
	},
	async confirmWithReason(
		options: ConfirmOptions & { reason: NonNullable<ConfirmOptions['reason']> }
	): Promise<string | null> {
		const result = await ask(options);
		return result.confirmed ? result.reason : null;
	}
};
