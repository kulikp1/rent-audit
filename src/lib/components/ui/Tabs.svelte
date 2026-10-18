<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';

	type Tab = { id: string; label: string };

	let { tabs, active, base }: { tabs: Tab[]; active: string; base: string } = $props();
</script>

<nav class="mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Tabs">
	{#each tabs as tab (tab.id)}
		<a
			href="{pathTo(base)}?tab={tab.id}"
			data-sveltekit-reset="false"
			aria-current={tab.id === active ? 'page' : undefined}
			class="-mb-px border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors {tab.id ===
			active
				? 'border-primary-600 text-primary-700'
				: 'border-transparent text-ink-muted hover:text-ink'}"
		>
			{tab.label}
		</a>
	{/each}
</nav>
