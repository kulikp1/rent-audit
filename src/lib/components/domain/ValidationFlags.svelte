<script lang="ts">
	import { TriangleAlert } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { flags }: { flags: string[] } = $props();

	function text(flag: string) {
		return (
			{
				lower_than_previous: m.flag_lower_than_previous(),
				digits_mismatch: m.flag_digits_mismatch(),
				type_mismatch: m.flag_type_mismatch(),
				serial_mismatch: m.flag_serial_mismatch(),
				unrealistic_growth: m.flag_unrealistic_growth(),
				unreadable: m.flag_unreadable()
			}[flag] ?? flag
		);
	}
</script>

{#if flags.length > 0}
	<ul class="space-y-2">
		{#each flags as flag (flag)}
			<li
				class="flex items-start gap-2.5 rounded-control bg-warning-50 px-3 py-2 text-sm text-warning-700"
			>
				<TriangleAlert class="mt-0.5 size-4 shrink-0" />
				{text(flag)}
			</li>
		{/each}
	</ul>
{/if}
