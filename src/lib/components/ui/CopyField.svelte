<script lang="ts">
	import { Check, Copy } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { value, label }: { value: string; label?: string } = $props();

	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	export async function copy() {
		await navigator.clipboard.writeText(value);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex items-center gap-2">
	<input
		readonly
		{value}
		aria-label={label}
		onfocus={(event) => event.currentTarget.select()}
		class="h-10 min-w-0 flex-1 rounded-control border border-line-strong bg-surface-muted px-3 text-base text-ink-soft focus:ring-2 focus:ring-primary-500/20 focus:outline-none sm:text-sm"
	/>
	<button
		type="button"
		data-autofocus
		onclick={copy}
		class="inline-flex h-10 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-medium transition-colors {copied
			? 'bg-success-50 text-success-700'
			: 'bg-primary-600 text-white hover:bg-primary-700'}"
	>
		{#if copied}<Check class="size-4" />{m.common_copied()}{:else}<Copy
				class="size-4"
			/>{m.common_copy()}{/if}
	</button>
</div>
