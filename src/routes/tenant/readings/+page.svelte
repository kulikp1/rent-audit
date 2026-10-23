<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { page } from '$app/state';
	import { CircleCheck, History } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { formatPeriod, formatReading } from '#lib/utils/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const sent = $derived(page.url.searchParams.get('sent') === '1');
	const labels = $derived({
		water: m.meter_water(),
		gas: m.meter_gas(),
		electricity: m.meter_electricity()
	});
</script>

<svelte:head><title>{m.nav_readings_history()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_readings_history()} subtitle={m.tenant_history_subtitle()} />

{#if sent}
	<div
		role="status"
		class="mb-6 flex items-center gap-3 rounded-control border border-success-600/20 bg-success-50 p-3.5 text-sm text-success-700"
	>
		<CircleCheck class="size-5 shrink-0" />
		{m.tenant_readings_sent()}
	</div>
{/if}

<Card padded={false}>
	{#if data.readings.length === 0}
		<EmptyState title={m.reading_empty_title()} text={m.tenant_history_empty()}>
			{#snippet icon()}<History class="size-6" />{/snippet}
		</EmptyState>
	{:else}
		<div class="table-scroll hidden md:block" use:fitViewport>
			<table class="w-full text-left text-sm">
				<thead class="text-xs text-ink-muted uppercase">
					<tr class="border-b border-line">
						<th class="px-5 py-3 font-medium">{m.reading_period()}</th>
						<th class="px-5 py-3 font-medium">{m.reading_meter()}</th>
						<th class="px-5 py-3 text-right font-medium">{m.reading_value()}</th>
						<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.readings as reading (reading.id)}
						<tr>
							<td class="px-5 py-3.5">{formatPeriod(reading.period)}</td>
							<td class="px-5 py-3.5">{labels[reading.meterType]} · {reading.serial}</td>
							<td class="px-5 py-3.5 text-right font-medium tabular-nums"
								>{formatReading(reading.values)}</td
							>
							<td class="px-5 py-3.5">
								<Badge
									tone={reading.status === 'confirmed'
										? 'success'
										: reading.status === 'rejected'
											? 'danger'
											: 'warning'}
								>
									{reading.status === 'confirmed'
										? m.reading_confirmed()
										: reading.status === 'rejected'
											? m.reading_rejected()
											: m.reading_needs_confirmation()}
								</Badge>
								{#if reading.rejectReason}
									<p class="mt-1 text-[13px] text-ink-muted">{reading.rejectReason}</p>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<ul class="divide-y divide-line md:hidden">
			{#each data.readings as reading (reading.id)}
				<li class="p-4">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-medium text-ink">{formatPeriod(reading.period)}</p>
							<p class="mt-0.5 text-[13px] text-ink-muted">
								{labels[reading.meterType]} · {reading.serial}
							</p>
						</div>
						<span class="text-lg font-semibold tabular-nums">{formatReading(reading.values)}</span>
					</div>
					<div class="mt-2">
						<Badge
							tone={reading.status === 'confirmed'
								? 'success'
								: reading.status === 'rejected'
									? 'danger'
									: 'warning'}
						>
							{reading.status === 'confirmed'
								? m.reading_confirmed()
								: reading.status === 'rejected'
									? m.reading_rejected()
									: m.reading_needs_confirmation()}
						</Badge>
						{#if reading.rejectReason}
							<p class="mt-1 text-[13px] text-ink-muted">{reading.rejectReason}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
