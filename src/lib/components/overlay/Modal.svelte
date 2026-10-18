<script lang="ts">
	import type { Snippet } from 'svelte';
	import { X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	type Props = {
		open: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		dismissible?: boolean;
		busy?: boolean;
		beforeClose?: () => boolean | Promise<boolean>;
		onclose?: () => void;
		onconfirm?: () => void;
		children?: Snippet;
		footer?: Snippet;
	};

	let {
		open = $bindable(false),
		title,
		description,
		size = 'md',
		dismissible = true,
		busy = false,
		beforeClose,
		onclose,
		onconfirm,
		children,
		footer
	}: Props = $props();

	let dialogEl = $state<HTMLDialogElement>();
	let opener: Element | null = null;
	const titleId = $props.id();

	const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' };

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			opener = document.activeElement;
			dialogEl.showModal();
			const target = dialogEl.querySelector<HTMLElement>(
				'[data-autofocus], input:not([type=hidden]), textarea, select'
			);
			target?.focus();
		} else if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	async function requestClose() {
		if (busy) return;
		if (beforeClose && !(await beforeClose())) return;
		open = false;
		onclose?.();
	}

	function handleCancel(event: Event) {
		event.preventDefault();
		void requestClose();
	}

	function handleClose() {
		open = false;
		if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
		opener = null;
	}

	function handleBackdrop(event: MouseEvent) {
		if (event.target === dialogEl && dismissible) void requestClose();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key !== 'Enter' || !onconfirm || busy || event.defaultPrevented || event.isComposing)
			return;
		const target = event.target as HTMLElement;
		const tag = target.tagName;
		if (tag === 'BUTTON' || tag === 'A' || tag === 'SELECT') return;
		if (tag === 'TEXTAREA' && !(event.ctrlKey || event.metaKey)) return;
		event.preventDefault();
		onconfirm();
	}
</script>

<dialog
	bind:this={dialogEl}
	aria-labelledby={titleId}
	oncancel={handleCancel}
	onclose={handleClose}
	onclick={handleBackdrop}
	onkeydown={handleKeydown}
	class="m-auto w-[calc(100%-2rem)] {widths[
		size
	]} rounded-dialog border border-line bg-surface p-0 text-ink shadow-dialog backdrop:bg-ink/40 backdrop:backdrop-blur-[2px] open:animate-pop-in"
>
	<div class="flex max-h-[calc(100dvh-4rem)] flex-col">
		<header class="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
			<div>
				<h2 id={titleId} class="text-lg font-semibold tracking-tight">{title}</h2>
				{#if description}<p class="mt-1 text-sm text-ink-muted">{description}</p>{/if}
			</div>
			<button
				type="button"
				onclick={requestClose}
				disabled={busy}
				aria-label={m.common_close()}
				class="-mt-1 -mr-2 grid size-9 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-40"
			>
				<X class="size-5" />
			</button>
		</header>
		{#if children}
			<div class="overflow-y-auto px-6 py-2">{@render children()}</div>
		{/if}
		{#if footer}
			<footer class="flex items-center justify-end gap-2 px-6 pt-4 pb-5">{@render footer()}</footer>
		{:else}
			<div class="pb-3"></div>
		{/if}
	</div>
</dialog>
