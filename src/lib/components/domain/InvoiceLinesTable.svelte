<script lang="ts">
	import { X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { InvoiceView } from '#lib/server/billing/invoices.js';
	import { formatMoney } from '#lib/utils/format.js';
	import { formatQuantity, lineLabel, unitLabel } from '#lib/utils/invoice.js';
	import IconButton from '../ui/IconButton.svelte';

	type Props = {
		invoice: Pick<InvoiceView, 'lines' | 'total'>;
		editable?: boolean;
		onremove?: (lineId: string) => void;
	};

	let { invoice, editable = false, onremove }: Props = $props();
</script>

<div class="hidden overflow-x-auto md:block">
	<table class="w-full text-left text-sm">
		<thead class="text-xs text-ink-muted uppercase">
			<tr class="border-b border-line">
				<th class="px-5 py-3 font-medium">{m.invoice_line()}</th>
				<th class="px-5 py-3 text-right font-medium">{m.invoice_quantity()}</th>
				<th class="px-5 py-3 text-right font-medium">{m.tariff_price()}</th>
				<th class="px-5 py-3 text-right font-medium">{m.invoice_sum()}</th>
				{#if editable}<th class="w-12 px-3 py-3"></th>{/if}
			</tr>
		</thead>
		<tbody class="divide-y divide-line">
			{#each invoice.lines as line (line.id)}
				<tr>
					<td class="px-5 py-3.5">{lineLabel(line)}</td>
					<td class="px-5 py-3.5 text-right whitespace-nowrap tabular-nums">
						{formatQuantity(line.quantity)}
						<span class="text-ink-muted">{unitLabel(line.unit)}</span>
					</td>
					<td class="px-5 py-3.5 text-right whitespace-nowrap tabular-nums">
						{formatMoney(line.price)}
					</td>
					<td class="px-5 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
						{formatMoney(line.sum)}
					</td>
					{#if editable}
						<td class="px-3 py-3.5 text-right">
							{#if line.kind === 'manual'}
								<IconButton
									label={m.common_delete()}
									tone="danger"
									onclick={() => onremove?.(line.id)}
								>
									<X class="size-4" />
								</IconButton>
							{/if}
						</td>
					{/if}
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="border-t border-line-strong">
				<td colspan="3" class="px-5 py-4 text-right text-sm font-medium text-ink-soft">
					{m.invoice_total()}
				</td>
				<td class="px-5 py-4 text-right text-lg font-semibold whitespace-nowrap tabular-nums">
					{formatMoney(invoice.total)}
				</td>
				{#if editable}<td></td>{/if}
			</tr>
		</tfoot>
	</table>
</div>

<div class="md:hidden">
	<ul class="divide-y divide-line">
		{#each invoice.lines as line (line.id)}
			<li class="flex items-start gap-3 px-4 py-3.5">
				<div class="min-w-0 flex-1">
					<p class="text-sm font-medium text-ink">{lineLabel(line)}</p>
					<p class="mt-0.5 text-[13px] text-ink-muted tabular-nums">
						{formatQuantity(line.quantity)}
						{unitLabel(line.unit)} × {formatMoney(line.price)}
					</p>
				</div>
				<p class="text-sm font-semibold whitespace-nowrap tabular-nums">{formatMoney(line.sum)}</p>
				{#if editable && line.kind === 'manual'}
					<IconButton label={m.common_delete()} tone="danger" onclick={() => onremove?.(line.id)}>
						<X class="size-4" />
					</IconButton>
				{/if}
			</li>
		{/each}
	</ul>
	<div class="flex items-center justify-between border-t border-line-strong px-4 py-4">
		<span class="text-sm font-medium text-ink-soft">{m.invoice_total()}</span>
		<span class="text-lg font-semibold tabular-nums">{formatMoney(invoice.total)}</span>
	</div>
</div>
