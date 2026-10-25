<script lang="ts">
	import { ArrowRight, CircleAlert } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import '@fontsource-variable/unbounded';
	import '@fontsource-variable/onest';
	import '@fontsource-variable/jetbrains-mono';
	import CycleRing from '#lib/components/ui/CycleRing.svelte';
	import LocaleSwitcher from '#lib/components/layout/LocaleSwitcher.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

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

	const tags = $derived([
		m.login_tag_readings(),
		m.login_tag_check(),
		m.login_tag_invoices(),
		m.login_tag_anomalies()
	]);

	const errorText = $derived(data.error ? errorMessages[data.error]!() : '');
</script>

<svelte:head>
	<title>{m.login_title()} · {m.app_name()}</title>
</svelte:head>

<div
	class="relative grid min-h-dvh bg-night-950 font-onest text-white lg:h-dvh lg:grid-cols-[1fr_23.5rem] lg:overflow-hidden"
>
	<div class="absolute top-6 right-6 z-10 lg:right-8">
		<LocaleSwitcher tone="night" />
	</div>

	<section class="relative flex flex-col px-6 pt-8 pb-8 sm:px-12 lg:px-16 lg:py-14">
		<a href={resolve('/login')} class="font-display text-lg font-extrabold tracking-tight">
			Rent<span class="text-primary-300">Audit</span>
		</a>

		<div
			class="my-auto flex flex-col items-center gap-10 py-12 md:flex-row md:justify-center md:gap-14 lg:gap-20"
		>
			<div class="hidden w-full max-w-[19.5rem] shrink-0 md:block">
				<CycleRing />
			</div>
			<div class="max-w-sm">
				<h2
					class="font-display text-[2.4rem] leading-[1.05] font-extrabold tracking-tight sm:text-[2.75rem]"
				>
					{m.login_hero_line1()}
					<span class="block text-primary-300">{m.login_hero_line2()}</span>
				</h2>
				<p class="mt-6 max-w-xs text-[15px] leading-relaxed text-white/60">
					{m.login_hero_text()}
				</p>
			</div>
		</div>

		<p class="hidden font-tag text-[11px] tracking-[0.12em] text-white/55 md:block">
			{tags.join(' · ')}
		</p>
	</section>

	<main
		class="relative flex flex-col border-t border-white/[0.08] px-6 py-10 sm:px-12 lg:border-t-0 lg:border-l lg:px-8 lg:py-14"
	>
		<div class="my-auto w-full max-w-sm py-8 lg:max-w-none">
			<h1 class="font-display text-[1.75rem] leading-[1.05] font-extrabold tracking-tight">
				{m.login_title()}
			</h1>
			<p class="mt-4 text-[15px] leading-relaxed text-white/60">{m.login_subtitle()}</p>

			{#if errorText}
				<div
					role="alert"
					class="mt-6 flex items-start gap-3 rounded-control border border-danger-600/40 bg-danger-600/10 p-3.5 text-sm text-red-200"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" />
					<span>{errorText}</span>
				</div>
			{/if}

			<a
				href={resolve('/auth/google')}
				data-sveltekit-reload
				class="group mt-8 flex h-14 w-full items-center gap-3 rounded-full bg-primary-500 pr-5 pl-3 font-display text-sm font-semibold text-white shadow-[0_8px_28px_-8px_var(--color-primary-500)] transition-all hover:bg-primary-400 active:bg-primary-600"
			>
				<span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white">
					<svg viewBox="0 0 48 48" class="size-[18px]" aria-hidden="true">
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
				</span>
				<span class="flex-1">{m.login_google()}</span>
				<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
			</a>

			<p class="mt-5 text-[13px] leading-snug text-white/90">{m.login_invite_hint()}</p>
		</div>

		<div class="mt-auto text-[11px] leading-relaxed text-white/45">
			<p>{m.login_terms()}</p>
			<p class="mt-4">© {new Date().getFullYear()} {m.app_name()}</p>
		</div>
	</main>
</div>
