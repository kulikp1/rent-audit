<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ArrowLeft, CircleAlert, CircleCheck, Droplets, Flame, Zap } from '@lucide/svelte';
	import { fitViewport } from '#lib/utils/fit.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import MeterReadingCard from '#lib/components/domain/MeterReadingCard.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { formatPeriod, formatReading } from '#lib/utils/format.js';
	import { unitLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);
	let readyIds = $state<string[]>([]);

	const icons = { water: Droplets, gas: Flame, electricity: Zap };
	const tints = {
		water: 'var(--color-service-water)',
		gas: 'var(--color-service-gas)',
		electricity: 'var(--color-service-electricity)'
	};
	const labels = $derived({
		water: m.meter_water(),
		gas: m.meter_gas(),
		electricity: m.meter_electricity()
	});
	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');
	const total = $derived(data.sent.length + data.meters.length);
	const done = $derived(data.sent.length + readyIds.length);
	const tips = $derived([
		[m.tenant_tip_1_title(), m.tenant_tip_1_text()],
		[m.tenant_tip_2_title(), m.tenant_tip_2_text()],
		[m.tenant_tip_3_title(), m.tenant_tip_3_text()],
		[m.tenant_tip_4_title(), m.tenant_tip_4_text()],
		[m.tenant_tip_5_title(), m.tenant_tip_5_text()]
	] as const);

	function setReady(id: string, ready: boolean) {
		const has = readyIds.includes(id);
		if (ready && !has) readyIds = [...readyIds, id];
		if (!ready && has) readyIds = readyIds.filter((item) => item !== id);
	}

	const shortDate = (value: string) =>
		new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(new Date(value));

	const errors = $derived(errorTexts((form?.errors as Record<string, string> | undefined) ?? {}));
	const subtitle = $derived(
		data.capabilities.photos ? m.tenant_photo_hint() : m.tenant_manual_hint()
	);
</script>

<svelte:head><title>{m.tenant_submit_readings()} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/tenant')}
	class="mb-2 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
>
	<ArrowLeft class="size-4" />
	{m.nav_home()}
</a>

<PageHeader
	title={m.tenant_submit_readings()}
	subtitle={`${formatPeriod(data.period)} · ${subtitle}`}
/>

{#if data.meters.length === 0}
	<Card>
		<div class="flex items-center gap-3 text-sm text-ink-soft">
			<CircleCheck class="size-5 text-success-ink" />
			{m.tenant_readings_all_sent()}
		</div>
	</Card>
{:else}
	<div class="grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
		<form
			method="POST"
			class="space-y-3"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update({ reset: false });
				};
			}}
		>
			{#if form?.formError === 'nothing'}
				<div
					role="alert"
					class="flex items-start gap-3 rounded-control bg-danger-50 p-3.5 text-sm text-danger-ink"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" />
					{m.tenant_readings_nothing()}
				</div>
			{/if}

			<div class="-mx-1 space-y-3 overflow-y-auto px-1 pb-1" use:fitViewport={160}>
				{#each data.sent as item (item.id)}
					{@const Icon = icons[item.type]}
					<div
						class="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
					>
						<div class="flex items-center gap-3">
							<span
								class="grid size-10 shrink-0 place-items-center rounded-control"
								style="background-color: color-mix(in srgb, {tints[
									item.type
								]} 16%, transparent); color: {tints[item.type]}"
							>
								<Icon class="size-5" />
							</span>
							<div>
								<p class="text-sm font-semibold">{labels[item.type]}</p>
								<p class="text-[13px] text-ink-muted">
									{m.tenant_sent_line({
										value: `${formatReading(item.values)} ${unitLabel(item.type === 'electricity' ? 'kwh' : 'm3')}`,
										date: shortDate(item.sentAt)
									})}
								</p>
							</div>
						</div>
						<span class="flex items-center gap-1.5 text-sm font-semibold text-success-ink">
							<CircleCheck class="size-4" />{m.tenant_reading_done()}
						</span>
					</div>
				{/each}

				{#each data.meters as meter (meter.id)}
					<MeterReadingCard
						{meter}
						previous={meter.previous}
						{errors}
						photos={data.capabilities.photos}
						rejectReason={meter.rejectReason}
						disabled={submitting}
						onready={(ready) => setReady(meter.id, ready)}
					/>
				{/each}
			</div>

			<div
				class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3"
			>
				<div class="flex items-center gap-3">
					<div class="flex gap-1.5" aria-hidden="true">
						{#each Array.from({ length: total }, (_, index) => index) as index (index)}
							<span
								class="h-1.5 w-7 rounded-full {index < done ? 'bg-success-ink' : 'bg-line-strong'}"
							></span>
						{/each}
					</div>
					<p class="text-sm font-semibold text-ink">{m.tenant_ready_count({ done, total })}</p>
				</div>
				<div class="flex gap-2">
					<Button variant="secondary" href="/tenant">{m.common_cancel()}</Button>
					<Button type="submit" loading={submitting} disabled={readyIds.length === 0}>
						{m.tenant_readings_send()}
					</Button>
				</div>
			</div>
		</form>

		<aside class="rounded-card border border-line bg-surface p-4">
			<h2 class="text-base font-semibold">{m.tenant_tips_title()}</h2>
			<ol class="mt-3 space-y-3">
				{#each tips as tip, index (tip[0])}
					<li class="flex gap-3">
						<span
							class="grid size-6 shrink-0 place-items-center rounded-md border border-line bg-canvas text-[11px] font-bold text-ink-soft"
						>
							{index + 1}
						</span>
						<div>
							<p class="text-sm font-semibold text-ink">{tip[0]}</p>
							<p class="mt-0.5 text-[13px] leading-snug text-ink-muted">{tip[1]}</p>
						</div>
					</li>
				{/each}
			</ol>
		</aside>
	</div>
{/if}
