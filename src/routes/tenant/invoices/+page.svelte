<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { pathTo } from '#lib/utils/path.js';
	import { Building2, ChevronDown, Receipt, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { postAction } from '#lib/utils/actions.js';
	import { formatDate, formatMoney, formatPeriod } from '#lib/utils/format.js';
	import { statusLabel, statusTone, typeLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let filter = $state<'all' | 'rent' | 'utilities'>('all');

	const open = $derived(
		data.invoices.filter((invoice) => invoice.status === 'issued' || invoice.status === 'overdue')
	);
	const history = $derived(
		data.invoices.filter((invoice) => invoice.status !== 'issued' && invoice.status !== 'overdue')
	);
	const shown = $derived(history.filter((invoice) => filter === 'all' || invoice.type === filter));
	const openTotal = $derived(open.reduce((sum, invoice) => sum + invoice.total, 0));
	const paid = $derived(history.filter((invoice) => invoice.status === 'paid'));
	const paidTotal = $derived(paid.reduce((sum, invoice) => sum + invoice.total, 0));
	const earliestPaid = $derived(
		paid.map((invoice) => invoice.period).sort((left, right) => left.localeCompare(right))[0]
	);
	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');

	const filters = $derived([
		{ value: 'all' as const, label: m.invoices_filter_all() },
		{ value: 'rent' as const, label: m.invoice_type_rent() },
		{ value: 'utilities' as const, label: m.invoice_type_utilities_short() }
	]);

	const shortDate = (value: string) =>
		new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(new Date(value));

	async function reportPaid(invoice: (typeof data.invoices)[number]) {
		const confirmed = await dialog.confirm({
			title: m.tenant_paid_title(),
			description: m.tenant_paid_text(),
			confirmLabel: m.tenant_paid_confirm()
		});
		if (!confirmed) return;
		const result = await postAction(`/tenant/invoices/${invoice.id}?/paid`);
		if (result.type === 'success') toast.success(m.tenant_paid_toast());
		else toast.error(m.error_generic());
	}
</script>

<svelte:head><title>{m.nav_invoices()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_invoices()} subtitle={m.tenant_invoices_subtitle()} />

{#if data.invoices.length === 0}
	<Card padded={false}>
		<EmptyState title={m.tenant_invoices_empty_title()} text={m.tenant_invoices_empty_text()}>
			{#snippet icon()}<Receipt class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	{#if open.length > 0}
		<div class="mb-2 flex items-baseline justify-between">
			<h2 class="text-sm font-semibold text-ink">{m.tenant_invoices_to_pay()}</h2>
			<p class="text-xs text-ink-muted">
				{m.tenant_invoices_total()}
				<span class=" font-bold text-ink">{formatMoney(openTotal)}</span>
			</p>
		</div>
		<div class="grid gap-3 md:grid-cols-2">
			{#each open as invoice (invoice.id)}
				{@const overdue = invoice.status === 'overdue'}
				<div
					class="rounded-card border bg-surface p-4 {overdue
						? 'border-danger-600/50'
						: 'border-line'}"
				>
					<div class="flex items-start gap-3">
						<span
							class="grid size-10 shrink-0 place-items-center rounded-control {invoice.type ===
							'rent'
								? 'bg-primary-50 text-primary-ink'
								: 'bg-success-50 text-success-ink'}"
						>
							{#if invoice.type === 'rent'}<Building2 class="size-5" />{:else}<Zap
									class="size-5"
								/>{/if}
						</span>
						<div class="min-w-0 flex-1">
							<a
								href={pathTo(`/tenant/invoices/${invoice.id}`)}
								class="block truncate text-sm font-semibold text-ink hover:text-primary-ink"
							>
								{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
							</a>
							<p class="mt-0.5 text-[11px] text-ink-muted">
								{invoice.number}
								{#if invoice.dueDate}
									· {overdue
										? m.tenant_invoice_was_due({ date: shortDate(invoice.dueDate) })
										: m.invoice_due_until({ date: shortDate(invoice.dueDate) })}
								{/if}
							</p>
						</div>
						<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
					</div>
					<div class="mt-3 flex items-center justify-between gap-3">
						<p class=" text-2xl font-bold tracking-tight tabular-nums">
							{formatMoney(invoice.total)}
						</p>
						{#if invoice.tenantPaidAt}
							<span class="text-xs font-medium text-warning-ink">{m.tenant_invoice_notified()}</span
							>
						{:else}
							<Menu
								label={m.tenant_invoice_pay()}
								triggerClass="flex items-center gap-1.5 rounded-control bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
								items={[
									{
										label: m.tenant_invoice_requisites(),
										href: `/tenant/invoices/${invoice.id}`
									},
									{ label: m.tenant_paid_button(), onselect: () => reportPaid(invoice) }
								]}
							>
								{#snippet trigger()}
									{m.tenant_invoice_pay()}<ChevronDown class="size-4" />
								{/snippet}
							</Menu>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if history.length > 0}
		<div class="mt-4 mb-2 flex flex-wrap items-center justify-between gap-3">
			<h2 class="text-sm font-semibold text-ink">{m.tenant_invoices_history()}</h2>
			<div
				role="group"
				aria-label={m.invoice_type()}
				class="inline-flex rounded-full border border-line bg-surface p-1 text-[13px] font-semibold"
			>
				{#each filters as option (option.value)}
					<button
						type="button"
						aria-pressed={filter === option.value}
						onclick={() => (filter = option.value)}
						class="rounded-full px-3.5 py-1.5 transition-colors {filter === option.value
							? 'bg-primary-500 text-white'
							: 'text-ink-muted hover:text-ink'}"
					>
						{option.label}
					</button>
				{/each}
			</div>
		</div>

		<Card padded={false}>
			<ul class="divide-y divide-line overflow-y-auto" use:fitViewport={120}>
				{#each shown as invoice (invoice.id)}
					<li>
						<a
							href={pathTo(`/tenant/invoices/${invoice.id}`)}
							class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/60"
						>
							<span
								class="grid size-9 shrink-0 place-items-center rounded-control {invoice.type ===
								'rent'
									? 'bg-primary-50 text-primary-ink'
									: 'bg-success-50 text-success-ink'}"
							>
								{#if invoice.type === 'rent'}<Building2 class="size-4" />{:else}<Zap
										class="size-4"
									/>{/if}
							</span>
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-semibold text-ink">
									{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
								</p>
								<p class=" text-[11px] text-ink-muted">{invoice.number}</p>
							</div>
							<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
							<span class="w-28 text-right text-sm font-bold tabular-nums">
								{formatMoney(invoice.total)}
							</span>
						</a>
					</li>
				{/each}
			</ul>
			{#if earliestPaid}
				<div
					class="flex items-center justify-between border-t border-line px-4 py-3 text-[13px] text-ink-muted"
				>
					<span
						>{m.tenant_invoices_paid_since({
							period: formatPeriod(earliestPaid).toLocaleLowerCase(intlLocale)
						})}</span
					>
					<span class=" text-sm font-bold text-ink tabular-nums">
						{formatMoney(paidTotal)}
					</span>
				</div>
			{/if}
		</Card>
	{/if}
{/if}
