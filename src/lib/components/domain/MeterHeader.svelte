<script lang="ts">
	import { Droplets, Flame, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatReading } from '#lib/utils/format.js';
	import { unitLabel } from '#lib/utils/invoice.js';

	type Props = {
		type: 'water' | 'gas' | 'electricity';
		serial: string;
		previous?: number[];
	};

	let { type, serial, previous }: Props = $props();

	const icons = { water: Droplets, gas: Flame, electricity: Zap };
	const tints = {
		water: 'var(--color-service-water)',
		gas: 'var(--color-service-gas)',
		electricity: 'var(--color-service-electricity)'
	};
	const unit = $derived(unitLabel(type === 'electricity' ? 'kwh' : 'm3'));
	const Icon = $derived(icons[type]);
	const title = $derived(
		{ water: m.meter_water(), gas: m.meter_gas(), electricity: m.meter_electricity() }[type]
	);
</script>

<div class="flex items-start gap-4">
	<span
		class="grid size-11 shrink-0 place-items-center rounded-control"
		style="background-color: color-mix(in srgb, {tints[type]} 16%, transparent); color: {tints[
			type
		]}"
	>
		<Icon class="size-5" />
	</span>
	<div class="min-w-0 flex-1">
		<div class="flex flex-wrap items-baseline justify-between gap-x-4">
			<p class="text-base font-semibold">{title}</p>
			<p class=" text-[11px] text-ink-muted">{m.meter_serial_short({ serial })}</p>
		</div>
		{#if previous && previous.length > 0}
			<p class="mt-0.5 text-[13px] text-ink-muted">
				{m.reading_previous({ value: `${formatReading(previous)} ${unit}` })}
			</p>
		{/if}
	</div>
</div>
