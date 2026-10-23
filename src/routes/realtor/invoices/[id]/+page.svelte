<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		Ban,
		CircleCheck,
		CircleAlert,
		Ellipsis,
		Plus,
		Send,
		Trash2
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import InvoiceLinesTable from '#lib/components/domain/InvoiceLinesTable.svelte';
	import InvoiceStatusFlow from '#lib/components/domain/InvoiceStatusFlow.svelte';
	import PaymentDetails from '#lib/components/domain/PaymentDetails.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import Checkbox from '#lib/components/ui/Checkbox.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { postAction } from '#lib/utils/actions.js';
	import { formatDate, formatMoney, formatPeriod } from '#lib/utils/format.js';
	import { statusLabel, statusTone, typeLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let lineOpen = $state(false);
	let cancelOpen = $state(false);
	let busy = $state(false);

	const invoice = $derived(data.invoice);
	const draft = $derived(invoice.status === 'draft');
	const open = $derived(invoice.status === 'issued' || invoice.status === 'overdue');
	const purpose = $derived(m.invoice_payment_purpose({ number: invoice.number }));

	const errorTextsMap: Record<string, () => string> = {
		no_payout: () => m.invoice_error_no_payout(),
		empty: () => m.invoice_error_empty(),
		not_draft: () => m.invoice_error_not_draft(),
		not_open: () => m.invoice_error_not_open()
	};

	function failure(code: unknown) {
		toast.error(errorTextsMap[String(code)]?.() ?? m.error_generic());
	}

	async function issue() {
		const confirmed = await dialog.confirm({
			title: m.invoice_issue_title({ number: invoice.number }),
			description: m.invoice_issue_text({ total: formatMoney(invoice.total) }),
			confirmLabel: m.invoice_issue()
		});
		if (!confirmed) return;
		busy = true;
		const result = await postAction('?/issue');
		busy = false;
		if (result.type === 'success') toast.success(m.invoice_issued_toast());
		else failure(result.type === 'failure' ? result.data?.formError : null);
	}

	async function markPaid() {
		const confirmed = await dialog.confirm({
			title: m.invoice_paid_title(),
			description: m.invoice_paid_text(),
			confirmLabel: m.invoice_mark_paid()
		});
		if (!confirmed) return;
		busy = true;
		const result = await postAction('?/markPaid');
		busy = false;
		if (result.type === 'success') toast.success(m.invoice_paid_toast());
		else failure(result.type === 'failure' ? result.data?.formError : null);
	}

	async function deleteDraft() {
		const confirmed = await dialog.confirm({
			title: m.invoice_delete_title(),
			description: m.invoice_delete_text(),
			confirmLabel: m.common_delete(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/deleteDraft');
		if (result.type === 'redirect') await goto(pathTo(result.location));
		else failure(result.type === 'failure' ? result.data?.formError : null);
	}

	async function removeLine(lineId: string) {
		const result = await postAction('?/removeLine', { lineId });
		if (result.type !== 'success')
			failure(result.type === 'failure' ? result.data?.formError : null);
	}
</script>

<svelte:head><title>{invoice.number} · {m.app_name()}</title></svelte:head>

<a
	href={pathTo('/realtor/invoices')}
	class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
>
	<ArrowLeft class="size-4" />
	{m.nav_invoices()}
</a>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div>
		<div class="flex flex-wrap items-center gap-3">
			<h1 class="text-2xl font-semibold tracking-tight">{invoice.number}</h1>
			<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
		</div>
		<p class="mt-1 text-sm text-ink-muted">
			{typeLabel(invoice.type)} · {formatPeriod(invoice.period)} · {invoice.apartmentName}
		</p>
	</div>

	<div class="flex flex-wrap items-center gap-2">
		{#if draft}
			<Button variant="secondary" onclick={() => (lineOpen = true)}>
				{#snippet icon()}<Plus class="size-4" />{/snippet}
				{m.invoice_add_line()}
			</Button>
			<Button loading={busy} disabled={!data.payoutReady} onclick={issue}>
				{#snippet icon()}<Send class="size-4" />{/snippet}
				{m.invoice_issue()}
			</Button>
			<Menu
				label={m.common_actions()}
				triggerClass="grid size-10 place-items-center rounded-control border border-line-strong bg-surface text-ink-muted shadow-sm hover:bg-surface-muted"
				items={[
					{ label: m.invoice_delete_draft(), icon: Trash2, tone: 'danger', onselect: deleteDraft }
				]}
			>
				{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
			</Menu>
		{:else if open}
			<Button variant="secondary" onclick={() => (cancelOpen = true)}>
				{#snippet icon()}<Ban class="size-4" />{/snippet}
				{m.invoice_cancel()}
			</Button>
			<Button loading={busy} onclick={markPaid}>
				{#snippet icon()}<CircleCheck class="size-4" />{/snippet}
				{m.invoice_mark_paid()}
			</Button>
		{/if}
	</div>
</div>

<div class="mb-6"><InvoiceStatusFlow status={invoice.status} /></div>

{#if draft && !data.payoutReady}
	<div
		class="mb-6 flex items-start gap-3 rounded-control bg-warning-50 p-4 text-sm text-warning-700"
	>
		<CircleAlert class="mt-0.5 size-4 shrink-0" />
		<span>
			{m.invoice_payout_missing()}
			<a href={resolve('/realtor/settings')} class="font-medium underline">{m.nav_settings()}</a>
		</span>
	</div>
{/if}

{#if open && invoice.tenantPaidAt}
	<div class="mb-6 flex items-start gap-3 rounded-control bg-info-50 p-4 text-sm text-info-700">
		<CircleAlert class="mt-0.5 size-4 shrink-0" />
		{m.invoice_tenant_paid_notice({ date: formatDate(invoice.tenantPaidAt) })}
	</div>
{/if}

{#if invoice.status === 'cancelled'}
	<div class="mb-6 rounded-control bg-surface-muted p-4 text-sm text-ink-soft">
		<p class="font-medium text-ink">{m.invoice_cancelled_note()}</p>
		<p class="mt-1">{m.invoice_cancel_reason({ reason: invoice.cancelledReason })}</p>
		{#if data.replacedBy}
			<p class="mt-2">
				<a
					href={pathTo(`/realtor/invoices/${data.replacedBy.id}`)}
					class="font-medium text-primary-700 hover:underline"
				>
					{m.invoice_replaced_by({ number: data.replacedBy.number })}
				</a>
			</p>
		{/if}
	</div>
{/if}

{#if data.replaces}
	<p class="mb-6 text-sm text-ink-muted">
		<a
			href={pathTo(`/realtor/invoices/${data.replaces.id}`)}
			class="font-medium text-primary-700 hover:underline"
		>
			{m.invoice_replaces({ number: data.replaces.number })}
		</a>
	</p>
{/if}

<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
	<div class="space-y-6">
		<Card padded={false}>
			<InvoiceLinesTable {invoice} editable={draft} onremove={removeLine} />
		</Card>

		{#if invoice.payout}
			<Card>
				<h2 class="text-base font-semibold">{m.invoice_payment_details()}</h2>
				<div class="mt-4"><PaymentDetails payout={invoice.payout} {purpose} /></div>
			</Card>
		{/if}
	</div>

	<div class="space-y-6">
		<Card>
			<h2 class="text-base font-semibold">{m.invoice_details()}</h2>
			<dl class="mt-4 space-y-3 text-sm">
				<div class="flex justify-between gap-4">
					<dt class="text-ink-muted">{m.apt_tenant()}</dt>
					<dd class="font-medium">{invoice.tenantName || '—'}</dd>
				</div>
				{#if invoice.issuedAt}
					<div class="flex justify-between gap-4">
						<dt class="text-ink-muted">{m.invoice_issued_at()}</dt>
						<dd class="font-medium">{formatDate(invoice.issuedAt)}</dd>
					</div>
				{/if}
				{#if invoice.dueDate}
					<div class="flex justify-between gap-4">
						<dt class="text-ink-muted">{m.invoice_due()}</dt>
						<dd class="font-medium">{formatDate(invoice.dueDate)}</dd>
					</div>
				{/if}
				{#if invoice.paidAt}
					<div class="flex justify-between gap-4">
						<dt class="text-ink-muted">{m.invoice_paid_at()}</dt>
						<dd class="font-medium">{formatDate(invoice.paidAt)}</dd>
					</div>
				{/if}
			</dl>
		</Card>
	</div>
</div>

<FormModal
	bind:open={lineOpen}
	title={m.invoice_add_line()}
	action="?/addLine"
	submitLabel={m.common_create()}
>
	{#snippet children({ errors })}
		{@const texts = errorTexts(errors)}
		<FormField label={m.invoice_line_description()} error={texts.description} required>
			{#snippet children(field)}
				<Input name="description" maxlength={120} {...field} />
			{/snippet}
		</FormField>
		<div class="grid gap-4 sm:grid-cols-2">
			<FormField label={m.invoice_quantity()} error={texts.quantity} required>
				{#snippet children(field)}
					<Input name="quantity" inputmode="decimal" defaultValue="1" {...field} />
				{/snippet}
			</FormField>
			<FormField label={m.tariff_price()} error={texts.price} required>
				{#snippet children(field)}
					<Input name="price" inputmode="decimal" {...field} />
				{/snippet}
			</FormField>
		</div>
	{/snippet}
</FormModal>

<FormModal
	bind:open={cancelOpen}
	title={m.invoice_cancel_title({ number: invoice.number })}
	description={m.invoice_cancel_text()}
	action="?/cancel"
	submitLabel={m.invoice_cancel()}
	tone="danger"
	onsuccess={() => toast.success(m.invoice_cancelled_toast())}
>
	{#snippet children({ errors })}
		{@const texts = errorTexts(errors)}
		<FormField label={m.invoice_cancel_reason_label()} error={texts.reason} required>
			{#snippet children(field)}
				<Textarea name="reason" rows={3} {...field} />
			{/snippet}
		</FormField>
		<Checkbox
			name="reissue"
			label={m.invoice_reissue()}
			hint={m.invoice_reissue_hint()}
			defaultChecked
		/>
	{/snippet}
</FormModal>
