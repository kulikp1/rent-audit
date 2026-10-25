<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import { postAction } from '#lib/utils/actions.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { pathTo } from '#lib/utils/path.js';
	import { Building2, Plus, Receipt, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { formatDate, formatMoney, formatPeriod } from '#lib/utils/format.js';
	import { rowLink } from '#lib/utils/row-link.js';
	import { serviceLabel, statusLabel, statusTone, typeLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let createOpen = $state(false);
	let status = $state('all');
	let busyId = $state('');
	let type = $state('all');
	let apartment = $state('all');
	let newType = $state('utilities');
	let newApartment = $state('');

	const filtered = $derived(
		data.invoices.filter(
			(invoice) =>
				(status === 'all' ||
					(status === 'pending'
						? invoice.status === 'issued' || invoice.status === 'overdue'
						: invoice.status === status)) &&
				(type === 'all' || invoice.type === type) &&
				(apartment === 'all' || invoice.apartmentId === apartment)
		)
	);

	const statusTabs = $derived([
		{ value: 'all', label: m.invoices_filter_all() },
		{ value: 'pending', label: m.invoices_filter_pending() },
		{ value: 'overdue', label: m.invoices_filter_overdue() },
		{ value: 'paid', label: m.invoices_filter_paid() },
		{ value: 'draft', label: m.invoices_filter_draft() },
		{ value: 'cancelled', label: m.invoices_filter_cancelled() }
	]);
	const typeTabs = $derived([
		{ value: 'all', label: m.invoice_all_types() },
		{ value: 'rent', label: m.invoice_type_rent() },
		{ value: 'utilities', label: m.invoice_type_utilities_short() }
	]);

	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');

	function countText(count: number) {
		const form = new Intl.PluralRules(intlLocale).select(count);
		return {
			one: m.invoices_count_one,
			few: m.invoices_count_few,
			many: m.invoices_count_many,
			other: m.invoices_count_other,
			zero: m.invoices_count_other,
			two: m.invoices_count_other
		}[form]({ count });
	}

	function summarize(statuses: string[]) {
		const items = data.invoices.filter((invoice) => statuses.includes(invoice.status));
		return {
			count: items.length,
			total: items.reduce((sum, invoice) => sum + invoice.total, 0),
			tenantPaid: items.filter((invoice) => invoice.tenantPaidAt).length
		};
	}

	const summaryCards = $derived.by(() => {
		const pending = summarize(['issued', 'overdue']);
		const overdue = summarize(['overdue']);
		const paid = summarize(['paid']);
		const draft = summarize(['draft']);
		return [
			{
				filter: 'pending',
				label: m.invoices_card_pending(),
				dot: 'bg-white',
				total: pending.total,
				hint: countText(pending.count),
				primary: true
			},
			{
				filter: 'overdue',
				label: m.invoices_card_overdue(),
				dot: 'bg-danger-ink',
				total: overdue.total,
				hint:
					overdue.tenantPaid > 0
						? m.invoice_tenant_says_paid().toLocaleLowerCase(intlLocale)
						: countText(overdue.count),
				primary: false
			},
			{
				filter: 'paid',
				label: m.invoice_status_paid(),
				dot: 'bg-success-ink',
				total: paid.total,
				hint: countText(paid.count),
				primary: false
			},
			{
				filter: 'draft',
				label: m.invoices_card_draft(),
				dot: 'bg-ink-faint',
				total: draft.total,
				hint: m.invoices_card_draft_hint(),
				primary: false
			}
		];
	});

	const failureTexts: Record<string, () => string> = {
		no_payout: () => m.invoice_error_no_payout(),
		empty: () => m.invoice_error_empty(),
		not_draft: () => m.invoice_error_not_draft(),
		not_open: () => m.invoice_error_not_open()
	};

	function failure(result: { type: string; data?: Record<string, unknown> }) {
		const code = result.type === 'failure' ? String(result.data?.formError) : '';
		toast.error(failureTexts[code]?.() ?? m.error_generic());
	}

	async function issue(invoice: (typeof data.invoices)[number]) {
		const confirmed = await dialog.confirm({
			title: m.invoice_issue_title({ number: invoice.number }),
			description: m.invoice_issue_text({ total: formatMoney(invoice.total) }),
			confirmLabel: m.invoice_issue()
		});
		if (!confirmed) return;
		busyId = invoice.id;
		const result = await postAction(`/realtor/invoices/${invoice.id}?/issue`);
		busyId = '';
		if (result.type === 'success') toast.success(m.invoice_issued_toast());
		else failure(result);
	}

	async function markPaid(invoice: (typeof data.invoices)[number]) {
		const confirmed = await dialog.confirm({
			title: m.invoice_paid_title(),
			description: m.invoice_paid_text(),
			confirmLabel: m.invoice_mark_paid()
		});
		if (!confirmed) return;
		busyId = invoice.id;
		const result = await postAction(`/realtor/invoices/${invoice.id}?/markPaid`);
		busyId = '';
		if (result.type === 'success') toast.success(m.invoice_paid_toast());
		else failure(result);
	}

	const apartmentOptions = $derived([
		{ value: 'all', label: m.reading_all_apartments() },
		...data.apartments.map((item) => ({ value: item.id, label: item.name }))
	]);
	const createTypeOptions = $derived([
		{ value: 'utilities', label: m.invoice_type_utilities() },
		{ value: 'rent', label: m.invoice_type_rent() }
	]);
	const createApartmentOptions = $derived(
		data.apartments.map((item) => ({ value: item.id, label: item.name }))
	);

	function describeError(code: string, detail: string): string {
		return (
			{
				exists: m.invoice_error_exists(),
				no_tenant: m.invoice_error_no_tenant(),
				no_meters: m.invoice_error_no_meters(),
				readings_missing: m.invoice_error_readings_missing({ serial: detail }),
				readings_pending: m.invoice_error_readings_pending({ serial: detail }),
				missing_tariff: m.invoice_error_missing_tariff({
					service: serviceLabel(detail as 'water' | 'gas' | 'electricity')
				}),
				negative_consumption: m.invoice_error_negative({ serial: detail })
			}[code] ?? m.error_generic()
		);
	}

	function openCreate() {
		newApartment = data.apartments[0]?.id ?? '';
		createOpen = true;
	}
</script>

<svelte:head><title>{m.nav_invoices()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_invoices()} subtitle={m.invoices_subtitle()}>
	{#snippet actions()}
		<Button onclick={openCreate} disabled={data.apartments.length === 0}>
			{#snippet icon()}<Plus class="size-4" />{/snippet}
			{m.invoice_create()}
		</Button>
	{/snippet}
</PageHeader>

{#if data.invoices.length === 0}
	<Card padded={false}>
		<EmptyState
			title={m.invoice_empty_title()}
			text={data.apartments.length === 0 ? m.invoice_empty_no_tenants() : m.invoice_empty_text()}
		>
			{#snippet icon()}<Receipt class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
		{#each summaryCards as card (card.filter)}
			<button
				type="button"
				onclick={() => (status = status === card.filter ? 'all' : card.filter)}
				class="rounded-card border px-4 py-3.5 text-left transition-colors {card.primary
					? 'border-primary-500 bg-primary-500 text-white'
					: 'border-line bg-surface hover:border-line-strong'} {status === card.filter &&
				!card.primary
					? 'border-primary-500 ring-1 ring-primary-500'
					: ''}"
			>
				<span
					class="flex items-center gap-2 text-[13px] {card.primary
						? 'text-white/90'
						: 'text-ink-soft'}"
				>
					<span class="size-2 rounded-full {card.dot}"></span>{card.label}
				</span>
				<span class="mt-2 block text-2xl font-bold tracking-tight tabular-nums">
					{formatMoney(card.total)}
				</span>
				<span class="mt-1 block text-xs {card.primary ? 'text-white/80' : 'text-ink-muted'}">
					{card.hint}
				</span>
			</button>
		{/each}
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-3">
		<div
			role="group"
			aria-label={m.apt_status()}
			class="inline-flex flex-wrap rounded-full border border-line bg-surface p-1 text-[13px] font-semibold"
		>
			{#each statusTabs as tab (tab.value)}
				<button
					type="button"
					aria-pressed={status === tab.value}
					onclick={() => (status = tab.value)}
					class="rounded-full px-3.5 py-1.5 transition-colors {status === tab.value
						? 'bg-primary-500 text-white'
						: 'text-ink-muted hover:text-ink'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>
		<div
			role="group"
			aria-label={m.invoice_type()}
			class="inline-flex rounded-full border border-line bg-surface p-1 text-[13px] font-semibold"
		>
			{#each typeTabs as tab (tab.value)}
				<button
					type="button"
					aria-pressed={type === tab.value}
					onclick={() => (type = tab.value)}
					class="rounded-full px-3.5 py-1.5 transition-colors {type === tab.value
						? 'bg-primary-500 text-white'
						: 'text-ink-muted hover:text-ink'}"
				>
					{tab.label}
				</button>
			{/each}
		</div>
		<div class="w-52"><Select bind:value={apartment} options={apartmentOptions} /></div>
	</div>

	<Card class="mt-4" padded={false}>
		{#if filtered.length === 0}
			<p class="px-6 py-12 text-center text-sm text-ink-muted">{m.apt_nothing_found()}</p>
		{:else}
			<div class="table-scroll hidden md:block" use:fitViewport>
				<table class="w-full text-left text-sm">
					<thead class="text-[11px] tracking-wide text-ink-muted uppercase">
						<tr class="border-b border-line">
							<th class="px-5 py-3.5 font-semibold">{m.invoice_number()}</th>
							<th class="px-5 py-3.5 font-semibold">{m.nav_apartments()}</th>
							<th class="px-5 py-3.5 font-semibold">{m.invoice_type()}</th>
							<th class="px-5 py-3.5 font-semibold">{m.reading_period()}</th>
							<th class="px-5 py-3.5 text-right font-semibold">{m.invoice_total()}</th>
							<th class="px-5 py-3.5 font-semibold">{m.apt_status()}</th>
							<th class="px-5 py-3.5"><span class="sr-only">{m.common_actions()}</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each filtered as invoice (invoice.id)}
							{@const cancelled = invoice.status === 'cancelled'}
							<tr
								use:rowLink={`/realtor/invoices/${invoice.id}`}
								class="cursor-pointer transition-colors hover:bg-surface-muted/60 {invoice.status ===
								'overdue'
									? 'bg-danger-50/50'
									: ''} {cancelled ? 'opacity-60' : ''}"
							>
								<td class="px-5 py-3.5 whitespace-nowrap">
									<a
										href={pathTo(`/realtor/invoices/${invoice.id}`)}
										class=" text-[13px] font-bold text-ink hover:text-primary-ink"
									>
										{invoice.number}
									</a>
								</td>
								<td class="px-5 py-3.5 text-ink-soft">{invoice.apartmentName}</td>
								<td class="px-5 py-3.5">
									<span class="flex items-center gap-2.5">
										<span
											class="grid size-7 shrink-0 place-items-center rounded-lg {invoice.type ===
											'rent'
												? 'bg-primary-50 text-primary-ink'
												: 'bg-success-50 text-success-ink'}"
										>
											{#if invoice.type === 'rent'}
												<Building2 class="size-3.5" />
											{:else}
												<Zap class="size-3.5" />
											{/if}
										</span>
										<span class="text-ink-soft">{typeLabel(invoice.type)}</span>
									</span>
								</td>
								<td class="px-5 py-3.5 whitespace-nowrap text-ink-muted">
									{formatPeriod(invoice.period)}
								</td>
								<td
									class="px-5 py-3.5 text-right font-bold whitespace-nowrap tabular-nums {cancelled
										? 'line-through'
										: ''}"
								>
									{formatMoney(invoice.total)}
								</td>
								<td class="px-5 py-3.5">
									<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
									{#if invoice.status === 'issued' && invoice.dueDate}
										<p class="mt-1 text-[12px] text-ink-muted">
											{m.invoice_due_until({ date: formatDate(invoice.dueDate) })}
										</p>
									{/if}
									{#if invoice.tenantPaidAt && invoice.status !== 'paid'}
										<p class="mt-1 text-[12px] text-warning-ink">{m.invoice_tenant_says_paid()}</p>
									{/if}
								</td>
								<td class="px-5 py-3.5 text-right whitespace-nowrap">
									{#if invoice.status === 'draft'}
										<Button
											size="sm"
											loading={busyId === invoice.id}
											disabled={!data.payoutReady}
											title={data.payoutReady ? undefined : m.invoice_error_no_payout()}
											onclick={() => issue(invoice)}
										>
											{m.invoice_issue_short()}
										</Button>
									{:else if invoice.tenantPaidAt && (invoice.status === 'issued' || invoice.status === 'overdue')}
										<Button
											size="sm"
											loading={busyId === invoice.id}
											onclick={() => markPaid(invoice)}
										>
											{m.invoice_mark_paid()}
										</Button>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-line md:hidden">
				{#each filtered as invoice (invoice.id)}
					<li>
						<a
							href={pathTo(`/realtor/invoices/${invoice.id}`)}
							class="block px-4 py-4 active:bg-surface-muted"
						>
							<span class="flex items-start justify-between gap-3">
								<span class="min-w-0">
									<span class="block text-[13px] font-bold text-ink">{invoice.number}</span>
									<span class="mt-0.5 block text-[13px] text-ink-muted">
										{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
									</span>
									<span class="block truncate text-[13px] text-ink-muted"
										>{invoice.apartmentName}</span
									>
								</span>
								<span class=" text-base font-bold whitespace-nowrap tabular-nums">
									{formatMoney(invoice.total)}
								</span>
							</span>
							<span class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
								<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
								{#if invoice.status === 'issued' && invoice.dueDate}
									<span class="text-[12px] text-ink-muted">
										{m.invoice_due_until({ date: formatDate(invoice.dueDate) })}
									</span>
								{/if}
								{#if invoice.tenantPaidAt && invoice.status !== 'paid'}
									<span class="text-[12px] text-warning-ink">{m.invoice_tenant_says_paid()}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
{/if}

<FormModal
	bind:open={createOpen}
	title={m.invoice_create()}
	description={m.invoice_create_text()}
	action="?/create"
	submitLabel={m.common_create()}
	{describeError}
>
	{#snippet children({ errors })}
		{@const texts = errorTexts(errors)}
		<FormField label={m.invoice_type()} error={texts.type} required>
			{#snippet children(field)}
				<Select name="type" bind:value={newType} options={createTypeOptions} {...field} />
			{/snippet}
		</FormField>
		<FormField label={m.nav_apartments()} error={texts.apartmentId} required>
			{#snippet children(field)}
				<Select
					name="apartmentId"
					bind:value={newApartment}
					options={createApartmentOptions}
					{...field}
				/>
			{/snippet}
		</FormField>
		{#key newType}
			<FormField
				label={m.reading_period()}
				hint={newType === 'utilities'
					? m.invoice_period_utilities_hint()
					: m.invoice_period_rent_hint()}
				error={texts.period}
				required
			>
				{#snippet children(field)}
					<Input
						name="period"
						type="month"
						defaultValue={newType === 'utilities' ? data.defaults.utilities : data.defaults.rent}
						{...field}
					/>
				{/snippet}
			</FormField>
		{/key}
	{/snippet}
</FormModal>
