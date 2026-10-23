<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { pathTo } from '#lib/utils/path.js';
	import { Building2, Ellipsis, ExternalLink, Pencil, Plus, Search, Trash2 } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ApartmentFields from '#lib/components/domain/ApartmentFields.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Select from '#lib/components/ui/Select.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { formatMoney } from '#lib/utils/format.js';
	import { rowLink } from '#lib/utils/row-link.js';
	import { postAction } from '#lib/utils/actions.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let createOpen = $state(false);
	let editOpen = $state(false);
	let editing = $state<(typeof data.apartments)[number] | null>(null);
	let search = $state('');
	let status = $state('all');

	const filtered = $derived(
		data.apartments.filter((apartment) => {
			const query = search.trim().toLowerCase();
			const matches =
				!query ||
				apartment.name.toLowerCase().includes(query) ||
				apartment.address.toLowerCase().includes(query);
			return matches && (status === 'all' || apartment.status === status);
		})
	);

	const statusOptions = $derived([
		{ value: 'all', label: m.apt_filter_all() },
		{ value: 'free', label: m.status_free() },
		{ value: 'rented', label: m.status_rented() }
	]);

	function rowItems(apartment: (typeof data.apartments)[number]) {
		return [
			{ label: m.common_open(), icon: ExternalLink, href: `/realtor/apartments/${apartment.id}` },
			{ label: m.common_edit(), icon: Pencil, onselect: () => startEdit(apartment) },
			{
				label: m.common_delete(),
				icon: Trash2,
				tone: 'danger' as const,
				onselect: () => remove(apartment)
			}
		];
	}

	function startEdit(apartment: (typeof data.apartments)[number]) {
		editing = apartment;
		editOpen = true;
	}

	async function remove(apartment: (typeof data.apartments)[number]) {
		const confirmed = await dialog.confirm({
			title: m.apt_delete_title({ name: apartment.name }),
			description: m.apt_delete_text(),
			confirmLabel: m.common_delete(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/delete', { id: apartment.id });
		if (result.type === 'failure') toast.error(m.apt_delete_has_tenant());
		else if (result.type === 'success') toast.success(m.apt_deleted());
		else toast.error(m.error_generic());
	}
</script>

<svelte:head><title>{m.nav_apartments()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_apartments()} subtitle={m.apartments_subtitle()}>
	{#snippet actions()}
		<Button onclick={() => (createOpen = true)}>
			{#snippet icon()}<Plus class="size-4" />{/snippet}
			{m.apartments_add()}
		</Button>
	{/snippet}
</PageHeader>

{#if data.apartments.length === 0}
	<Card padded={false}>
		<EmptyState title={m.empty_apartments_title()} text={m.empty_apartments_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
			{#snippet action()}
				<Button onclick={() => (createOpen = true)}>
					{#snippet icon()}<Plus class="size-4" />{/snippet}
					{m.apartments_add()}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{:else}
	<Card padded={false}>
		<div class="flex flex-wrap items-center gap-3 border-b border-line p-4">
			<div class="relative w-full max-w-xs">
				<Search
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint"
				/>
				<Input
					oninput={(event) => (search = event.currentTarget.value)}
					placeholder={m.apt_search()}
					class="pl-9"
					aria-label={m.apt_search()}
				/>
			</div>
			<div class="w-44">
				<Select bind:value={status} options={statusOptions} />
			</div>
		</div>

		{#if filtered.length === 0}
			<p class="px-6 py-12 text-center text-sm text-ink-muted">{m.apt_nothing_found()}</p>
		{:else}
			<div class="table-scroll hidden md:block" use:fitViewport>
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-ink-muted uppercase">
						<tr class="border-b border-line">
							<th class="px-5 py-3 font-medium">{m.apt_name()}</th>
							<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
							<th class="px-5 py-3 font-medium">{m.apt_tenant()}</th>
							<th class="px-5 py-3 text-right font-medium">{m.apt_rent()}</th>
							<th class="w-14 px-3 py-3"><span class="sr-only">{m.common_actions()}</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each filtered as apartment (apartment.id)}
							<tr
								use:rowLink={`/realtor/apartments/${apartment.id}`}
								class="cursor-pointer transition-colors hover:bg-surface-muted/60"
							>
								<td class="px-5 py-3.5">
									<a
										href={pathTo(`/realtor/apartments/${apartment.id}`)}
										class="font-medium text-ink hover:text-primary-700"
									>
										{apartment.name}
									</a>
									{#if apartment.address}
										<p class="mt-0.5 text-[13px] text-ink-muted">{apartment.address}</p>
									{/if}
								</td>
								<td class="px-5 py-3.5">
									<Badge tone={apartment.status === 'rented' ? 'success' : 'neutral'}>
										{apartment.status === 'rented' ? m.status_rented() : m.status_free()}
									</Badge>
								</td>
								<td class="px-5 py-3.5 text-ink-soft"
									>{apartment.tenantName ?? m.apt_no_tenant()}</td
								>
								<td class="px-5 py-3.5 text-right font-medium tabular-nums">
									{formatMoney(apartment.rentAmount)}
								</td>
								<td class="px-3 py-3.5 text-right">
									<Menu
										label={m.common_actions()}
										triggerClass="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
										items={rowItems(apartment)}
									>
										{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
									</Menu>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<ul class="divide-y divide-line md:hidden">
				{#each filtered as apartment (apartment.id)}
					<li class="flex items-start gap-2 p-4">
						<a href={pathTo(`/realtor/apartments/${apartment.id}`)} class="min-w-0 flex-1">
							<span class="block font-medium text-ink">{apartment.name}</span>
							{#if apartment.address}
								<span class="mt-0.5 block truncate text-[13px] text-ink-muted"
									>{apartment.address}</span
								>
							{/if}
							<span class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
								<Badge tone={apartment.status === 'rented' ? 'success' : 'neutral'}>
									{apartment.status === 'rented' ? m.status_rented() : m.status_free()}
								</Badge>
								<span class="text-sm text-ink-soft"
									>{apartment.tenantName ?? m.apt_no_tenant()}</span
								>
							</span>
							<span class="mt-2 block text-base font-semibold tabular-nums">
								{formatMoney(apartment.rentAmount)}
							</span>
						</a>
						<Menu
							label={m.common_actions()}
							triggerClass="grid size-10 shrink-0 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
							items={rowItems(apartment)}
						>
							{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
						</Menu>
					</li>
				{/each}
			</ul>
		{/if}
	</Card>
{/if}

<FormModal
	bind:open={createOpen}
	title={m.apartments_add()}
	action="?/create"
	submitLabel={m.common_create()}
>
	{#snippet children({ errors })}
		<ApartmentFields errors={errorTexts(errors)} />
	{/snippet}
</FormModal>

{#if editing}
	<FormModal
		bind:open={editOpen}
		title={m.apt_edit_title()}
		action="?/update"
		onsuccess={() => toast.success(m.common_saved())}
	>
		{#snippet children({ errors })}
			<input type="hidden" name="id" value={editing!.id} />
			<ApartmentFields
				errors={errorTexts(errors)}
				showRent={false}
				values={{ name: editing!.name, address: editing!.address, residents: editing!.residents }}
			/>
		{/snippet}
	</FormModal>
{/if}
