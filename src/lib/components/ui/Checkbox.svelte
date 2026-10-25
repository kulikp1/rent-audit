<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'type'> & { label: string; hint?: string };

	let { label, hint, class: className = '', ...rest }: Props = $props();
</script>

<label class="flex cursor-pointer items-start gap-3 {className}">
	<input
		type="checkbox"
		class="mt-0.5 size-4 rounded border-line-strong text-primary-ink focus:ring-primary-500/30"
		{...rest}
	/>
	<span>
		<span class="block text-sm font-medium text-ink">{label}</span>
		{#if hint}<span class="mt-0.5 block text-[13px] text-ink-muted">{hint}</span>{/if}
	</span>
</label>
