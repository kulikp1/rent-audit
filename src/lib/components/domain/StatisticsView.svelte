<script lang="ts">
	import { ChartColumn } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { StatsView } from '#lib/server/billing/stats.js';
	import { formatPeriod, formatPeriodShort } from '#lib/utils/format.js';
	import { serviceLabel, unitLabel } from '#lib/utils/invoice.js';
	import Card from '../ui/Card.svelte';
	import EmptyState from '../ui/EmptyState.svelte';
	import Select from '../ui/Select.svelte';
	import AnomalyReasons from './AnomalyReasons.svelte';
	import ConsumptionChart from './ConsumptionChart.svelte';

	let { stats }: { stats: StatsView[] } = $props();

	let range = $state('12');

	const rangeOptions = $derived([
		{ value: '6', label: m.stats_range_6() },
		{ value: '12', label: m.stats_range_12() },
		{ value: 'all', label: m.stats_range_all() }
	]);

	const visible = $derived(
		stats.map((item) => ({
			...item,
			points: range === 'all' ? item.points : item.points.slice(-Number(range))
		}))
	);
</script>

{#if stats.length === 0}
	<Card padded={false}>
		<EmptyState title={m.stats_empty_title()} text={m.stats_empty_text()}>
			{#snippet icon()}<ChartColumn class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<div class="mb-4 flex justify-end">
		<div class="w-48"><Select bind:value={range} options={rangeOptions} /></div>
	</div>
	<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-2">
		{#each visible as item (item.service)}
			{@const flagged = item.points.filter((point) => point.reasons.length > 0)}
			<Card>
				<div class="mb-4 flex items-baseline justify-between">
					<h2 class="text-base font-semibold">{serviceLabel(item.service)}</h2>
					<span class="text-sm text-ink-muted">{unitLabel(item.unit)}</span>
				</div>
				<ConsumptionChart
					name={serviceLabel(item.service)}
					unit={unitLabel(item.unit)}
					labels={item.points.map((point) => formatPeriodShort(point.period))}
					values={item.points.map((point) => point.value)}
					anomalies={item.points.map((point) => point.reasons.length > 0)}
				/>
				{#if flagged.length > 0}
					<div class="mt-5 space-y-4 border-t border-line pt-5">
						{#each flagged as point (point.period)}
							<AnomalyReasons
								reasons={point.reasons}
								unit={unitLabel(item.unit)}
								period={formatPeriod(point.period)}
							/>
						{/each}
					</div>
				{/if}
			</Card>
		{/each}
	</div>
{/if}
