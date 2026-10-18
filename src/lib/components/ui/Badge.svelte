<script lang="ts">
	import type { Snippet } from 'svelte';

	type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

	let { tone = 'neutral', children }: { tone?: Tone; children: Snippet } = $props();

	const tones: Record<Tone, string> = {
		neutral: 'bg-surface-muted text-ink-soft',
		success: 'bg-success-50 text-success-700',
		warning: 'bg-warning-50 text-warning-700',
		danger: 'bg-danger-50 text-danger-700',
		info: 'bg-info-50 text-info-700'
	};
</script>

<span
	class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap {tones[
		tone
	]}"
>
	{@render children()}
</span>
