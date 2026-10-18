<script lang="ts">
	import type { Snippet } from 'svelte';

	type FieldProps = { id: string; invalid: boolean; describedby: string | undefined };

	let {
		label,
		hint,
		error,
		required = false,
		children
	}: {
		label: string;
		hint?: string;
		error?: string;
		required?: boolean;
		children: Snippet<[FieldProps]>;
	} = $props();

	const uid = $props.id();
	const id = `field-${uid}`;
	const describedby = $derived(error ? `${id}-error` : hint ? `${id}-hint` : undefined);
</script>

<div class="space-y-1.5">
	<label for={id} class="block text-sm font-medium text-ink-soft">
		{label}{#if required}<span class="ml-0.5 text-danger-600" aria-hidden="true">*</span>{/if}
	</label>
	{@render children({ id, invalid: !!error, describedby })}
	{#if error}
		<p id="{id}-error" class="text-[13px] text-danger-600">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-[13px] text-ink-muted">{hint}</p>
	{/if}
</div>
