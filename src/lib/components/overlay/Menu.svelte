<script lang="ts" module>
	import type { Component } from 'svelte';

	export type MenuItem = {
		label: string;
		icon?: Component<{ class?: string }>;
		tone?: 'default' | 'danger';
		onselect?: () => void;
		href?: string;
	};
</script>

<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import type { Snippet } from 'svelte';

	type Props = {
		items: MenuItem[];
		label: string;
		trigger: Snippet;
		triggerClass?: string;
		align?: 'start' | 'end';
	};

	let { items, label, trigger, triggerClass = '', align = 'end' }: Props = $props();

	const id = $props.id();
	let popoverEl = $state<HTMLDivElement>();
	let triggerEl = $state<HTMLButtonElement>();
	let typed = '';
	let typedTimer: ReturnType<typeof setTimeout> | undefined;

	function entries(): HTMLElement[] {
		return popoverEl ? [...popoverEl.querySelectorAll<HTMLElement>('[role=menuitem]')] : [];
	}

	function place() {
		if (!popoverEl || !triggerEl) return;
		const rect = triggerEl.getBoundingClientRect();
		const width = popoverEl.offsetWidth;
		const left = align === 'end' ? rect.right - width : rect.left;
		popoverEl.style.top = `${rect.bottom + 6}px`;
		popoverEl.style.left = `${Math.max(8, Math.min(left, window.innerWidth - width - 8))}px`;
	}

	function handleToggle(event: ToggleEvent) {
		if (event.newState !== 'open') return;
		place();
		entries()[0]?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		const list = entries();
		const index = list.indexOf(document.activeElement as HTMLElement);
		let next = -1;
		if (event.key === 'ArrowDown') next = (index + 1) % list.length;
		else if (event.key === 'ArrowUp') next = (index - 1 + list.length) % list.length;
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = list.length - 1;
		else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
			typed += event.key.toLowerCase();
			clearTimeout(typedTimer);
			typedTimer = setTimeout(() => (typed = ''), 600);
			next = list.findIndex((el) => el.textContent?.trim().toLowerCase().startsWith(typed));
		}
		if (next >= 0) {
			event.preventDefault();
			list[next]?.focus();
		}
	}

	function select(item: MenuItem) {
		popoverEl?.hidePopover();
		item.onselect?.();
	}
</script>

<button
	bind:this={triggerEl}
	type="button"
	popovertarget={id}
	aria-label={label}
	aria-haspopup="menu"
	class={triggerClass}
>
	{@render trigger()}
</button>

<div
	{id}
	bind:this={popoverEl}
	popover="auto"
	role="menu"
	aria-label={label}
	tabindex="-1"
	ontoggle={handleToggle}
	onkeydown={handleKeydown}
	class="fixed m-0 min-w-52 rounded-card border border-line bg-surface p-1.5 shadow-pop [&:popover-open]:animate-pop-in"
>
	{#each items as item (item.label)}
		{@const danger = item.tone === 'danger'}
		{#if item.href}
			<a
				role="menuitem"
				href={pathTo(item.href)}
				onclick={() => popoverEl?.hidePopover()}
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none {danger
					? 'text-danger-ink hover:bg-danger-50 focus:bg-danger-50'
					: 'text-ink hover:bg-surface-muted focus:bg-surface-muted'}"
			>
				{#if item.icon}<item.icon class="size-4 opacity-70" />{/if}
				{item.label}
			</a>
		{:else}
			<button
				type="button"
				role="menuitem"
				onclick={() => select(item)}
				class="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors focus:outline-none {danger
					? 'text-danger-ink hover:bg-danger-50 focus:bg-danger-50'
					: 'text-ink hover:bg-surface-muted focus:bg-surface-muted'}"
			>
				{#if item.icon}<item.icon class="size-4 opacity-70" />{/if}
				{item.label}
			</button>
		{/if}
	{/each}
</div>
