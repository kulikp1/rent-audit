<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { pathTo } from '#lib/utils/path.js';
	import { Plus, Receipt } from '@lucide/svelte';
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
	let type = $state('all');
	let apartment = $state('all');
	let newType = $state('utilities');
	let newApartment = $state('');

	const filtered = $derived(
		data.invoices.filter(
			(invoice) =>
				(status === 'all' || invoice.status === status) &&
				(type === 'all' || invoice.type === type) &&
				(apartment === 'all' || invoice.apartmentId === apartment)
		)
	);

	const statusOptions = $derived(
		['all', 'draft', 'issued', 'overdue', 'paid', 'cancelled'].map((value) => ({
			value,
			label: value === 'all' ? m.invoice_all_statuses() : statusLabel(value)
		}))
	);
	const typeOptions = $derived([
		{ value: 'all', label: m.invoice_all_types() },
		{ value: 'utilities', label: m.invoice_type_utilities() },
		{ value: 'rent', label: m.invoice_type_rent() }
	]);
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

<Card padded={false}>
	{#if data.invoices.length === 0}
		<EmptyState
			title={m.invoice_empty_title()}
			text={data.apartments.length === 0 ? m.invoice_empty_no_tenants() : m.invoice_empty_text()}
		>
			{#snippet icon()}<Receipt class="size-6" />{/snippet}
		</EmptyState>
	{:else}
		<div class="flex flex-wrap gap-3 border-b border-line p-4">
			<div class="w-44"><Select bind:value={status} options={statusOptions} /></div>
			<div class="w-48"><Select bind:value={type} options={typeOptions} /></div>
			<div class="w-56"><Select bind:value={apartment} options={apartmentOptions} /></div>
		</div>
		{#if filtered.length === 0}
			<p class="px-6 py-12 text-center text-sm text-ink-muted">{m.apt_nothing_found()}</p>
		{:else}
			<div class="table-scroll hidden md:block" use:fitViewport>
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-ink-muted uppercase">
						<tr class="border-b border-line">
							<th class="px-5 py-3 font-medium">{m.invoice_number()}</th>
							<th class="px-5 py-3 font-medium">{m.nav_apartments()}</th>
							<th class="px-5 py-3 font-medium">{m.invoice_type()}</th>
							<th class="px-5 py-3 font-medium">{m.reading_period()}</th>
							<th class="px-5 py-3 text-right font-medium">{m.invoice_total()}</th>
							<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each filtered as invoice (invoice.id)}
							<tr
								use:rowLink={`/realtor/invoices/${invoice.id}`}
								class="cursor-pointer transition-colors hover:bg-surface-muted/60"
							>
								<td class="px-5 py-3.5 whitespace-nowrap">
									<a
										href={pathTo(`/realtor/invoices/${invoice.id}`)}
										class="font-medium text-ink hover:text-primary-700"
									>
										{invoice.number}
									</a>
								</td>
								<td class="px-5 py-3.5">{invoice.apartmentName}</td>
								<td class="px-5 py-3.5">{typeLabel(invoice.type)}</td>
								<td class="px-5 py-3.5 whitespace-nowrap">{formatPeriod(invoice.period)}</td>
								<td class="px-5 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
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
										<p class="mt-1 text-[12px] text-warning-700">{m.invoice_tenant_says_paid()}</p>
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
									<span class="block font-medium text-ink">{invoice.number}</span>
									<span class="mt-0.5 block text-[13px] text-ink-muted">
										{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
									</span>
									<span class="block truncate text-[13px] text-ink-muted"
										>{invoice.apartmentName}</span
									>
								</span>
								<span class="text-base font-semibold whitespace-nowrap tabular-nums">
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
									<span class="text-[12px] text-warning-700">{m.invoice_tenant_says_paid()}</span>
								{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</Card>

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
