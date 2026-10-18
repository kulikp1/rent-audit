<script lang="ts">
	import { CircleAlert, ScanLine, ShieldCheck, ReceiptText } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import Logo from '#lib/components/ui/Logo.svelte';
	import LocaleSwitcher from '#lib/components/layout/LocaleSwitcher.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const features = $derived([
		{ icon: ScanLine, title: m.login_feature_ocr_title(), text: m.login_feature_ocr_text() },
		{
			icon: ShieldCheck,
			title: m.login_feature_validation_title(),
			text: m.login_feature_validation_text()
		},
		{
			icon: ReceiptText,
			title: m.login_feature_billing_title(),
			text: m.login_feature_billing_text()
		}
	]);

	const errorMessages: Record<string, () => string> = {
		cancelled: () => m.login_error_cancelled(),
		invalid: () => m.login_error_invalid(),
		google: () => m.login_error_google(),
		invite_invalid: () => m.invite_error_invalid(),
		invite_expired: () => m.invite_error_expired(),
		invite_used: () => m.invite_error_used(),
		invite_taken: () => m.invite_error_taken(),
		invite_role: () => m.invite_error_role(),
		invite_has_lease: () => m.invite_error_has_lease()
	};

	const errorText = $derived(data.error ? errorMessages[data.error]!() : '');
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<div class="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
	<aside
		class="relative hidden overflow-hidden bg-primary-900 p-12 text-white lg:flex lg:flex-col lg:justify-between"
	>
		<div
			class="pointer-events-none absolute -top-32 -right-32 size-[28rem] rounded-full bg-primary-600/40 blur-3xl"
		></div>
		<div
			class="pointer-events-none absolute -bottom-40 -left-24 size-[26rem] rounded-full bg-primary-500/25 blur-3xl"
		></div>

		<div class="relative"><Logo inverted size="lg" /></div>

		<div class="relative max-w-md">
			<h2 class="text-3xl leading-tight font-semibold tracking-tight">{m.app_tagline()}</h2>
			<ul class="mt-10 space-y-6">
				{#each features as feature (feature.title)}
					<li class="flex gap-4">
						<span
							class="grid size-10 shrink-0 place-items-center rounded-control bg-white/10 ring-1 ring-white/15"
						>
							<feature.icon class="size-5" />
						</span>
						<div>
							<p class="font-medium">{feature.title}</p>
							<p class="mt-0.5 text-sm text-white/70">{feature.text}</p>
						</div>
					</li>
				{/each}
			</ul>
		</div>

		<p class="relative text-xs text-white/50">© {new Date().getFullYear()} {m.app_name()}</p>
	</aside>

	<main class="relative flex flex-col px-6 py-6 sm:px-12">
		<div class="flex items-center justify-between">
			<span class="lg:hidden"><Logo /></span>
			<span class="ml-auto"><LocaleSwitcher /></span>
		</div>

		<div class="m-auto w-full max-w-sm py-12">
			<h1 class="text-[28px] font-semibold tracking-tight text-ink">{m.login_title()}</h1>
			<p class="mt-2 text-[15px] text-ink-muted">{m.login_subtitle()}</p>

			{#if errorText}
				<div
					role="alert"
					class="mt-6 flex items-start gap-3 rounded-control border border-danger-600/20 bg-danger-50 p-3.5 text-sm text-danger-700"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" />
					<span>{errorText}</span>
				</div>
			{/if}

			<a
				href={resolve('/auth/google')}
				data-sveltekit-reload
				class="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-control border border-line-strong bg-surface text-[15px] font-medium text-ink shadow-sm transition-all hover:bg-surface-muted hover:shadow-card active:bg-line"
			>
				<svg viewBox="0 0 48 48" class="size-5" aria-hidden="true">
					<path
						fill="#EA4335"
						d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
					/>
					<path
						fill="#4285F4"
						d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
					/>
					<path
						fill="#FBBC05"
						d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
					/>
					<path
						fill="#34A853"
						d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
					/>
				</svg>
				{m.login_google()}
			</a>

			<p class="mt-6 text-xs leading-relaxed text-ink-faint">{m.login_terms()}</p>
		</div>
	</main>
</div>
