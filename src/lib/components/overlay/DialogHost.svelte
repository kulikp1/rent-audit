<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Button from '../ui/Button.svelte';
	import Modal from './Modal.svelte';
	import { dialogState } from './dialog.svelte';

	const current = $derived(dialogState.queue[0]);
	let open = $state(false);
	let reason = $state('');
	let activeId = $state<object | null>(null);

	$effect(() => {
		if (current && activeId !== current) {
			activeId = current;
			reason = '';
			open = true;
		}
	});

	const danger = $derived(current?.tone === 'danger');
	const reasonMissing = $derived(!!current?.reason?.required && reason.trim().length === 0);

	function finish(confirmed: boolean) {
		if (!current) return;
		if (confirmed && reasonMissing) return;
		const pending = current;
		open = false;
		activeId = null;
		dialogState.queue.shift();
		pending.resolve({ confirmed, reason: reason.trim() });
	}
</script>

{#if current}
	<Modal
		bind:open
		size="sm"
		title={current.title}
		description={current.description}
		dismissible={!danger && !current.reason}
		onclose={() => finish(false)}
		onconfirm={() => finish(true)}
	>
		{#if current.reason}
			<label class="mt-2 block text-sm font-medium text-ink-soft" for="confirm-reason">
				{current.reason.label}
			</label>
			<textarea
				id="confirm-reason"
				bind:value={reason}
				rows="3"
				data-autofocus
				class="mt-1.5 w-full rounded-control border-line-strong text-sm focus:border-primary-500 focus:ring-primary-500"
			></textarea>
		{/if}
		{#snippet footer()}
			<button
				type="button"
				data-autofocus={danger ? '' : undefined}
				class="inline-flex h-10 items-center rounded-control border border-line-strong bg-surface px-4 text-sm font-medium text-ink shadow-sm transition-colors hover:bg-surface-muted"
				onclick={() => finish(false)}
			>
				{current.cancelLabel ?? m.common_cancel()}
			</button>
			<Button
				variant={danger ? 'danger' : 'primary'}
				disabled={reasonMissing}
				data-autofocus={!danger && !current.reason ? '' : undefined}
				onclick={() => finish(true)}
			>
				{current.confirmLabel ?? m.common_confirm()}
			</Button>
		{/snippet}
	</Modal>
{/if}
