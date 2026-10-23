<script lang="ts">
	import { Check, ChevronDown } from '@lucide/svelte';

	type Option = { value: string; label: string };

	type Props = {
		options: Option[];
		value?: string;
		name?: string;
		id?: string;
		placeholder?: string;
		invalid?: boolean;
		disabled?: boolean;
		describedby?: string;
		onchange?: (value: string) => void;
	};

	let {
		options,
		value = $bindable(''),
		name,
		id,
		placeholder = '',
		invalid = false,
		disabled = false,
		describedby,
		onchange
	}: Props = $props();

	const uid = $props.id();
	const listId = `select-${uid}`;
	let triggerEl = $state<HTMLButtonElement>();
	let listEl = $state<HTMLDivElement>();
	let open = $state(false);
	let typed = '';
	let typedTimer: ReturnType<typeof setTimeout> | undefined;

	const selected = $derived(options.find((option) => option.value === value));

	function items(): HTMLElement[] {
		return listEl ? [...listEl.querySelectorAll<HTMLElement>('[role=option]')] : [];
	}

	function place() {
		if (!listEl || !triggerEl) return;
		const rect = triggerEl.getBoundingClientRect();
		listEl.style.minWidth = `${rect.width}px`;
		const height = listEl.offsetHeight;
		const below = window.innerHeight - rect.bottom;
		const top = below < height + 12 && rect.top > below ? rect.top - height - 6 : rect.bottom + 6;
		listEl.style.top = `${top}px`;
		listEl.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - listEl.offsetWidth - 8))}px`;
	}

	function handleToggle(event: ToggleEvent) {
		open = event.newState === 'open';
		if (!open) return;
		place();
		const list = items();
		(list.find((el) => el.dataset.value === value) ?? list[0])?.focus();
	}

	function choose(next: string) {
		value = next;
		onchange?.(next);
		listEl?.hidePopover();
		triggerEl?.focus();
	}

	function handleTriggerKeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
			event.preventDefault();
			listEl?.showPopover({ source: triggerEl });
		}
	}

	function handleListKeydown(event: KeyboardEvent) {
		const list = items();
		const index = list.indexOf(document.activeElement as HTMLElement);
		let next = -1;
		if (event.key === 'ArrowDown') next = Math.min(index + 1, list.length - 1);
		else if (event.key === 'ArrowUp') next = Math.max(index - 1, 0);
		else if (event.key === 'Home') next = 0;
		else if (event.key === 'End') next = list.length - 1;
		else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			const current = list[index];
			if (current?.dataset.value !== undefined) choose(current.dataset.value);
			return;
		} else if (event.key === 'Tab') {
			listEl?.hidePopover();
			return;
		} else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
			typed += event.key.toLowerCase();
			clearTimeout(typedTimer);
			typedTimer = setTimeout(() => (typed = ''), 600);
			next = list.findIndex((el) => el.textContent?.trim().toLowerCase().startsWith(typed));
		}
		if (next >= 0) {
			event.preventDefault();
			list[next]?.focus();
			list[next]?.scrollIntoView({ block: 'nearest' });
		}
	}
</script>

{#if name}<input type="hidden" {name} {value} />{/if}

<button
	bind:this={triggerEl}
	{id}
	type="button"
	role="combobox"
	aria-haspopup="listbox"
	aria-expanded={open}
	aria-controls={listId}
	aria-invalid={invalid || undefined}
	aria-describedby={describedby}
	{disabled}
	popovertarget={listId}
	onkeydown={handleTriggerKeydown}
	class="flex h-10 w-full items-center justify-between gap-2 rounded-control border bg-surface px-3 text-left text-base shadow-sm transition-colors focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted sm:text-sm {invalid
		? 'border-danger-600 focus:ring-danger-600/20'
		: 'border-line-strong focus:border-primary-500 focus:ring-primary-500/20'}"
>
	<span class={selected ? 'truncate text-ink' : 'truncate text-ink-faint'}>
		{selected?.label ?? placeholder}
	</span>
	<ChevronDown class="size-4 shrink-0 text-ink-faint" />
</button>

<div
	bind:this={listEl}
	id={listId}
	popover="auto"
	role="listbox"
	tabindex="-1"
	ontoggle={handleToggle}
	onkeydown={handleListKeydown}
	class="fixed m-0 max-h-64 overflow-y-auto rounded-card border border-line bg-surface p-1.5 shadow-pop [&:popover-open]:animate-pop-in"
>
	{#each options as option (option.value)}
		{@const active = option.value === value}
		<button
			type="button"
			role="option"
			tabindex="-1"
			aria-selected={active}
			data-value={option.value}
			onclick={() => choose(option.value)}
			class="flex w-full cursor-pointer items-center justify-between gap-6 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-surface-muted focus:bg-surface-muted focus:outline-none {active
				? 'font-medium text-primary-700'
				: 'text-ink'}"
		>
			{option.label}
			{#if active}<Check class="size-4 text-primary-600" />{/if}
		</button>
	{/each}
</div>
