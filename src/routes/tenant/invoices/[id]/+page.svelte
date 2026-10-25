<script lang="ts">
	import { resolve } from '$app/paths';
	import { ArrowLeft, CircleCheck } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import InvoiceLinesTable from '#lib/components/domain/InvoiceLinesTable.svelte';
	import InvoiceStatusFlow from '#lib/components/domain/InvoiceStatusFlow.svelte';
	import PaymentDetails from '#lib/components/domain/PaymentDetails.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import { postAction } from '#lib/utils/actions.js';
	import { formatDate, formatMoney, formatPeriod } from '#lib/utils/format.js';
	import { statusLabel, statusTone, typeLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let busy = $state(false);

	const invoice = $derived(data.invoice);
	const open = $derived(invoice.status === 'issued' || invoice.status === 'overdue');
	const purpose = $derived(m.invoice_payment_purpose({ number: invoice.number }));

	async function paid() {
		const confirmed = await dialog.confirm({
			title: m.tenant_paid_title(),
			description: m.tenant_paid_text(),
			confirmLabel: m.tenant_paid_confirm()
		});
		if (!confirmed) return;
		busy = true;
		const result = await postAction('?/paid');
		busy = false;
		if (result.type === 'success') toast.success(m.tenant_paid_toast());
		else toast.error(m.error_generic());
	}
</script>

<svelte:head><title>{invoice.number} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/tenant/invoices')}
	class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
>
	<ArrowLeft class="size-4" />
	{m.nav_invoices()}
</a>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div>
		<div class="flex flex-wrap items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">
				{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
			</h1>
			<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
		</div>
		<p class="mt-1 text-sm text-ink-muted">{invoice.number}</p>
	</div>
	<div class="text-right">
		<p class="text-sm text-ink-muted">{m.invoice_total()}</p>
		<p class="text-3xl font-semibold tracking-tight tabular-nums">{formatMoney(invoice.total)}</p>
	</div>
</div>

<div class="mb-6"><InvoiceStatusFlow status={invoice.status} /></div>

{#if open && invoice.dueDate}
	<p
		class="mb-6 text-sm {invoice.status === 'overdue'
			? 'font-medium text-danger-ink'
			: 'text-ink-soft'}"
	>
		{invoice.status === 'overdue'
			? m.tenant_invoice_overdue({ date: formatDate(invoice.dueDate) })
			: m.invoice_due_until({ date: formatDate(invoice.dueDate) })}
	</p>
{/if}

<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
	<Card padded={false}><InvoiceLinesTable {invoice} /></Card>

	<div class="space-y-6">
		{#if invoice.payout && invoice.status !== 'cancelled'}
			<Card>
				<h2 class="text-base font-semibold">{m.invoice_payment_details()}</h2>
				<p class="mt-1 text-sm text-ink-muted">{m.tenant_payment_text()}</p>
				<div class="mt-4"><PaymentDetails payout={invoice.payout} {purpose} /></div>
			</Card>
		{/if}

		{#if open}
			<Card>
				{#if invoice.tenantPaidAt}
					<p class="flex items-start gap-2.5 text-sm text-success-ink">
						<CircleCheck class="mt-0.5 size-4 shrink-0" />
						{m.tenant_paid_sent({ date: formatDate(invoice.tenantPaidAt) })}
					</p>
				{:else}
					<p class="text-sm text-ink-muted">{m.tenant_paid_hint()}</p>
					<div class="mt-4">
						<Button fullWidth loading={busy} onclick={paid}>{m.tenant_paid_button()}</Button>
					</div>
				{/if}
			</Card>
		{/if}

		{#if invoice.status === 'cancelled'}
			<Card>
				<p class="text-sm font-medium">{m.invoice_cancelled_note()}</p>
				<p class="mt-1 text-sm text-ink-muted">
					{m.invoice_cancel_reason({ reason: invoice.cancelledReason })}
				</p>
			</Card>
		{/if}
	</div>
</div>
