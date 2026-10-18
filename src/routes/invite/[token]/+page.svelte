<script lang="ts">
	import { enhance } from '$app/forms';
	import { CircleAlert, MapPin } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import LocaleSwitcher from '#lib/components/layout/LocaleSwitcher.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Logo from '#lib/components/ui/Logo.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	const errorMessages: Record<string, () => string> = {
		invalid: () => m.invite_error_invalid(),
		expired: () => m.invite_error_expired(),
		used: () => m.invite_error_used(),
		taken: () => m.invite_error_taken(),
		has_lease: () => m.invite_error_has_lease(),
		role: () => m.invite_error_role()
	};

	const errorText = $derived(() => {
		const code = data.error ?? form?.error;
		return code ? (errorMessages[code]?.() ?? m.error_generic()) : '';
	});
</script>

<svelte:head><title>{m.invite_title()} · {m.app_name()}</title></svelte:head>

<div class="flex min-h-dvh flex-col px-6 py-6">
	<div class="flex items-center justify-between">
		<Logo />
		<LocaleSwitcher />
	</div>

	<div class="m-auto w-full max-w-md py-12">
		<div class="rounded-dialog border border-line bg-surface p-8 shadow-card">
			<h1 class="text-2xl font-semibold tracking-tight">{m.invite_title()}</h1>

			{#if data.error}
				<div
					role="alert"
					class="mt-6 flex items-start gap-3 rounded-control border border-danger-600/20 bg-danger-50 p-3.5 text-sm text-danger-700"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" />
					<span>{errorText()}</span>
				</div>
			{:else}
				<p class="mt-2 text-sm text-ink-muted">{m.invite_from({ name: data.realtorName })}</p>

				<div class="mt-6 rounded-control bg-surface-muted p-4">
					<p class="font-medium text-ink">{data.apartment.name}</p>
					{#if data.apartment.address}
						<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
							<MapPin class="size-3.5" />
							{data.apartment.address}
						</p>
					{/if}
				</div>

				{#if form?.error}
					<p role="alert" class="mt-4 text-sm text-danger-600">{errorText()}</p>
				{/if}

				<form
					method="POST"
					action="?/accept"
					class="mt-6"
					use:enhance={() => {
						submitting = true;
						return async ({ result, update }) => {
							if (result.type === 'redirect' && result.location.startsWith('/auth/')) {
								window.location.assign(result.location);
								return;
							}
							submitting = false;
							await update();
						};
					}}
				>
					<Button type="submit" size="lg" fullWidth loading={submitting}>
						{data.viewerRole === 'tenant' ? m.invite_accept() : m.invite_accept_google()}
					</Button>
				</form>
				<p class="mt-4 text-xs leading-relaxed text-ink-faint">{m.invite_hint()}</p>
			{/if}
		</div>
	</div>
</div>
