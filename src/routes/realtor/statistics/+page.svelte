<script lang="ts">
	import { goto } from '$app/navigation';
	import { Building2 } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import StatisticsView from '#lib/components/domain/StatisticsView.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { pathTo } from '#lib/utils/path.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let selected = $derived(data.selectedId ?? '');

	const options = $derived(data.apartments.map((item) => ({ value: item.id, label: item.name })));
</script>

<svelte:head><title>{m.nav_statistics()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_statistics()} subtitle={m.stats_subtitle()}>
	{#snippet actions()}
		{#if data.apartments.length > 0}
			<div class="w-64">
				<Select
					bind:value={selected}
					{options}
					onchange={(value) => goto(pathTo(`/realtor/statistics?apartment=${value}`))}
				/>
			</div>
		{/if}
	{/snippet}
</PageHeader>

{#if data.apartments.length === 0}
	<Card padded={false}>
		<EmptyState title={m.empty_apartments_title()} text={m.empty_apartments_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
		</EmptyState>
	</Card>
{:else}
	<StatisticsView stats={data.stats} />
{/if}
