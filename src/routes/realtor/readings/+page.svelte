<script lang="ts">
	import { resolve } from '$app/paths';
	import { ScanSearch } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ReadingReviewModal from '#lib/components/domain/ReadingReviewModal.svelte';
	import ReadingValueInput from '#lib/components/domain/ReadingValueInput.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import Textarea from '#lib/components/ui/Textarea.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { postAction } from '#lib/utils/actions.js';
	import { formatPeriod, formatReading } from '#lib/utils/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let apartment = $state('all');
	let selectedId = $state<string | null>(null);
	let reviewOpen = $state(false);
	let correctOpen = $state(false);

	const selected = $derived(data.readings.find((reading) => reading.id === selectedId) ?? null);
	const filtered = $derived(
		data.readings.filter((reading) => apartment === 'all' || reading.apartmentId === apartment)
	);
	const apartmentOptions = $derived([
		{ value: 'all', label: m.reading_all_apartments() },
		...data.apartments.map((item) => ({ value: item.id, label: item.name }))
	]);
	const labels = $derived({
		water: m.meter_water(),
		gas: m.meter_gas(),
		electricity: m.meter_electricity()
	});

	function open(id: string) {
		selectedId = id;
		reviewOpen = true;
	}

	function statusTone(status: string) {
		return status === 'confirmed' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
	}

	function statusText(status: string) {
		return status === 'confirmed'
			? m.reading_confirmed()
			: status === 'rejected'
				? m.reading_rejected()
				: m.reading_needs_confirmation();
	}

	function failureText(result: Awaited<ReturnType<typeof postAction>>) {
		return result.type === 'failure' && result.data?.formError === 'locked'
			? m.reading_locked_note()
			: m.error_generic();
	}

	async function confirm(id: string) {
		const result = await postAction('?/confirm', { id });
		if (result.type === 'success') {
			reviewOpen = false;
			toast.success(m.reading_confirmed_toast());
		} else {
			toast.error(failureText(result));
		}
	}

	async function reject(id: string) {
		const reason = await dialog.confirmWithReason({
			title: m.reading_reject_title(),
			description: m.reading_reject_text(),
			confirmLabel: m.reading_reject(),
			tone: 'danger',
			reason: { label: m.reading_reject_reason_label(), required: true }
		});
		if (reason === null) return;
		const result = await postAction('?/reject', { id, reason });
		if (result.type === 'success') {
			reviewOpen = false;
			toast.success(m.reading_rejected_toast());
		} else {
			toast.error(failureText(result));
		}
	}
</script>

<svelte:head><title>{m.nav_readings()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_readings()} subtitle={m.readings_subtitle()}>
	{#snippet actions()}
		<div class="flex rounded-control bg-surface-muted p-0.5 text-sm font-medium">
			<a
				href={resolve('/realtor/readings')}
				aria-current={!data.all ? 'page' : undefined}
				class="rounded-[8px] px-3 py-1.5 transition-colors {!data.all
					? 'bg-surface text-ink shadow-sm'
					: 'text-ink-muted hover:text-ink'}"
			>
				{m.readings_filter_pending()}
			</a>
			<a
				href="{resolve('/realtor/readings')}?status=all"
				aria-current={data.all ? 'page' : undefined}
				class="rounded-[8px] px-3 py-1.5 transition-colors {data.all
					? 'bg-surface text-ink shadow-sm'
					: 'text-ink-muted hover:text-ink'}"
			>
				{m.readings_filter_all()}
			</a>
		</div>
	{/snippet}
</PageHeader>

<Card padded={false}>
	{#if data.readings.length === 0}
		<EmptyState
			title={data.all ? m.reading_empty_title() : m.readings_queue_empty_title()}
			text={data.all ? m.reading_empty_text() : m.readings_queue_empty_text()}
		>
			{#snippet icon()}<ScanSearch class="size-6" />{/snippet}
		</EmptyState>
	{:else}
		<div class="border-b border-line p-4">
			<div class="w-60"><Select bind:value={apartment} options={apartmentOptions} /></div>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-left text-sm">
				<thead class="text-xs text-ink-muted uppercase">
					<tr class="border-b border-line">
						<th class="px-5 py-3 font-medium">{m.nav_apartments()}</th>
						<th class="px-5 py-3 font-medium">{m.reading_meter()}</th>
						<th class="px-5 py-3 font-medium">{m.reading_period()}</th>
						<th class="px-5 py-3 text-right font-medium">{m.reading_value()}</th>
						<th class="px-5 py-3 text-right font-medium">{m.reading_previous_label()}</th>
						<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
						<th class="px-5 py-3"><span class="sr-only">{m.common_actions()}</span></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each filtered as reading (reading.id)}
						<tr class="transition-colors hover:bg-surface-muted/60">
							<td class="px-5 py-3.5 font-medium">{reading.apartmentName}</td>
							<td class="px-5 py-3.5">{labels[reading.meterType]} · {reading.serial}</td>
							<td class="px-5 py-3.5 whitespace-nowrap">{formatPeriod(reading.period)}</td>
							<td class="px-5 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
								{formatReading(reading.values)}
							</td>
							<td class="px-5 py-3.5 text-right whitespace-nowrap text-ink-muted tabular-nums">
								{formatReading(reading.previous)}
							</td>
							<td class="px-5 py-3.5">
								<Badge tone={statusTone(reading.status)}>{statusText(reading.status)}</Badge>
							</td>
							<td class="px-5 py-3.5 text-right">
								<Button
									size="sm"
									variant={reading.status === 'needs_confirmation' ? 'primary' : 'secondary'}
									onclick={() => open(reading.id)}
								>
									{reading.status === 'needs_confirmation' ? m.reading_review() : m.common_open()}
								</Button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>

<ReadingReviewModal
	bind:open={reviewOpen}
	reading={selected}
	actionable
	onconfirm={(reading) => confirm(reading.id)}
	onreject={(reading) => reject(reading.id)}
	oncorrect={() => {
		reviewOpen = false;
		correctOpen = true;
	}}
/>

{#if selected}
	<FormModal
		bind:open={correctOpen}
		title={m.reading_correct_title()}
		description={m.reading_correct_text()}
		action="?/correct"
		onsuccess={() => toast.success(m.reading_corrected_toast())}
	>
		{#snippet children({ errors })}
			{@const texts = errorTexts(errors)}
			<input type="hidden" name="id" value={selected!.id} />
			<ReadingValueInput
				meter={{ id: selected!.meterId, digits: selected!.digits, zones: selected!.zones }}
				initial={selected!.values.map(String)}
				errors={texts}
			/>
			<FormField label={m.reading_correct_reason()} error={texts.reason} required>
				{#snippet children(field)}
					<Textarea name="reason" rows={2} {...field} />
				{/snippet}
			</FormField>
		{/snippet}
	</FormModal>
{/if}
