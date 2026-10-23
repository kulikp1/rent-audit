<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { TriangleAlert } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import AnomalyReasons from '#lib/components/domain/AnomalyReasons.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { formatPeriod } from '#lib/utils/format.js';
	import { serviceLabel, unitLabel } from '#lib/utils/invoice.js';
	import { pathTo } from '#lib/utils/path.js';
	import { rowLink } from '#lib/utils/row-link.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let apartment = $state('all');
	let service = $state('all');

	const apartmentOptions = $derived([
		{ value: 'all', label: m.reading_all_apartments() },
		...data.apartments.map((item) => ({ value: item.id, label: item.name }))
	]);
	const serviceOptions = $derived([
		{ value: 'all', label: m.anomalies_all_services() },
		{ value: 'water', label: m.meter_water() },
		{ value: 'gas', label: m.meter_gas() },
		{ value: 'electricity', label: m.meter_electricity() }
	]);
	const filtered = $derived(
		data.anomalies.filter(
			(item) =>
				(apartment === 'all' || item.apartmentId === apartment) &&
				(service === 'all' || item.service === service)
		)
	);
</script>

<svelte:head><title>{m.nav_anomalies()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_anomalies()} subtitle={m.anomalies_subtitle()} />

<Card padded={false}>
	{#if data.anomalies.length === 0}
		<EmptyState title={m.anomalies_empty_title()} text={m.anomalies_empty_text()}>
			{#snippet icon()}<TriangleAlert class="size-6" />{/snippet}
		</EmptyState>
	{:else}
		<div class="flex flex-wrap gap-3 border-b border-line p-4">
			<div class="w-56"><Select bind:value={apartment} options={apartmentOptions} /></div>
			<div class="w-48"><Select bind:value={service} options={serviceOptions} /></div>
		</div>
		{#if filtered.length === 0}
			<p class="px-6 py-12 text-center text-sm text-ink-muted">{m.apt_nothing_found()}</p>
		{:else}
			<ul class="table-scroll divide-y divide-line" use:fitViewport>
				{#each filtered as item (item.apartmentId + item.service + item.period)}
					<li
						use:rowLink={`/realtor/statistics?apartment=${item.apartmentId}`}
						class="cursor-pointer px-5 py-4 transition-colors hover:bg-surface-muted/60"
					>
						<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
							<p class="flex flex-wrap items-center gap-2 text-sm font-medium">
								{item.apartmentName} · {serviceLabel(item.service)}
								{#if item.recent}<Badge tone="warning">{m.anomalies_recent()}</Badge>{/if}
							</p>
							<a
								href={pathTo(`/realtor/statistics?apartment=${item.apartmentId}`)}
								class="text-[13px] font-medium text-primary-700 hover:underline"
							>
								{m.dashboard_anomalies_open()}
							</a>
						</div>
						<AnomalyReasons
							reasons={item.reasons}
							unit={unitLabel(item.service === 'electricity' ? 'kwh' : 'm3')}
							period={formatPeriod(item.period)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</Card>
