<script lang="ts">
	import {
		ArrowRight,
		Building2,
		Camera,
		CircleCheck,
		Copy,
		Droplets,
		Flame,
		MapPin,
		ScanLine,
		Zap
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { pathTo } from '#lib/utils/path.js';
	import PriceChangeNotice from '#lib/components/domain/PriceChangeNotice.svelte';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import { postAction } from '#lib/utils/actions.js';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { formatDate, formatMoney, formatPeriod, formatReading } from '#lib/utils/format.js';
	import { typeLabel, unitLabel } from '#lib/utils/invoice.js';
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
	const tints = {
		water: 'var(--color-service-water)',
		gas: 'var(--color-service-gas)',
		electricity: 'var(--color-service-electricity)'
	};
	const labels = $derived({
		water: m.meter_water(),
		gas: m.meter_gas(),
		electricity: m.meter_electricity()
	});
	const unitOf = (type: 'water' | 'gas' | 'electricity') =>
		unitLabel(type === 'electricity' ? 'kwh' : 'm3');

	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');
	const total = $derived(data.lease ? data.meters.length : 0);
	const waiting = $derived(data.lease ? data.meters.filter((meter) => !meter.submitted).length : 0);
	const done = $derived(total - waiting);
	const firstName = $derived(data.user?.name.split(/\s+/)[0] ?? '');

	const RING_RADIUS = 16;
	const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

	const shortDate = (value: string) =>
		new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(new Date(value));

	function monthName(period: string) {
		const [year, month] = period.split('-').map(Number);
		const text = new Intl.DateTimeFormat(intlLocale, { month: 'long' }).format(
			new Date(year!, month! - 1, 1)
		);
		return text.toLocaleLowerCase(intlLocale);
	}

	function groupIban(value: string) {
		return value
			.replace(/\s+/g, '')
			.replace(/(.{4})/g, '$1 ')
			.trim();
	}

	async function copyIban(iban: string) {
		try {
			await navigator.clipboard.writeText(iban);
			toast.success(m.common_copied());
		} catch {
			toast.error(m.error_generic());
		}
	}
</script>

<svelte:head><title>{m.nav_home()} · {m.app_name()}</title></svelte:head>

{#if !data.lease}
	<Card padded={false}>
		<EmptyState title={m.tenant_no_lease_title()} text={m.tenant_no_lease_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<div class="mb-3 flex flex-wrap items-start justify-between gap-3">
		<div>
			<h1 class="text-2xl font-bold tracking-tight text-ink">
				{m.tenant_home_title()}{firstName ? `, ${firstName}` : ''}
			</h1>
			<p class="mt-0.5 text-sm text-ink-muted">
				{m.tenant_home_subtitle({ name: data.realtorName })}
			</p>
		</div>
		{#if total > 0}
			<div class="flex items-center gap-3.5 rounded-card border border-line bg-surface px-4 py-2.5">
				<svg viewBox="0 0 40 40" class="size-9 -rotate-90" fill="none" aria-hidden="true">
					<circle
						cx="20"
						cy="20"
						r={RING_RADIUS}
						stroke="var(--color-line-strong)"
						stroke-width="3.5"
					/>
					<circle
						cx="20"
						cy="20"
						r={RING_RADIUS}
						stroke="var(--color-primary-500)"
						stroke-width="3.5"
						stroke-linecap="round"
						stroke-dasharray="{RING_LENGTH * (done / total)} {RING_LENGTH}"
					/>
				</svg>
				<div>
					<p class="text-xs text-ink-muted">{formatPeriod(data.period)}</p>
					<p class="text-sm font-semibold text-ink">{m.tenant_progress({ done, total })}</p>
				</div>
			</div>
		{/if}
	</div>

	{#if data.rentChange}
		<div class="mb-4">
			<PriceChangeNotice change={data.rentChange} busy={acking} onack={ack} />
		</div>
	{/if}

	<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[1.5fr_1fr]">
		<Card padded={false}>
			<div class="flex items-start justify-between gap-4 px-5 py-4">
				<div>
					<h2 class="text-base font-semibold">{m.tenant_readings_title()}</h2>
					<p class="mt-0.5 text-[13px] text-ink-muted">{formatPeriod(data.period)}</p>
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
				<p class="border-t border-line px-5 py-5 text-sm text-ink-muted">{m.tenant_no_meters()}</p>
			{:else}
				<ul class="divide-y divide-line border-t border-line">
					{#each data.meters as meter (meter.id)}
						{@const Icon = icons[meter.type]}
						<li class="flex items-center justify-between gap-4 px-5 py-3">
							<div class="flex min-w-0 items-center gap-3">
								<span
									class="grid size-10 shrink-0 place-items-center rounded-control"
									style="background-color: color-mix(in srgb, {tints[
										meter.type
									]} 16%, transparent); color: {tints[meter.type]}"
								>
									<Icon class="size-5" />
								</span>
								<div class="min-w-0">
									<p class="flex items-baseline gap-2 text-sm font-semibold">
										{labels[meter.type]}
										<span class=" text-[11px] font-normal text-ink-muted">{meter.serial}</span>
									</p>
									<p class="text-[13px] text-ink-muted">
										{#if meter.submitted && meter.sentAt && meter.sentValues}
											{m.tenant_reading_sent({
												date: shortDate(meter.sentAt),
												value: `${formatReading(meter.sentValues)} ${unitOf(meter.type)}`
											})}
										{:else}
											{m.reading_previous({
												value: `${formatReading(meter.last)} ${unitOf(meter.type)}`
											})}
										{/if}
									</p>
								</div>
							</div>
							{#if meter.submitted}
								<span class="flex items-center gap-2 text-sm font-semibold text-success-ink">
									<CircleCheck class="size-5" />{m.tenant_reading_done()}
								</span>
							{:else}
								<span class="flex items-center gap-3">
									{#if meter.rejectReason}<Badge tone="danger">{m.reading_rejected()}</Badge>{/if}
									<Button href="/tenant/readings/new" variant="secondary" size="sm">
										{#snippet icon()}<Camera class="size-3.5" />{/snippet}
										{m.tenant_take_photo()}
									</Button>
								</span>
							{/if}
						</li>
					{/each}
				</ul>
				{#if waiting > 0}
					<div
						class="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5"
					>
						<p class="text-[13px] text-ink-muted">{m.tenant_readings_hint()}</p>
						<Button href="/tenant/readings/new">
							{#snippet icon()}<ScanLine class="size-4" />{/snippet}
							{m.tenant_submit_readings()}
						</Button>
					</div>
				{/if}
			{/if}
		</Card>

		<div class="space-y-3">
			{#if data.openInvoices.count === 0}
				<Card>
					<h2 class="text-base font-semibold">{m.tenant_invoices_due()}</h2>
					<p class="mt-2 text-sm text-ink-muted">{m.tenant_invoices_none()}</p>
				</Card>
			{:else}
				<div class="relative overflow-hidden rounded-card bg-primary-500 p-4 text-white">
					<span
						class="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full border border-white/20"
					></span>
					<span
						class="pointer-events-none absolute -top-8 -right-8 size-32 rounded-full border border-white/20"
					></span>
					<div class="relative flex items-center justify-between gap-2">
						<h2 class="text-sm font-medium text-white/90">{m.tenant_invoices_due()}</h2>
						{#if data.openInvoices.overdue > 0}
							<span class="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold">
								{m.tenant_due_overdue_count({ count: data.openInvoices.overdue })}
							</span>
						{/if}
					</div>
					<p class="relative text-2xl font-bold tracking-tight tabular-nums">
						{formatMoney(data.openInvoices.total)}
					</p>
					<div class="relative mt-2.5 space-y-1.5">
						{#each data.openInvoices.items as invoice (invoice.id)}
							<div
								class="flex items-center justify-between gap-3 rounded-control bg-white/15 px-3 py-1.5"
							>
								<div class="min-w-0">
									<p class="truncate text-[13px] font-semibold">
										{typeLabel(invoice.type)} · {monthName(invoice.period)}
									</p>
									{#if invoice.dueDate}
										<p class="text-xs text-white/80">
											{invoice.status === 'overdue'
												? m.tenant_due_overdue_since({ date: shortDate(invoice.dueDate) })
												: m.invoice_due_until({ date: shortDate(invoice.dueDate) })}
										</p>
									{/if}
								</div>
								<span class=" text-sm font-bold whitespace-nowrap tabular-nums">
									{formatMoney(invoice.total)}
								</span>
							</div>
						{/each}
					</div>
					{#if data.openInvoices.payout}
						{@const payout = data.openInvoices.payout}
						<div
							class="relative mt-2.5 flex items-center justify-between gap-3 rounded-control bg-black/20 px-3 py-2"
						>
							<div class="min-w-0">
								<p class="text-[11px] text-white/75">
									{m.tenant_iban_label({ name: payout.fullName })}
								</p>
								<p class="mt-0.5 text-[11px] font-semibold tracking-wide break-all">
									{groupIban(payout.iban)}
								</p>
							</div>
							<button
								type="button"
								onclick={() => copyIban(payout.iban)}
								class="flex shrink-0 items-center gap-1.5 rounded-control bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-white/90"
							>
								<Copy class="size-3.5" />{m.common_copy()}
							</button>
						</div>
					{/if}
					<a
						href={pathTo('/tenant/invoices')}
						class="relative mt-2.5 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2"
					>
						{m.tenant_invoices_open()}<ArrowRight class="size-3.5" />
					</a>
				</div>
			{/if}

			<Card class="p-4" padded={false}>
				<h2 class="text-sm font-semibold text-ink-muted">{m.tenant_apartment_title()}</h2>
				<p class="mt-1 font-semibold">{data.apartment.name}</p>
				{#if data.apartment.address}
					<p class="mt-0.5 flex items-center gap-1.5 text-[13px] text-ink-muted">
						<MapPin class="size-3.5" />
						{data.apartment.address}
					</p>
				{/if}
				<div class="mt-2.5 grid grid-cols-2 gap-2.5">
					<div class="rounded-control border border-line bg-canvas px-3 py-2">
						<p class="text-[11px] text-ink-muted">{m.apt_rent_label()}</p>
						<p class="mt-1 text-base font-bold tabular-nums">
							{formatMoney(data.apartment.rentAmount)}
						</p>
					</div>
					<div
						class="flex items-center gap-2.5 rounded-control border border-line bg-canvas px-3 py-2"
					>
						<Avatar
							name={data.realtor.name}
							src={data.realtor.picture}
							color={data.realtor.avatarColor}
							size="sm"
						/>
						<div class="min-w-0">
							<p class="text-[11px] text-ink-muted">{m.role_realtor()}</p>
							<p class="truncate text-[13px] font-semibold">{data.realtor.name}</p>
						</div>
					</div>
				</div>
			</Card>
		</div>
	</div>
{/if}
