<script lang="ts">
	import { TrendingUp } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDate, formatMoney } from '#lib/utils/format.js';
	import Button from '../ui/Button.svelte';

	type Props = {
		change: { amount: number; previous: number; effectiveFrom: string };
		busy?: boolean;
		onack: () => void;
	};

	let { change, busy = false, onack }: Props = $props();
</script>

<div
	class="flex flex-wrap items-center justify-between gap-4 rounded-card border border-warning-600/25 bg-warning-50 p-5"
>
	<div class="flex items-start gap-4">
		<span
			class="grid size-10 shrink-0 place-items-center rounded-full bg-warning-600/15 text-warning-700"
		>
			<TrendingUp class="size-5" />
		</span>
		<div>
			<p class="font-semibold text-ink">
				{m.price_change_title({ date: formatDate(change.effectiveFrom) })}
			</p>
			<p class="mt-0.5 text-sm text-ink-soft">
				{m.price_change_text({
					from: formatMoney(change.previous),
					to: formatMoney(change.amount)
				})}
			</p>
		</div>
	</div>
	<Button loading={busy} onclick={onack}>{m.price_change_ack()}</Button>
</div>
