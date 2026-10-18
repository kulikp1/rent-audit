<script lang="ts">
	import { getLocale, setLocale, locales } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';

	let { tone = 'light' }: { tone?: 'light' | 'dark' } = $props();

	const current = getLocale();
</script>

<div
	role="group"
	aria-label={m.common_language()}
	class="inline-flex rounded-control p-0.5 text-xs font-semibold {tone === 'dark'
		? 'bg-white/10'
		: 'bg-surface-muted'}"
>
	{#each locales as locale (locale)}
		<button
			type="button"
			aria-pressed={locale === current}
			onclick={() => setLocale(locale)}
			class="rounded-[8px] px-2.5 py-1 uppercase transition-colors {locale === current
				? tone === 'dark'
					? 'bg-white text-ink shadow-sm'
					: 'bg-surface text-ink shadow-sm'
				: tone === 'dark'
					? 'text-white/70 hover:text-white'
					: 'text-ink-muted hover:text-ink'}"
		>
			{locale}
		</button>
	{/each}
</div>
