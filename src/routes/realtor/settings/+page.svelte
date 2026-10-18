<script lang="ts">
	import { enhance } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let saving = $state(false);

	const errors = $derived(errorTexts((form?.errors as Record<string, string> | undefined) ?? {}));
	const values = $derived((form?.values as Record<string, string> | undefined) ?? undefined);
</script>

<svelte:head><title>{m.nav_settings()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_settings()} subtitle={m.settings_subtitle()} />

<form
	method="POST"
	class="max-w-2xl space-y-6"
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') toast.success(m.common_saved());
			await update({ reset: false });
		};
	}}
>
	<Card>
		<h2 class="text-base font-semibold">{m.settings_payout_title()}</h2>
		<p class="mt-1 text-sm text-ink-muted">{m.settings_payout_text()}</p>
		<div class="mt-5 space-y-4">
			<FormField label={m.settings_full_name()} error={errors.fullName}>
				{#snippet children(field)}
					<Input
						name="fullName"
						defaultValue={values?.fullName ?? data.profile.fullName}
						{...field}
					/>
				{/snippet}
			</FormField>
			<FormField label="IBAN" hint={m.settings_iban_hint()} error={errors.iban}>
				{#snippet children(field)}
					<Input
						name="iban"
						defaultValue={values?.iban ?? data.profile.iban}
						placeholder="UA00 0000 0000 0000 0000 0000 00000"
						class="tracking-wide uppercase"
						{...field}
					/>
				{/snippet}
			</FormField>
			<FormField label={m.settings_tax_id()} error={errors.taxId}>
				{#snippet children(field)}
					<Input
						name="taxId"
						defaultValue={values?.taxId ?? data.profile.taxId}
						inputmode="numeric"
						maxlength={10}
						{...field}
					/>
				{/snippet}
			</FormField>
		</div>
	</Card>

	<Card>
		<h2 class="text-base font-semibold">{m.settings_schedule_title()}</h2>
		<p class="mt-1 text-sm text-ink-muted">{m.settings_schedule_text()}</p>
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			<FormField
				label={m.settings_readings_day()}
				hint={m.settings_day_hint()}
				error={errors.readingsDay}
			>
				{#snippet children(field)}
					<Input
						name="readingsDay"
						type="number"
						min="1"
						max="28"
						defaultValue={values?.readingsDay ?? data.profile.readingsDay}
						{...field}
					/>
				{/snippet}
			</FormField>
			<FormField label={m.settings_rent_day()} hint={m.settings_day_hint()} error={errors.rentDay}>
				{#snippet children(field)}
					<Input
						name="rentDay"
						type="number"
						min="1"
						max="28"
						defaultValue={values?.rentDay ?? data.profile.rentDay}
						{...field}
					/>
				{/snippet}
			</FormField>
		</div>
	</Card>

	<div class="flex justify-end">
		<Button type="submit" loading={saving}>{m.common_save()}</Button>
	</div>
</form>
