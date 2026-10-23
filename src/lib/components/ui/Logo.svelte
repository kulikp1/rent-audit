<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let {
		size = 'md',
		inverted = false,
		compact = false
	}: { size?: 'md' | 'lg'; inverted?: boolean; compact?: boolean } = $props();
</script>

<span class="inline-flex items-center gap-2.5">
	<span
		class="grid place-items-center rounded-[10px] bg-primary-600 text-white shadow-sm {size === 'lg'
			? 'size-11'
			: 'size-9'}"
	>
		<svg
			viewBox="0 0 24 24"
			class={size === 'lg' ? 'size-6' : 'size-5'}
			fill="none"
			aria-hidden="true"
		>
			<path
				d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1v-7.5Z"
				fill="currentColor"
			/>
			<circle cx="12" cy="11.5" r="1.6" fill="var(--color-primary-600)" />
		</svg>
	</span>
	{#if !compact}<span
			class="font-semibold tracking-tight {size === 'lg' ? 'text-xl' : 'text-[17px]'} {inverted
				? 'text-white'
				: 'text-ink'}">{m.app_name()}</span
		>{/if}
</span>
