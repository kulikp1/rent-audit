<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import TariffFields from '#lib/components/domain/TariffFields.svelte';
	import TariffTable from '#lib/components/domain/TariffTable.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { postAction } from '#lib/utils/actions.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let addOpen = $state(false);

	async function remove(id: string) {
		const confirmed = await dialog.confirm({
			title: m.tariff_delete_title(),
			description: m.tariff_delete_text(),
			confirmLabel: m.common_delete(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/remove', { id });
		if (result.type === 'success') toast.success(m.tariff_deleted());
		else toast.error(m.error_generic());
	}
</script>

<svelte:head><title>{m.nav_tariffs()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_tariffs()} subtitle={m.tariff_realtor_subtitle()}>
	{#snippet actions()}
		<Button onclick={() => (addOpen = true)}>
			{#snippet icon()}<Plus class="size-4" />{/snippet}
			{m.tariff_add_water()}
		</Button>
	{/snippet}
</PageHeader>

<div class="space-y-6">
	<Card padded={false}>
		<div class="border-b border-line px-5 py-4">
			<h2 class="text-base font-semibold">{m.meter_water()}</h2>
			<p class="mt-0.5 text-sm text-ink-muted">{m.tariff_local_text()}</p>
		</div>
		{#if data.water.length === 0}
			<p class="px-5 py-8 text-center text-sm text-ink-muted">{m.tariff_water_empty()}</p>
		{:else}
			<div class="overflow-x-auto">
				<TariffTable rows={data.water} service="water" ondelete={(row) => remove(row.id)} />
			</div>
		{/if}
	</Card>

	<div class="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-2">
		<Card padded={false}>
			<div class="border-b border-line px-5 py-4">
				<h2 class="text-base font-semibold">{m.meter_electricity()}</h2>
				<p class="mt-0.5 text-sm text-ink-muted">{m.tariff_national_text()}</p>
			</div>
			{#if data.electricity.length === 0}
				<p class="px-5 py-8 text-center text-sm text-ink-muted">{m.tariff_empty()}</p>
			{:else}
				<div class="overflow-x-auto">
					<TariffTable rows={data.electricity} service="electricity" />
				</div>
			{/if}
		</Card>
		<Card padded={false}>
			<div class="border-b border-line px-5 py-4">
				<h2 class="text-base font-semibold">{m.meter_gas()}</h2>
				<p class="mt-0.5 text-sm text-ink-muted">{m.tariff_national_text()}</p>
			</div>
			{#if data.gas.length === 0}
				<p class="px-5 py-8 text-center text-sm text-ink-muted">{m.tariff_empty()}</p>
			{:else}
				<div class="overflow-x-auto"><TariffTable rows={data.gas} service="gas" /></div>
			{/if}
		</Card>
	</div>
</div>

<FormModal
	bind:open={addOpen}
	title={m.tariff_add_water()}
	description={m.tariff_add_text()}
	action="?/add"
	submitLabel={m.common_create()}
	onsuccess={() => toast.success(m.tariff_added())}
>
	{#snippet children({ errors })}
		<TariffFields services={['water']} errors={errorTexts(errors)} />
	{/snippet}
</FormModal>
