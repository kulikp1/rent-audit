<script lang="ts">
	import { ChartColumn, Droplet, Flame, Zap } from '@lucide/svelte';
	import { fitViewport } from '#lib/utils/fit.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { StatsView } from '#lib/server/billing/stats.js';
	import { formatPeriod, formatPeriodShort } from '#lib/utils/format.js';
	import { formatQuantity, serviceLabel, unitLabel } from '#lib/utils/invoice.js';
	import Card from '../ui/Card.svelte';
	import EmptyState from '../ui/EmptyState.svelte';
	import AnomalyReasons from './AnomalyReasons.svelte';
	import ConsumptionChart from './ConsumptionChart.svelte';

	let { stats }: { stats: StatsView[] } = $props();

	let range = $state('12');
	let chosen = $state('');

	const rangeOptions = $derived([
		{ value: '6', label: m.stats_range_6() },
		{ value: '12', label: m.stats_range_12() },
		{ value: 'all', label: m.stats_range_all() }
	]);

	const serviceIcons = { water: Droplet, gas: Flame, electricity: Zap };

	const visible = $derived(
		stats.map((item) => ({
			...item,
			points: range === 'all' ? item.points : item.points.slice(-Number(range))
		}))
	);

	const active = $derived(
		visible.find((item) => item.service === chosen) ??
			visible.find((item) => item.points.some((point) => point.reasons.length > 0)) ??
			visible[0]
	);

	const flagged = $derived(active?.points.filter((point) => point.reasons.length > 0) ?? []);
	const total = $derived(active?.points.reduce((sum, point) => sum + point.value, 0) ?? 0);
	const average = $derived(active && active.points.length > 0 ? total / active.points.length : 0);
	const peak = $derived(
		active?.points.reduce<(typeof active.points)[number] | null>(
			(best, point) => (!best || point.value > best.value ? point : best),
			null
		) ?? null
	);

	const unit = $derived(active ? unitLabel(active.unit) : '');

	function anomalyCount(count: number) {
		if (count === 0) return m.stats_tab_no_anomalies();
		const form = new Intl.PluralRules(getLocale() === 'uk' ? 'uk-UA' : 'en-GB').select(count);
		return {
			one: m.stats_tab_anomalies_one,
			few: m.stats_tab_anomalies_few,
			many: m.stats_tab_anomalies_many,
			other: m.stats_tab_anomalies_other,
			zero: m.stats_tab_anomalies_other,
			two: m.stats_tab_anomalies_other
		}[form]({ count });
	}
</script>

{#if stats.length === 0 || !active}
	<Card padded={false}>
		<EmptyState title={m.stats_empty_title()} text={m.stats_empty_text()}>
			{#snippet icon()}<ChartColumn class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-3">
			{#each visible as item (item.service)}
				{@const Icon = serviceIcons[item.service]}
				{@const count = item.points.filter((point) => point.reasons.length > 0).length}
				{@const selected = item.service === active.service}
				<button
					type="button"
					aria-pressed={selected}
					onclick={() => (chosen = item.service)}
					class="flex items-center gap-3 rounded-card border px-4 py-2.5 text-left transition-colors {selected
						? 'border-primary-500 bg-surface ring-1 ring-primary-500'
						: 'border-line bg-surface hover:border-line-strong'}"
				>
					<span
						class="grid size-8 place-items-center rounded-lg {selected
							? 'bg-primary-500 text-white'
							: 'bg-surface-muted text-ink-muted'}"
					>
						<Icon class="size-4" />
					</span>
					<span>
						<span class="block text-sm leading-tight font-semibold text-ink">
							{serviceLabel(item.service)}
						</span>
						<span class="block text-xs {count > 0 ? 'text-danger-ink' : 'text-ink-muted'}">
							{anomalyCount(count)}
						</span>
					</span>
				</button>
			{/each}
		</div>
		<div
			role="group"
			aria-label={m.stats_range_all()}
			class="inline-flex rounded-full border border-line bg-surface p-1 text-[13px] font-semibold"
		>
			{#each rangeOptions as option (option.value)}
				<button
					type="button"
					aria-pressed={range === option.value}
					onclick={() => (range = option.value)}
					class="rounded-full px-4 py-2 transition-colors {range === option.value
						? 'bg-primary-500 text-white'
						: 'text-ink-muted hover:text-ink'}"
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
		<Card class="p-5" padded={false}>
			<div class="mb-4 flex items-baseline justify-between">
				<h2 class="text-base font-semibold">{serviceLabel(active.service)}</h2>
				<span class="font-mono text-xs text-ink-muted">{unit}</span>
			</div>
			<ConsumptionChart
				name={serviceLabel(active.service)}
				{unit}
				labels={active.points.map((point) => formatPeriodShort(point.period))}
				values={active.points.map((point) => point.value)}
				anomalies={active.points.map((point) => point.reasons.length > 0)}
			/>
		</Card>

		<div class="space-y-3">
			<div class="grid grid-cols-2 gap-3">
				{#each [{ label: m.stats_total(), value: formatQuantity(total), hint: unit, hot: false }, { label: m.stats_avg(), value: formatQuantity(Math.round(average * 10) / 10), hint: unit, hot: false }, { label: m.stats_max(), value: peak ? formatQuantity(peak.value) : '—', hint: peak ? formatPeriod(peak.period) : '', hot: !!peak && peak.reasons.length > 0 }, { label: m.stats_anomalies_count(), value: String(flagged.length), hint: m.stats_to_review(), hot: flagged.length > 0 }] as tile (tile.label)}
					<div class="rounded-card border border-line bg-surface px-4 py-3">
						<p class="text-xs text-ink-muted">{tile.label}</p>
						<p
							class="mt-1 font-mono text-xl font-bold tracking-tight tabular-nums {tile.hot
								? 'text-danger-ink'
								: 'text-ink'}"
						>
							{tile.value}
						</p>
						<p class="text-[11px] text-ink-muted">{tile.hint}</p>
					</div>
				{/each}
			</div>

			{#if flagged.length > 0}
				<Card>
					<h3 class="text-base font-semibold">{m.stats_anomalies_title()}</h3>
					<div class="mt-3 space-y-2.5 overflow-y-auto" use:fitViewport={120}>
						{#each flagged as point (point.period)}
							<div class="rounded-control border border-line bg-canvas p-3">
								<div
									class="flex items-center justify-between gap-2 text-xs font-semibold text-danger-ink"
								>
									<span>{formatPeriod(point.period)}</span>
									<span class="font-mono">{formatQuantity(point.value)} {unit}</span>
								</div>
								<div class="mt-1.5 text-[13px]">
									<AnomalyReasons reasons={point.reasons} {unit} showBadge={false} />
								</div>
							</div>
						{/each}
					</div>
				</Card>
			{/if}
		</div>
	</div>
{/if}
