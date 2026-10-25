<script lang="ts">
	import { enhance } from '$app/forms';
	import { fitViewport } from '#lib/utils/fit.js';
	import { Check, CircleAlert } from '@lucide/svelte';
	import type { AvatarColor } from '#lib/avatar-colors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { validIban } from '#lib/schemas/settings.js';
	import AppearanceCard from '#lib/components/domain/AppearanceCard.svelte';
	import ProfileCard from '#lib/components/domain/ProfileCard.svelte';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived((form?.values as Record<string, string> | undefined) ?? undefined);
	const errors = $derived(errorTexts((form?.errors as Record<string, string> | undefined) ?? {}));

	let saving = $state(false);
	let color = $derived<AvatarColor>(data.avatarColor as AvatarColor);
	let fullName = $derived(values?.fullName ?? data.profile.fullName);
	let iban = $derived(values?.iban ?? data.profile.iban);

	const normalizedIban = $derived(iban.replace(/\s+/g, '').toUpperCase());
	const ibanState = $derived(
		normalizedIban === '' ? 'empty' : validIban(normalizedIban) ? 'valid' : 'invalid'
	);
	const groupedIban = $derived(normalizedIban.replace(/(.{4})/g, '$1 ').trim());
</script>

<svelte:head><title>{m.nav_settings()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_settings()} subtitle={m.settings_subtitle()} />

<div>
	<form
		id="settings-form"
		method="POST"
		class="-mx-1 grid items-start gap-4 overflow-y-auto px-1 pb-1 lg:grid-cols-2"
		use:fitViewport
		use:enhance={() => {
			saving = true;
			return async ({ result, update }) => {
				saving = false;
				if (result.type === 'success') toast.success(m.common_saved());
				await update({ reset: false });
			};
		}}
	>
		<div class="space-y-4">
			<ProfileCard
				name={data.name}
				picture={data.picture}
				roleLabel={m.role_realtor()}
				uploadEnabled={data.avatarUploadEnabled}
				bind:color
			/>

			<AppearanceCard preference={data.themePreference} />
			<Card>
				<h2 class="text-base font-semibold">{m.settings_schedule_title()}</h2>
				<p class="mt-1 text-sm text-ink-muted">{m.settings_schedule_text()}</p>
				<div class="mt-4 grid gap-4 sm:grid-cols-2">
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
					<FormField
						label={m.settings_rent_day()}
						hint={m.settings_day_hint()}
						error={errors.rentDay}
					>
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
		</div>
		<div class="space-y-4">
			<Card>
				<h2 class="text-base font-semibold">{m.settings_payout_title()}</h2>
				<p class="mt-1 text-sm text-ink-muted">{m.settings_payout_text()}</p>
				<div class="mt-4 space-y-4">
					<div class="space-y-4">
						<FormField label={m.settings_full_name()} error={errors.fullName}>
							{#snippet children(field)}
								<Input
									name="fullName"
									defaultValue={fullName}
									oninput={(event) => (fullName = event.currentTarget.value)}
									{...field}
								/>
							{/snippet}
						</FormField>
						<FormField label="IBAN" error={errors.iban}>
							{#snippet children(field)}
								<Input
									name="iban"
									defaultValue={iban}
									oninput={(event) => (iban = event.currentTarget.value)}
									placeholder="UA00 0000 0000 0000 0000 0000 00000"
									class="font-mono tracking-wide uppercase"
									{...field}
								/>
								{#if ibanState === 'valid'}
									<p class="flex items-center gap-1.5 text-[13px] text-success-ink">
										<Check class="size-3.5" />{m.settings_iban_valid()}
									</p>
								{:else if ibanState === 'invalid'}
									<p class="flex items-center gap-1.5 text-[13px] text-danger-ink">
										<CircleAlert class="size-3.5" />{m.err_invalid_iban()}
									</p>
								{:else}
									<p class="text-[13px] text-ink-muted">{m.settings_iban_hint()}</p>
								{/if}
							{/snippet}
						</FormField>
						<FormField label={m.settings_tax_id()} error={errors.taxId}>
							{#snippet children(field)}
								<Input
									name="taxId"
									defaultValue={values?.taxId ?? data.profile.taxId}
									inputmode="numeric"
									maxlength={10}
									class="font-mono"
									{...field}
								/>
							{/snippet}
						</FormField>
					</div>

					<div>
						<p class="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-muted uppercase">
							{m.settings_preview_label()}
						</p>
						<div
							class="relative flex min-h-44 flex-col justify-between overflow-hidden rounded-card bg-primary-500 p-5 text-white"
						>
							<span
								class="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full border border-white/20"
							></span>
							<span
								class="pointer-events-none absolute -top-6 -right-6 size-28 rounded-full border border-white/20"
							></span>
							<div class="relative">
								<div class="flex items-start justify-between gap-2">
									<p class="text-xs text-white/80">{m.settings_preview_title()}</p>
									<span
										class="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap"
									>
										{m.settings_preview_status()}
									</span>
								</div>
								<p class="mt-2 text-2xl font-bold tracking-tight">{m.settings_preview_amount()}</p>
							</div>
							<div class="relative text-xs">
								<p class="text-white/70">{m.settings_preview_recipient()}</p>
								<p class="mt-0.5 text-[13px] font-semibold">{fullName || '—'}</p>
								<p class="mt-2 text-white/70">IBAN</p>
								<p class="mt-0.5 font-mono text-[11px] tracking-wide break-all">
									{groupedIban || '—'}
								</p>
							</div>
						</div>
					</div>
				</div>
			</Card>

			<div class="flex justify-end">
				<Button type="submit" loading={saving}>{m.common_save()}</Button>
			</div>
		</div>
	</form>
</div>
