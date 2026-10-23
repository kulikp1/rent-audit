<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
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
	import type { TariffView } from '#lib/server/billing/tariffs.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let addOpen = $state(false);
	let editOpen = $state(false);
	let editing = $state<TariffView | null>(null);

	const sections = $derived([
		{ service: 'electricity' as const, title: m.meter_electricity(), rows: data.electricity },
		{ service: 'gas' as const, title: m.meter_gas(), rows: data.gas },
		{ service: 'water' as const, title: m.meter_water(), rows: data.water }
	]);

	function startEdit(row: TariffView) {
		editing = row;
		editOpen = true;
	}

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
			{m.tariff_add()}
		</Button>
	{/snippet}
</PageHeader>

<div class="space-y-6">
	{#each sections as section (section.service)}
		<Card padded={false}>
			<div class="border-b border-line px-5 py-4">
				<h2 class="text-base font-semibold">{section.title}</h2>
			</div>
			{#if section.rows.length === 0}
				<p class="px-5 py-8 text-center text-sm text-ink-muted">{m.tariff_empty_hint()}</p>
			{:else}
				<div class="table-scroll" use:fitViewport>
					<TariffTable
						rows={section.rows}
						service={section.service}
						onedit={startEdit}
						ondelete={(row) => remove(row.id)}
					/>
				</div>
			{/if}
		</Card>
	{/each}
</div>

<FormModal
	bind:open={addOpen}
	title={m.tariff_add()}
	description={m.tariff_add_text()}
	action="?/add"
	submitLabel={m.common_create()}
	onsuccess={() => toast.success(m.tariff_added())}
>
	{#snippet children({ errors })}
		<TariffFields services={['electricity', 'gas', 'water']} errors={errorTexts(errors)} />
	{/snippet}
</FormModal>

{#if editing}
	{#key editing.id}
		<FormModal
			bind:open={editOpen}
			title={m.tariff_edit_title()}
			description={new Date(editing.effectiveFrom).getTime() <= Date.now()
				? m.tariff_edit_in_effect()
				: m.tariff_add_text()}
			action="?/edit"
			onsuccess={() => toast.success(m.tariff_updated())}
		>
			{#snippet children({ errors })}
				<input type="hidden" name="id" value={editing!.id} />
				<TariffFields
					services={[editing!.service]}
					errors={errorTexts(errors)}
					values={editing!}
					lockDate={new Date(editing!.effectiveFrom).getTime() <= Date.now()}
				/>
			{/snippet}
		</FormModal>
	{/key}
{/if}
