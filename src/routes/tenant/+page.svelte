<script lang="ts">
	import { Building2, CircleCheck, Droplets, Flame, MapPin, ScanLine, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PriceChangeNotice from '#lib/components/domain/PriceChangeNotice.svelte';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import { postAction } from '#lib/utils/actions.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { formatMoney, formatPeriod, formatReading } from '#lib/utils/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let acking = $state(false);

	async function ack() {
		acking = true;
		const result = await postAction('?/ack');
		acking = false;
		if (result.type === 'success') toast.success(m.price_change_acked());
		else toast.error(m.error_generic());
	}

	const icons = { water: Droplets, gas: Flame, electricity: Zap };
	const labels = $derived({
		water: m.meter_water(),
		gas: m.meter_gas(),
		electricity: m.meter_electricity()
	});
	const waiting = $derived(data.lease ? data.meters.filter((meter) => !meter.submitted).length : 0);
</script>

<svelte:head><title>{m.nav_home()} · {m.app_name()}</title></svelte:head>

{#if !data.lease}
	<Card padded={false}>
		<EmptyState title={m.tenant_no_lease_title()} text={m.tenant_no_lease_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<PageHeader
		title={m.tenant_home_title()}
		subtitle={m.tenant_home_subtitle({ name: data.realtorName })}
	/>

	{#if data.rentChange}
		<div class="mb-6">
			<PriceChangeNotice change={data.rentChange} busy={acking} onack={ack} />
		</div>
	{/if}

	<div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[1.4fr_1fr]">
		<Card>
			<div class="flex items-start justify-between gap-4">
				<div>
					<h2 class="text-base font-semibold">{m.tenant_readings_title()}</h2>
					<p class="mt-1 text-sm text-ink-muted">{formatPeriod(data.period)}</p>
				</div>
				{#if data.meters.length > 0}
					<Badge tone={waiting === 0 ? 'success' : 'warning'}>
						{waiting === 0
							? m.tenant_readings_done()
							: m.tenant_readings_waiting({ count: waiting })}
					</Badge>
				{/if}
			</div>

			{#if data.meters.length === 0}
				<p class="mt-5 text-sm text-ink-muted">{m.tenant_no_meters()}</p>
			{:else}
				<ul class="mt-5 divide-y divide-line">
					{#each data.meters as meter (meter.id)}
						{@const Icon = icons[meter.type]}
						<li class="flex items-center justify-between gap-4 py-3">
							<div class="flex items-center gap-3">
								<span
									class="grid size-9 place-items-center rounded-control bg-surface-muted text-ink-soft"
								>
									<Icon class="size-[18px]" />
								</span>
								<div>
									<p class="text-sm font-medium">{labels[meter.type]}</p>
									<p class="text-[13px] text-ink-muted">
										{m.reading_previous({ value: formatReading(meter.last) })}
									</p>
								</div>
							</div>
							{#if meter.submitted}
								<CircleCheck class="size-5 text-success-600" />
							{:else if meter.rejectReason}
								<Badge tone="danger">{m.reading_rejected()}</Badge>
							{/if}
						</li>
					{/each}
				</ul>
				{#if waiting > 0}
					<div class="mt-5">
						<Button href="/tenant/readings/new">
							{#snippet icon()}<ScanLine class="size-4" />{/snippet}
							{m.tenant_submit_readings()}
						</Button>
					</div>
				{/if}
			{/if}
		</Card>

		<div class="space-y-6">
			<Card>
				<div class="flex items-center justify-between">
					<h2 class="text-base font-semibold">{m.tenant_invoices_due()}</h2>
					{#if data.openInvoices.overdue}<Badge tone="danger">{m.invoice_status_overdue()}</Badge
						>{/if}
				</div>
				{#if data.openInvoices.count === 0}
					<p class="mt-3 text-sm text-ink-muted">{m.tenant_invoices_none()}</p>
				{:else}
					<p class="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
						{formatMoney(data.openInvoices.total)}
					</p>
					<p class="mt-1 text-sm text-ink-muted">
						{m.tenant_invoices_count({ count: data.openInvoices.count })}
					</p>
					<div class="mt-4">
						<Button href="/tenant/invoices" variant="secondary">{m.tenant_invoices_open()}</Button>
					</div>
				{/if}
			</Card>

			<Card>
				<h2 class="text-base font-semibold">{m.tenant_apartment_title()}</h2>
				<p class="mt-3 font-medium">{data.apartment.name}</p>
				{#if data.apartment.address}
					<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
						<MapPin class="size-3.5" />
						{data.apartment.address}
					</p>
				{/if}
				<div class="mt-5 border-t border-line pt-4">
					<p class="text-sm text-ink-muted">{m.apt_rent()}</p>
					<p class="mt-1 text-2xl font-semibold tabular-nums">
						{formatMoney(data.apartment.rentAmount)}
					</p>
				</div>
			</Card>
		</div>
	</div>
{/if}
