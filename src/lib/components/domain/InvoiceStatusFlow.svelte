<script lang="ts">
	import { Check } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';

	let { status }: { status: string } = $props();

	const steps = $derived([
		{ id: 'draft', label: m.invoice_status_draft() },
		{ id: 'issued', label: m.invoice_status_issued() },
		{ id: 'paid', label: m.invoice_status_paid() }
	]);

	const index = $derived(
		status === 'draft'
			? 0
			: status === 'paid'
				? 2
				: status === 'issued' || status === 'overdue'
					? 1
					: -1
	);
</script>

{#if status === 'cancelled'}
	<p class="text-sm text-ink-muted">{m.invoice_status_cancelled()}</p>
{:else}
	<ol class="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm">
		{#each steps as step, position (step.id)}
			{@const done = position < index || (position === index && status === 'paid')}
			{@const current = position === index && status !== 'paid'}
			<li class="flex items-center gap-2">
				<span
					class="grid size-6 place-items-center rounded-full text-xs font-semibold {done
						? 'bg-success-600 text-white'
						: current
							? status === 'overdue'
								? 'bg-danger-600 text-white'
								: 'bg-primary-600 text-white'
							: 'bg-surface-muted text-ink-faint'}"
				>
					{#if done}<Check class="size-3.5" />{:else}{position + 1}{/if}
				</span>
				<span class={current || done ? 'font-medium text-ink' : 'text-ink-faint'}>
					{current && status === 'overdue' ? m.invoice_status_overdue() : step.label}
				</span>
				{#if position < steps.length - 1}<span class="mx-1 h-px w-6 bg-line-strong"></span>{/if}
			</li>
		{/each}
	</ol>
{/if}
