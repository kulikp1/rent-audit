<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		text,
		icon,
		action
	}: { title: string; text?: string; icon?: Snippet; action?: Snippet } = $props();
</script>

<div class="flex flex-col items-center px-6 py-14 text-center">
	{#if icon}
		<div class="mb-4 grid size-12 place-items-center rounded-full bg-primary-50 text-primary-ink">
			{@render icon()}
		</div>
	{/if}
	<h3 class="text-base font-semibold text-ink">{title}</h3>
	{#if text}<p class="mt-1.5 max-w-sm text-sm text-ink-muted">{text}</p>{/if}
	{#if action}<div class="mt-5">{@render action()}</div>{/if}
</div>
