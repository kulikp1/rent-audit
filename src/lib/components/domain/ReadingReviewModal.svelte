<script lang="ts">
	import { ImageOff } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { ReadingView } from '#lib/server/reading-views.js';
	import { formatPeriod, formatReading } from '#lib/utils/format.js';
	import ImageViewer from '../overlay/ImageViewer.svelte';
	import Modal from '../overlay/Modal.svelte';
	import Badge from '../ui/Badge.svelte';
	import Button from '../ui/Button.svelte';
	import ReadingHistory from './ReadingHistory.svelte';
	import ValidationFlags from './ValidationFlags.svelte';

	type Props = {
		open: boolean;
		reading: ReadingView | null;
		actionable?: boolean;
		onconfirm?: (reading: ReadingView) => void;
		oncorrect?: (reading: ReadingView) => void;
		onreject?: (reading: ReadingView) => void;
	};

	let {
		open = $bindable(false),
		reading,
		actionable = false,
		onconfirm,
		oncorrect,
		onreject
	}: Props = $props();

	let viewerOpen = $state(false);
	let photoFailed = $state(false);

	const photoSrc = $derived(reading?.hasPhoto ? `/api/readings/${reading.id}/photo` : '');
	const pending = $derived(reading?.status === 'needs_confirmation');
	const correctable = $derived(reading?.status === 'confirmed' && !reading.locked);
	const meterLabel = $derived(
		reading
			? { water: m.meter_water(), gas: m.meter_gas(), electricity: m.meter_electricity() }[
					reading.meterType
				]
			: ''
	);
	const statusTone = $derived(
		reading?.status === 'confirmed'
			? 'success'
			: reading?.status === 'rejected'
				? 'danger'
				: 'warning'
	);
	const statusText = $derived(
		reading?.status === 'confirmed'
			? m.reading_confirmed()
			: reading?.status === 'rejected'
				? m.reading_rejected()
				: m.reading_needs_confirmation()
	);

	$effect(() => {
		if (reading) photoFailed = false;
	});
</script>

{#if reading}
	<Modal
		bind:open
		size="lg"
		title={m.reading_review_title()}
		description={`${reading.apartmentName} · ${formatPeriod(reading.period)}`}
		onconfirm={actionable && pending && !reading.locked ? () => onconfirm?.(reading) : undefined}
	>
		<div class="grid gap-6 md:grid-cols-[220px_1fr]">
			<div>
				{#if photoSrc && !photoFailed}
					<button
						type="button"
						onclick={() => (viewerOpen = true)}
						class="block w-full overflow-hidden rounded-card border border-line"
						aria-label={m.reading_open_photo()}
					>
						<img
							src={photoSrc}
							alt=""
							class="aspect-[4/3] w-full object-cover"
							onerror={() => (photoFailed = true)}
						/>
					</button>
				{:else}
					<div
						class="grid aspect-[4/3] place-items-center rounded-card border border-dashed border-line-strong bg-surface-muted text-ink-faint"
					>
						<span class="flex flex-col items-center gap-2 text-xs">
							<ImageOff class="size-6" />
							{m.reading_no_photo()}
						</span>
					</div>
				{/if}
			</div>

			<div class="space-y-5">
				<dl class="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
					<div>
						<dt class="text-ink-muted">{m.reading_meter()}</dt>
						<dd class="mt-0.5 font-medium">{meterLabel} · {reading.serial}</dd>
					</div>
					<div>
						<dt class="text-ink-muted">{m.apt_tenant()}</dt>
						<dd class="mt-0.5 font-medium">{reading.tenantName || m.apt_no_tenant()}</dd>
					</div>
					<div>
						<dt class="text-ink-muted">{m.reading_value()}</dt>
						<dd class="mt-0.5 text-lg font-semibold tabular-nums">
							{formatReading(reading.values)}
						</dd>
					</div>
					<div>
						<dt class="text-ink-muted">{m.reading_previous_label()}</dt>
						<dd class="mt-0.5 text-lg font-semibold text-ink-soft tabular-nums">
							{formatReading(reading.previous)}
						</dd>
					</div>
				</dl>

				<div class="flex flex-wrap items-center gap-2">
					<Badge tone={statusTone}>{statusText}</Badge>
					<Badge
						>{reading.source === 'gemini'
							? m.reading_source_photo()
							: m.reading_source_manual()}</Badge
					>
				</div>

				{#if reading.rejectReason}
					<p class="text-sm text-danger-ink">
						{m.reading_reject_reason({ reason: reading.rejectReason })}
					</p>
				{/if}

				{#if reading.locked}
					<p class="rounded-control bg-surface-muted px-3 py-2 text-sm text-ink-soft">
						{m.reading_locked_note()}
					</p>
				{/if}

				<ValidationFlags flags={reading.flags} />

				<div>
					<h3 class="mb-3 text-sm font-semibold">{m.reading_history_title()}</h3>
					<ReadingHistory entries={reading.history} />
				</div>
			</div>
		</div>

		{#snippet footer()}
			{#if actionable && pending && !reading.locked}
				<Button variant="ghost" onclick={() => onreject?.(reading)}>{m.reading_reject()}</Button>
				<Button variant="secondary" onclick={() => oncorrect?.(reading)}
					>{m.reading_correct()}</Button
				>
				<Button data-autofocus onclick={() => onconfirm?.(reading)}>{m.common_confirm()}</Button>
			{:else}
				{#if actionable && correctable}
					<Button variant="secondary" onclick={() => oncorrect?.(reading)}
						>{m.reading_correct()}</Button
					>
				{/if}
				<Button variant="secondary" data-autofocus onclick={() => (open = false)}>
					{m.common_close()}
				</Button>
			{/if}
		{/snippet}
	</Modal>

	<ImageViewer bind:open={viewerOpen} src={photoSrc} title={m.reading_photo_title()} />
{/if}
