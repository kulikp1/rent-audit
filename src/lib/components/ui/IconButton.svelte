<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type Props = Omit<HTMLButtonAttributes, 'children'> & {
		label: string;
		tone?: 'default' | 'danger';
		children: Snippet;
	};

	let {
		label,
		tone = 'default',
		children,
		class: className = '',
		type = 'button',
		...rest
	}: Props = $props();
</script>

<button
	{type}
	aria-label={label}
	title={label}
	class="grid size-9 place-items-center rounded-control transition-colors disabled:cursor-not-allowed disabled:opacity-40 {tone ===
	'danger'
		? 'text-ink-muted hover:bg-danger-50 hover:text-danger-600'
		: 'text-ink-muted hover:bg-surface-muted hover:text-ink'} {className}"
	{...rest}
>
	{@render children()}
</button>
