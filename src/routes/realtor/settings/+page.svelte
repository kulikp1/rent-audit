<script lang="ts">
	import { enhance } from '$app/forms';
	import { fitViewport } from '#lib/utils/fit.js';
	import { invalidateAll } from '$app/navigation';
	import { Camera, Check, CircleAlert, LoaderCircle, Monitor, Moon, Sun } from '@lucide/svelte';
	import { avatarColorKeys, avatarColors, type AvatarColor } from '#lib/avatar-colors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';
	import { validIban } from '#lib/schemas/settings.js';
	import { setThemePreference, type ThemePreference } from '#lib/theme.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { resizeImage, uploadToCloudinary } from '#lib/utils/image.js';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	const values = $derived((form?.values as Record<string, string> | undefined) ?? undefined);
	const errors = $derived(errorTexts((form?.errors as Record<string, string> | undefined) ?? {}));

	let saving = $state(false);
	let uploadingAvatar = $state(false);
	let avatarInput = $state<HTMLInputElement>();
	let color = $derived<AvatarColor>(data.avatarColor as AvatarColor);
	let themePref = $derived<ThemePreference>(data.themePreference);
	let fullName = $derived(values?.fullName ?? data.profile.fullName);
	let iban = $derived(values?.iban ?? data.profile.iban);

	const currentLocale = getLocale();
	const localeNames: Record<string, string> = { uk: 'Українська', en: 'English' };

	const normalizedIban = $derived(iban.replace(/\s+/g, '').toUpperCase());
	const ibanState = $derived(
		normalizedIban === '' ? 'empty' : validIban(normalizedIban) ? 'valid' : 'invalid'
	);
	const groupedIban = $derived(normalizedIban.replace(/(.{4})/g, '$1 ').trim());

	const themes: { value: ThemePreference; label: () => string; icon: typeof Sun }[] = [
		{ value: 'light', label: () => m.settings_theme_light(), icon: Sun },
		{ value: 'dark', label: () => m.settings_theme_dark(), icon: Moon },
		{ value: 'system', label: () => m.settings_theme_system(), icon: Monitor }
	];

	async function changeAvatar(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		uploadingAvatar = true;
		try {
			const blob = await resizeImage(file, 512);
			const publicId = await uploadToCloudinary(blob, '/api/avatar/sign', 'avatar.jpg');
			const response = await fetch('/api/avatar', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ publicId })
			});
			if (!response.ok) throw new Error('save_failed');
			await invalidateAll();
			toast.success(m.settings_avatar_updated());
		} catch {
			toast.error(m.settings_avatar_error());
		} finally {
			uploadingAvatar = false;
		}
	}

	function chooseTheme(value: ThemePreference) {
		themePref = value;
		setThemePreference(value);
	}
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
			<Card>
				<div class="flex flex-wrap items-center gap-6">
					<span class="relative">
						<span
							class="block rounded-full p-1 ring-2 transition-colors"
							style="--tw-ring-color: {avatarColors[color]}"
						>
							<Avatar name={data.name} src={data.picture} {color} size="xl" />
						</span>
						{#if data.avatarUploadEnabled}
							<input
								bind:this={avatarInput}
								type="file"
								accept="image/*"
								class="sr-only"
								tabindex="-1"
								onchange={changeAvatar}
							/>
							<button
								type="button"
								aria-label={m.settings_avatar_change()}
								title={m.settings_avatar_change()}
								disabled={uploadingAvatar}
								onclick={() => avatarInput?.click()}
								class="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-surface bg-primary-500 text-white transition-colors hover:bg-primary-400 disabled:cursor-wait"
							>
								{#if uploadingAvatar}
									<LoaderCircle class="size-4 animate-spin" />
								{:else}
									<Camera class="size-4" />
								{/if}
							</button>
						{/if}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center gap-2">
							<h2 class="text-lg font-semibold tracking-tight text-ink">{data.name}</h2>
							<Badge tone="info">{m.role_realtor()}</Badge>
						</div>
						<p class="mt-1 text-[13px] text-ink-muted">{m.settings_profile_hint()}</p>
						<fieldset class="mt-4">
							<legend class="sr-only">{m.settings_avatar_color()}</legend>
							<div class="flex items-center gap-2.5">
								{#each avatarColorKeys as key (key)}
									<label class="relative cursor-pointer">
										<input
											type="radio"
											name="avatarColor"
											value={key}
											checked={color === key}
											onchange={() => (color = key)}
											class="peer sr-only"
										/>
										<span
											class="block size-8 rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500"
											style="background-color: {avatarColors[key]}; --tw-ring-color: {avatarColors[
												key
											]}"
										></span>
										<span class="sr-only">{key}</span>
									</label>
								{/each}
							</div>
						</fieldset>
					</div>
				</div>
			</Card>

			<Card>
				<h2 class="text-base font-semibold">{m.settings_appearance_title()}</h2>
				<p class="mt-1 text-sm text-ink-muted">{m.settings_appearance_text()}</p>

				<div
					role="radiogroup"
					aria-label={m.settings_appearance_title()}
					class="mt-4 grid grid-cols-3 gap-3"
				>
					{#each themes as option (option.value)}
						{@const selected = themePref === option.value}
						<button
							type="button"
							role="radio"
							aria-checked={selected}
							onclick={() => chooseTheme(option.value)}
							class="rounded-card border bg-canvas p-2 text-left transition-colors {selected
								? 'border-primary-500 ring-1 ring-primary-500'
								: 'border-line hover:border-line-strong'}"
						>
							<span class="relative flex h-14 overflow-hidden rounded-control" aria-hidden="true">
								{#if option.value !== 'dark'}
									<span
										class="flex flex-1 {option.value === 'system'
											? 'w-1/2 flex-none'
											: ''} bg-[#f6f7fb]"
									>
										<span class="w-1/3 bg-white"></span>
										<span class="flex flex-1 flex-col gap-1.5 p-2">
											<span class="h-1.5 w-1/2 rounded-full bg-[#cfd4e1]"></span>
											<span class="h-4 rounded bg-white"></span>
											<span class="h-1.5 w-1/3 rounded-full bg-primary-500"></span>
										</span>
									</span>
								{/if}
								{#if option.value !== 'light'}
									<span
										class="flex flex-1 {option.value === 'system'
											? 'w-1/2 flex-none'
											: ''} bg-night-950"
									>
										<span class="w-1/3 bg-[#0b0d16]"></span>
										<span class="flex flex-1 flex-col gap-1.5 p-2">
											<span class="h-1.5 w-1/2 rounded-full bg-night-700"></span>
											<span class="h-4 rounded bg-[#131625]"></span>
											<span class="h-1.5 w-1/3 rounded-full bg-primary-500"></span>
										</span>
									</span>
								{/if}
							</span>
							<span
								class="mt-2 flex items-center justify-between px-1 text-[13px] font-medium text-ink"
							>
								{option.label()}
								<span
									class="grid size-4 place-items-center rounded-full border {selected
										? 'border-primary-500'
										: 'border-line-strong'}"
								>
									{#if selected}<span class="size-2 rounded-full bg-primary-500"></span>{/if}
								</span>
							</span>
						</button>
					{/each}
				</div>

				<div
					class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4"
				>
					<div>
						<p class="text-sm font-semibold text-ink">{m.settings_language_title()}</p>
						<p class="mt-0.5 text-[13px] text-ink-muted">{m.settings_language_text()}</p>
					</div>
					<div
						role="group"
						aria-label={m.settings_language_title()}
						class="inline-flex rounded-full border border-line bg-canvas p-1 text-sm font-semibold"
					>
						{#each locales as locale (locale)}
							<button
								type="button"
								aria-pressed={locale === currentLocale}
								onclick={() => setLocale(locale)}
								class="rounded-full px-4 py-2 transition-colors {locale === currentLocale
									? 'bg-primary-500 text-white'
									: 'text-ink-muted hover:text-ink'}"
							>
								{localeNames[locale] ?? locale}
							</button>
						{/each}
					</div>
				</div>
			</Card>
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
