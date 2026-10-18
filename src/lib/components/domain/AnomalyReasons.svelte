<script lang="ts">
	import { TriangleAlert } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { AnomalyReason } from '#lib/server/billing/anomalies.js';
	import { formatQuantity } from '#lib/utils/invoice.js';
	import Badge from '../ui/Badge.svelte';

	type Props = { reasons: AnomalyReason[]; unit: string; period?: string };

	let { reasons, unit, period }: Props = $props();

	function text(reason: AnomalyReason): string {
		const params = {
			value: `${formatQuantity(reason.value)} ${unit}`,
			expected: `${formatQuantity(reason.expected)} ${unit}`
		};
		return {
			zero_consumption: m.anomaly_zero(),
			above_median: m.anomaly_above_median(params),
			below_median: m.anomaly_below_median(params),
			above_last_year: m.anomaly_above_last_year(params),
			jump_vs_last_month: m.anomaly_jump(params),
			over_norm: m.anomaly_over_norm(params)
		}[reason.code];
	}
</script>

<div class="space-y-2">
	<div class="flex items-center gap-2">
		<Badge tone="danger">
			<TriangleAlert class="size-3" />
			{m.anomaly_badge()}
		</Badge>
		{#if period}<span class="text-[13px] text-ink-muted">{period}</span>{/if}
	</div>
	<ul class="space-y-1 text-sm text-ink-soft">
		{#each reasons as reason (reason.code)}
			<li>{text(reason)}</li>
		{/each}
	</ul>
</div>
