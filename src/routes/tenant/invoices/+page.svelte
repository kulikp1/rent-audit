<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import { Receipt } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { formatDate, formatMoney, formatPeriod } from '#lib/utils/format.js';
	import { statusLabel, statusTone, typeLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<svelte:head><title>{m.nav_invoices()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_invoices()} subtitle={m.tenant_invoices_subtitle()} />

<Card padded={false}>
	{#if data.invoices.length === 0}
		<EmptyState title={m.tenant_invoices_empty_title()} text={m.tenant_invoices_empty_text()}>
			{#snippet icon()}<Receipt class="size-6" />{/snippet}
		</EmptyState>
	{:else}
		<ul class="divide-y divide-line">
			{#each data.invoices as invoice (invoice.id)}
				<li>
					<a
						href={pathTo(`/tenant/invoices/${invoice.id}`)}
						class="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-muted/60"
					>
						<div>
							<p class="font-medium text-ink">
								{typeLabel(invoice.type)} · {formatPeriod(invoice.period)}
							</p>
							<p class="mt-0.5 text-[13px] text-ink-muted">
								{invoice.number}
								{#if invoice.dueDate && (invoice.status === 'issued' || invoice.status === 'overdue')}
									· {m.invoice_due_until({ date: formatDate(invoice.dueDate) })}
								{/if}
							</p>
						</div>
						<div class="flex items-center gap-4">
							<Badge tone={statusTone(invoice.status)}>{statusLabel(invoice.status)}</Badge>
							<span class="w-28 text-right text-base font-semibold tabular-nums">
								{formatMoney(invoice.total)}
							</span>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</Card>
