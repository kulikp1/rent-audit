<script lang="ts">
	import type { PageProps } from './$types';
	import { Building2, ScanSearch, Receipt, TriangleAlert, Plus } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import AnomalyReasons from '#lib/components/domain/AnomalyReasons.svelte';
	import { formatPeriod } from '#lib/utils/format.js';
	import { pathTo } from '#lib/utils/path.js';
	import { serviceLabel, unitLabel } from '#lib/utils/invoice.js';

	let { data }: PageProps = $props();

	const stats = $derived([
		{
			label: m.stat_apartments(),
			value: data.stats.apartments,
			icon: Building2,
			tone: 'bg-primary-50 text-primary-600'
		},
		{
			label: m.stat_readings_pending(),
			value: data.stats.pendingReadings,
			icon: ScanSearch,
			tone: 'bg-warning-50 text-warning-600'
		},
		{
			label: m.stat_invoices_unpaid(),
			value: data.stats.unpaidInvoices,
			icon: Receipt,
			tone: 'bg-info-50 text-info-600'
		},
		{
			label: m.stat_anomalies(),
			value: data.stats.anomalies,
			icon: TriangleAlert,
			tone: 'bg-danger-50 text-danger-600'
		}
	]);
</script>

<svelte:head><title>{m.realtor_dashboard_title()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.realtor_dashboard_title()} subtitle={m.realtor_dashboard_subtitle()} />

<div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
	{#each stats as stat (stat.label)}
		<Card>
			<div class="flex items-start justify-between gap-2">
				<p class="min-h-10 text-[13px] leading-snug text-ink-muted sm:text-sm">{stat.label}</p>
				<span class="grid size-9 place-items-center rounded-control {stat.tone}">
					<stat.icon class="size-[18px]" />
				</span>
			</div>
			<p class="mt-2 text-3xl font-semibold tracking-tight tabular-nums sm:mt-3">{stat.value}</p>
		</Card>
	{/each}
</div>

{#if data.anomalies.length > 0}
	<Card class="mt-6">
		<h2 class="text-base font-semibold">{m.dashboard_anomalies_title()}</h2>
		<div class="mt-4 divide-y divide-line">
			{#each data.anomalies as item (item.apartmentId + item.service)}
				<div class="py-4 first:pt-0 last:pb-0">
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<p class="text-sm font-medium">
							{item.apartmentName} · {serviceLabel(item.service)}
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
				</div>
			{/each}
		</div>
	</Card>
{/if}

{#if data.stats.apartments === 0}
	<Card class="mt-6" padded={false}>
		<EmptyState title={m.empty_apartments_title()} text={m.empty_apartments_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
			{#snippet action()}
				<Button href="/realtor/apartments">
					{#snippet icon()}<Plus class="size-4" />{/snippet}
					{m.empty_apartments_title()}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}
