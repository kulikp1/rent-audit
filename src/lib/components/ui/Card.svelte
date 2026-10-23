<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		class: className = '',
		padded = true
	}: { children: Snippet; class?: string; padded?: boolean } = $props();
</script>

<div
	class="min-w-0 rounded-card border border-line bg-surface shadow-card {padded
		? 'p-5'
		: ''} {className}"
>
	{@render children()}
</div>
