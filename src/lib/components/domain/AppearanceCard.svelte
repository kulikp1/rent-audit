<script lang="ts">
	import { Monitor, Moon, Sun } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale, locales, setLocale } from '#lib/paraglide/runtime.js';
	import { setThemePreference, type ThemePreference } from '#lib/theme.svelte.js';
	import Card from '../ui/Card.svelte';

	let { preference }: { preference: ThemePreference } = $props();

	let themePref = $derived<ThemePreference>(preference);

	const currentLocale = getLocale();
	const localeNames: Record<string, string> = { uk: 'Українська', en: 'English' };

	const themes: { value: ThemePreference; label: () => string; icon: typeof Sun }[] = [
		{ value: 'light', label: () => m.settings_theme_light(), icon: Sun },
		{ value: 'dark', label: () => m.settings_theme_dark(), icon: Moon },
		{ value: 'system', label: () => m.settings_theme_system(), icon: Monitor }
	];

	function chooseTheme(value: ThemePreference) {
		themePref = value;
		setThemePreference(value);
	}
</script>

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
							class="flex flex-1 {option.value === 'system' ? 'w-1/2 flex-none' : ''} bg-[#f6f7fb]"
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
							class="flex flex-1 {option.value === 'system' ? 'w-1/2 flex-none' : ''} bg-night-950"
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
				<span class="mt-2 flex items-center justify-between px-1 text-[13px] font-medium text-ink">
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

	<div class="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
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
