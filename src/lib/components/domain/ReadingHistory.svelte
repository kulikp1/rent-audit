<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate, formatReading } from '#lib/utils/format.js';

	type Entry = { label: string; values: number[]; reason: string; at: string };

	let { entries }: { entries: Entry[] } = $props();

	function labelText(label: string) {
		return (
			{
				recognized: m.history_recognized(),
				tenant: m.history_tenant(),
				realtor: m.history_realtor(),
				manual: m.history_manual()
			}[label] ?? label
		);
	}
</script>

<ol class="relative space-y-4 border-l border-line pl-5">
	{#each entries as entry, index (index)}
		<li class="relative">
			<span
				class="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-primary-500 ring-4 ring-surface"
			></span>
			<p class="text-sm font-medium text-ink">
				{labelText(entry.label)}
				<span class="ml-1 font-semibold tabular-nums">{formatReading(entry.values)}</span>
			</p>
			<p class="text-[13px] text-ink-muted">{formatDate(entry.at)}</p>
			{#if entry.reason}
				<p class="mt-1 text-sm text-ink-soft">{m.history_reason({ reason: entry.reason })}</p>
			{/if}
		</li>
	{/each}
</ol>
