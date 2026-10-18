<script lang="ts">
	import { Droplets, Flame, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatReading } from '#lib/utils/format.js';

	type Props = {
		type: 'water' | 'gas' | 'electricity';
		serial: string;
		previous?: number[];
	};

	let { type, serial, previous }: Props = $props();

	const icons = { water: Droplets, gas: Flame, electricity: Zap };
	const tones = {
		water: 'bg-info-50 text-info-600',
		gas: 'bg-warning-50 text-warning-600',
		electricity: 'bg-primary-50 text-primary-600'
	};
	const Icon = $derived(icons[type]);
	const title = $derived(
		{ water: m.meter_water(), gas: m.meter_gas(), electricity: m.meter_electricity() }[type]
	);
</script>

<div class="flex items-start gap-4">
	<span class="grid size-10 shrink-0 place-items-center rounded-control {tones[type]}">
		<Icon class="size-5" />
	</span>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-baseline justify-between gap-x-4">
			<p class="font-semibold">{title}</p>
			<p class="text-[13px] text-ink-muted">{m.meter_serial_short({ serial })}</p>
		</div>
		{#if previous && previous.length > 0}
			<p class="mt-0.5 text-[13px] text-ink-muted">
				{m.reading_previous({ value: formatReading(previous) })}
			</p>
		{/if}
	</div>
</div>
