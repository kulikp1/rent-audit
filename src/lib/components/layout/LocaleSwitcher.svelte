<script lang="ts">
	import { getLocale, setLocale, locales } from '#lib/paraglide/runtime.js';
	import { m } from '#lib/paraglide/messages.js';

	let { tone = 'light' }: { tone?: 'light' | 'dark' | 'night' | 'pill' } = $props();

	const current = getLocale();
</script>

<div
	role="group"
	aria-label={m.common_language()}
	class="inline-flex p-0.5 text-xs font-semibold {tone === 'night'
		? 'rounded-full border border-white/10 bg-white/[0.03] p-1'
		: tone === 'pill'
			? 'rounded-full border border-line bg-surface-muted p-1'
			: tone === 'dark'
				? 'rounded-control bg-white/10'
				: 'rounded-control bg-surface-muted'}"
>
	{#each locales as locale (locale)}
		<button
			type="button"
			aria-pressed={locale === current}
			onclick={() => setLocale(locale)}
			class="uppercase transition-colors {tone === 'night' || tone === 'pill'
				? 'rounded-full px-4 py-2'
				: 'rounded-[8px] px-2.5 py-1'} {locale === current
				? tone === 'night' || tone === 'pill'
					? 'bg-primary-500 text-white'
					: tone === 'dark'
						? 'bg-white text-ink shadow-sm'
						: 'bg-surface text-ink shadow-sm'
				: tone === 'pill'
					? 'text-ink-muted hover:text-ink'
					: tone === 'dark' || tone === 'night'
						? 'text-white/70 hover:text-white'
						: 'text-ink-muted hover:text-ink'}"
		>
			{locale}
		</button>
	{/each}
</div>
