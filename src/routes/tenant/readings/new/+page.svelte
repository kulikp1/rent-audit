<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { ArrowLeft, CircleAlert, CircleCheck } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import MeterReadingCard from '#lib/components/domain/MeterReadingCard.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { formatPeriod } from '#lib/utils/format.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	const errors = $derived(errorTexts((form?.errors as Record<string, string> | undefined) ?? {}));
	const subtitle = $derived(
		data.capabilities.photos ? m.tenant_photo_hint() : m.tenant_manual_hint()
	);
</script>

<svelte:head><title>{m.tenant_submit_readings()} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/tenant')}
	class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
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
			<CircleCheck class="size-5 text-success-600" />
			{m.tenant_readings_all_sent()}
		</div>
	</Card>
{:else}
	<form
		method="POST"
		class="max-w-2xl space-y-4"
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
				class="flex items-start gap-3 rounded-control bg-danger-50 p-3.5 text-sm text-danger-700"
			>
				<CircleAlert class="mt-0.5 size-4 shrink-0" />
				{m.tenant_readings_nothing()}
			</div>
		{/if}

		{#each data.meters as meter (meter.id)}
			<MeterReadingCard
				{meter}
				previous={meter.previous}
				{errors}
				photos={data.capabilities.photos}
				rejectReason={meter.rejectReason}
				disabled={submitting}
			/>
		{/each}

		<div class="flex justify-end gap-2 pt-2">
			<Button variant="secondary" href="/tenant">{m.common_cancel()}</Button>
			<Button type="submit" loading={submitting}>{m.tenant_readings_send()}</Button>
		</div>
	</form>
{/if}
