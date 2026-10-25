<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import {
		Building2,
		Droplet,
		Ellipsis,
		ExternalLink,
		Flame,
		Link,
		Pencil,
		Plus,
		Search,
		Trash2,
		Zap
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ApartmentFields from '#lib/components/domain/ApartmentFields.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import Modal from '#lib/components/overlay/Modal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import CopyField from '#lib/components/ui/CopyField.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { serviceLabel } from '#lib/utils/invoice.js';
	import { postAction } from '#lib/utils/actions.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let createOpen = $state(false);
	let editOpen = $state(false);
	let editing = $state<(typeof data.apartments)[number] | null>(null);
	let search = $state('');
	let status = $state<'all' | 'rented' | 'free'>('all');
	let inviteOpen = $state(false);
	let inviteUrl = $state('');
	let inviteCopy = $state<{ copy: () => Promise<void> }>();
	let invitingId = $state('');

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

	const rentedCount = $derived(data.apartments.filter((item) => item.status === 'rented').length);
	const freeCount = $derived(data.apartments.length - rentedCount);
	const income = $derived(
		data.apartments
			.filter((item) => item.status === 'rented')
			.reduce((sum, item) => sum + item.rentAmount, 0)
	);

	const filters = $derived([
		{ value: 'all' as const, label: m.apt_filter_all_short(), count: data.apartments.length },
		{ value: 'rented' as const, label: m.status_rented(), count: rentedCount },
		{ value: 'free' as const, label: m.status_free(), count: freeCount }
	]);

	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');
	const formatAmount = (amount: number) =>
		new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(amount);

	const meterIcons = { water: Droplet, gas: Flame, electricity: Zap };
	const meterTones = {
		received: 'bg-success-50 text-success-ink',
		waiting: 'bg-warning-50 text-warning-ink',
		problem: 'bg-danger-50 text-danger-ink'
	};
	const meterStatusLabels = $derived({
		received: m.apt_meter_received(),
		waiting: m.apt_meter_waiting(),
		problem: m.apt_meter_problem()
	});

	async function copyInvite(apartment: (typeof data.apartments)[number]) {
		if (apartment.hasInvite) {
			const confirmed = await dialog.confirm({
				title: m.invite_regenerate_title(),
				description: m.invite_regenerate_text(),
				confirmLabel: m.invite_regenerate()
			});
			if (!confirmed) return;
		}
		invitingId = apartment.id;
		const result = await postAction('?/createInvite', { id: apartment.id });
		invitingId = '';
		if (result.type === 'success' && result.data?.inviteUrl) {
			inviteUrl = String(result.data.inviteUrl);
			inviteOpen = true;
		} else {
			toast.error(m.error_generic());
		}
	}

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
	<div class="grid gap-3 sm:grid-cols-3 sm:gap-4">
		{#each [{ label: m.apartments_stat_total(), value: String(data.apartments.length) }, { label: m.apartments_stat_rented(), value: `${rentedCount} / ${data.apartments.length}` }, { label: m.apartments_stat_income(), value: `${formatAmount(income)} ₴` }] as stat (stat.label)}
			<div class="rounded-card border border-line bg-surface px-5 py-4">
				<p class="text-xs text-ink-muted">{stat.label}</p>
				<p class="mt-1 font-mono text-2xl font-bold tracking-tight tabular-nums">{stat.value}</p>
			</div>
		{/each}
	</div>

	<div class="mt-6 flex flex-wrap items-center justify-between gap-3">
		<div class="relative w-full max-w-sm">
			<Search
				class="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-faint"
			/>
			<Input
				oninput={(event) => (search = event.currentTarget.value)}
				placeholder={m.apt_search()}
				class="h-11 rounded-full bg-surface pl-10"
				aria-label={m.apt_search()}
			/>
		</div>
		<div
			role="group"
			aria-label={m.apt_status()}
			class="inline-flex rounded-full border border-line bg-surface p-1 text-sm font-semibold"
		>
			{#each filters as filter (filter.value)}
				<button
					type="button"
					aria-pressed={status === filter.value}
					onclick={() => (status = filter.value)}
					class="flex items-center gap-2 rounded-full px-4 py-2 transition-colors {status ===
					filter.value
						? 'bg-primary-500 text-white'
						: 'text-ink-muted hover:text-ink'}"
				>
					{filter.label}
					<span class="text-[11px] {status === filter.value ? 'text-white/80' : 'text-ink-faint'}">
						{filter.count}
					</span>
				</button>
			{/each}
		</div>
	</div>

	{#if filtered.length === 0}
		<p class="px-6 py-16 text-center text-sm text-ink-muted">{m.apt_nothing_found()}</p>
	{:else}
		<div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			{#each filtered as apartment (apartment.id)}
				{@const rented = apartment.status === 'rented'}
				<div
					class="relative flex flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-colors hover:border-line-strong"
				>
					<div class="flex items-start gap-3">
						<span
							class="grid size-11 shrink-0 place-items-center rounded-control {rented
								? 'bg-primary-50 text-primary-ink'
								: 'bg-surface-muted text-ink-muted'}"
						>
							<Building2 class="size-5" />
						</span>
						<div class="min-w-0 flex-1">
							<a
								href={pathTo(`/realtor/apartments/${apartment.id}`)}
								class="block truncate font-semibold text-ink after:absolute after:inset-0 after:content-[''] hover:text-primary-ink"
							>
								{apartment.name}
							</a>
							<p class="mt-0.5 truncate text-[13px] text-ink-muted">
								{apartment.address || m.apt_no_address()}
							</p>
						</div>
						<span class="relative z-10 -mt-1 -mr-2">
							<Menu
								label={m.common_actions()}
								triggerClass="grid size-9 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
								items={rowItems(apartment)}
							>
								{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
							</Menu>
						</span>
					</div>

					<div
						class="flex items-center gap-3 rounded-control border px-3.5 py-3 {rented
							? 'border-line bg-canvas'
							: 'border-dashed border-line-strong'}"
					>
						{#if apartment.tenant}
							<Avatar
								name={apartment.tenant.name}
								src={apartment.tenant.picture}
								color={apartment.tenant.avatarColor}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="text-[11px] text-ink-muted">{m.apt_tenant_label()}</p>
								<p class="truncate text-sm font-semibold text-ink">{apartment.tenant.name}</p>
							</div>
						{:else}
							<span
								class="grid size-8 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-ink-faint"
							>
								<Plus class="size-4" />
							</span>
							<p class="min-w-0 flex-1 text-sm text-ink-muted">{m.apt_no_tenant_yet()}</p>
						{/if}
						<Badge tone={rented ? 'success' : 'neutral'}>
							{rented ? m.status_rented() : m.status_free()}
						</Badge>
					</div>

					<div class="mt-auto flex items-end justify-between gap-3">
						<div>
							<p class="text-[11px] text-ink-muted">{m.apt_rent_label()}</p>
							<p class="mt-0.5 font-mono text-xl font-bold tracking-tight tabular-nums">
								{formatAmount(apartment.rentAmount)}
								<span class="text-xs font-semibold text-ink-muted">{m.apt_per_month()}</span>
							</p>
						</div>
						{#if rented}
							<div class="flex items-center gap-1.5">
								{#each apartment.meters as meter (meter.id)}
									{@const MeterIcon = meterIcons[meter.type]}
									<span
										title="{serviceLabel(meter.type)} · {meterStatusLabels[meter.status]}"
										class="grid size-8 place-items-center rounded-control {meterTones[
											meter.status
										]}"
									>
										<MeterIcon class="size-4" />
									</span>
								{/each}
							</div>
						{:else}
							<span class="relative z-10">
								<Button
									variant="secondary"
									size="sm"
									loading={invitingId === apartment.id}
									onclick={() => copyInvite(apartment)}
								>
									{#snippet icon()}<Link class="size-3.5" />{/snippet}
									{m.apt_copy_invite()}
								</Button>
							</span>
						{/if}
					</div>
				</div>
			{/each}

			{#if status === 'all' && !search.trim()}
				<button
					type="button"
					onclick={() => (createOpen = true)}
					class="flex min-h-48 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line-strong text-sm font-semibold text-ink-soft transition-colors hover:border-primary-500 hover:text-ink"
				>
					<span class="grid size-11 place-items-center rounded-control bg-surface-muted">
						<Plus class="size-5" />
					</span>
					{m.apartments_add()}
				</button>
			{/if}
		</div>
	{/if}
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

<Modal
	bind:open={inviteOpen}
	size="md"
	title={m.invite_link_title()}
	description={m.invite_link_text()}
	onconfirm={() => inviteCopy?.copy()}
>
	<CopyField bind:this={inviteCopy} value={inviteUrl} label={m.invite_link_title()} />
	<p class="mt-3 text-[13px] text-ink-muted">{m.invite_link_warning()}</p>
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (inviteOpen = false)}>{m.common_close()}</Button>
	{/snippet}
</Modal>
