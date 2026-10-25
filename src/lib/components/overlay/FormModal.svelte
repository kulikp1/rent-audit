<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import Button from '../ui/Button.svelte';
	import Modal from './Modal.svelte';
	import { dialog } from './dialog.svelte.js';
	import { toast } from './toast.svelte.js';

	type FormState = { errors: Record<string, string>; submitting: boolean };

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		action: string;
		submitLabel?: string;
		tone?: 'primary' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		onsuccess?: () => void;
		describeError?: (code: string, detail: string) => string;
		children: Snippet<[FormState]>;
	};

	let {
		open = $bindable(false),
		title,
		description,
		action,
		submitLabel,
		tone = 'primary',
		size = 'md',
		onsuccess,
		describeError,
		children
	}: Props = $props();

	const uid = $props.id();
	const formId = `form-${uid}`;
	let formEl = $state<HTMLFormElement>();
	let submitting = $state(false);
	let dirty = $state(false);
	let errors = $state<Record<string, string>>({});
	let formError = $state('');
	let formDetail = $state('');

	$effect(() => {
		if (open) {
			formEl?.reset();
			dirty = false;
			errors = {};
			formError = '';
			formDetail = '';
		}
	});

	async function confirmDiscard() {
		if (!dirty) return true;
		return dialog.confirm({
			title: m.discard_title(),
			description: m.discard_text(),
			confirmLabel: m.discard_confirm(),
			cancelLabel: m.discard_stay()
		});
	}

	async function cancel() {
		if (await confirmDiscard()) open = false;
	}

	function track(node: HTMLFormElement) {
		const markDirty = () => (dirty = true);
		node.addEventListener('input', markDirty);
		node.addEventListener('keydown', handleKeydown);
		return {
			destroy() {
				node.removeEventListener('input', markDirty);
				node.removeEventListener('keydown', handleKeydown);
			}
		};
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || !(event.ctrlKey || event.metaKey)) return;
		if ((event.target as HTMLElement).tagName !== 'TEXTAREA') return;
		event.preventDefault();
		formEl?.requestSubmit();
	}
</script>

<Modal bind:open {title} {description} {size} busy={submitting} beforeClose={confirmDiscard}>
	<form
		id={formId}
		bind:this={formEl}
		method="POST"
		{action}
		use:track
		use:enhance={() => {
			submitting = true;
			errors = {};
			formError = '';
			formDetail = '';
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'failure') {
					const data = result.data as {
						errors?: Record<string, string>;
						formError?: string;
						detail?: string;
					};
					errors = data?.errors ?? {};
					formError = data?.formError ?? '';
					formDetail = data?.detail ?? '';
					return;
				}
				if (result.type === 'error') {
					toast.error(m.error_generic());
					return;
				}
				dirty = false;
				open = false;
				await update();
				onsuccess?.();
			};
		}}
		class="space-y-4 py-2"
	>
		{#if formError}
			<div role="alert" class="rounded-control bg-danger-50 p-3 text-sm text-danger-ink">
				{describeError ? describeError(formError, formDetail) : formError}
			</div>
		{/if}
		{@render children({ errors, submitting })}
	</form>
	{#snippet footer()}
		<Button variant="secondary" disabled={submitting} onclick={cancel}>
			{m.common_cancel()}
		</Button>
		<Button
			type="submit"
			form={formId}
			variant={tone === 'danger' ? 'danger' : 'primary'}
			loading={submitting}
		>
			{submitLabel ?? m.common_save()}
		</Button>
	{/snippet}
</Modal>
