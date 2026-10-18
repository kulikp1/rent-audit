<script lang="ts">
	import { Trash2 } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { TariffView } from '#lib/server/billing/tariffs.js';
	import { formatDate, formatMoney } from '#lib/utils/format.js';
	import Badge from '../ui/Badge.svelte';
	import IconButton from '../ui/IconButton.svelte';

	type Props = {
		rows: TariffView[];
		service: 'electricity' | 'gas' | 'water';
		ondelete?: (row: TariffView) => void;
	};

	let { rows, service, ondelete }: Props = $props();

	const now = Date.now();
	const current = $derived(
		rows.find((row) => new Date(row.effectiveFrom).getTime() <= now)?.id ?? null
	);

	function state(row: TariffView) {
		if (new Date(row.effectiveFrom).getTime() > now) return 'planned';
		return row.id === current ? 'current' : 'archive';
	}
</script>

<table class="w-full text-left text-sm">
	<thead class="text-xs text-ink-muted uppercase">
		<tr class="border-b border-line">
			<th class="px-5 py-3 font-medium">{m.tariff_effective_from()}</th>
			<th class="px-5 py-3 text-right font-medium">
				{service === 'electricity' ? m.tariff_price_day() : m.tariff_price()}
			</th>
			{#if service === 'electricity'}
				<th class="px-5 py-3 text-right font-medium">{m.tariff_price_night()}</th>
			{/if}
			<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
			{#if ondelete}<th class="w-14 px-3 py-3"></th>{/if}
		</tr>
	</thead>
	<tbody class="divide-y divide-line">
		{#each rows as row (row.id)}
			{@const status = state(row)}
			<tr>
				<td class="px-5 py-3.5">{formatDate(row.effectiveFrom)}</td>
				<td class="px-5 py-3.5 text-right font-medium tabular-nums">{formatMoney(row.price)}</td>
				{#if service === 'electricity'}
					<td class="px-5 py-3.5 text-right font-medium tabular-nums">
						{row.nightPrice === null ? '—' : formatMoney(row.nightPrice)}
					</td>
				{/if}
				<td class="px-5 py-3.5">
					<Badge
						tone={status === 'current' ? 'success' : status === 'planned' ? 'info' : 'neutral'}
					>
						{status === 'current'
							? m.tariff_current()
							: status === 'planned'
								? m.tariff_planned()
								: m.tariff_archive()}
					</Badge>
				</td>
				{#if ondelete}
					<td class="px-3 py-3.5 text-right">
						{#if status === 'planned'}
							<IconButton label={m.common_delete()} tone="danger" onclick={() => ondelete(row)}>
								<Trash2 class="size-4" />
							</IconButton>
						{/if}
					</td>
				{/if}
			</tr>
		{/each}
	</tbody>
</table>
