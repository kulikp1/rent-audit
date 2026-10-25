<script lang="ts">
	import { fitViewport } from '#lib/utils/fit.js';
	import { pathTo } from '#lib/utils/path.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import {
		ArrowLeft,
		ArrowLeftRight,
		Building2,
		Droplets,
		Ellipsis,
		Flame,
		Link2,
		MapPin,
		Pencil,
		Plus,
		Power,
		Trash2,
		UserRoundX,
		Zap
	} from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import AnomalyReasons from '#lib/components/domain/AnomalyReasons.svelte';
	import ApartmentFields from '#lib/components/domain/ApartmentFields.svelte';
	import MeterFields from '#lib/components/domain/MeterFields.svelte';
	import StatisticsView from '#lib/components/domain/StatisticsView.svelte';
	import ReadingValueInput from '#lib/components/domain/ReadingValueInput.svelte';
	import ReadingReviewModal from '#lib/components/domain/ReadingReviewModal.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import Modal from '#lib/components/overlay/Modal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import CopyField from '#lib/components/ui/CopyField.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import FormField from '#lib/components/ui/FormField.svelte';
	import Input from '#lib/components/ui/Input.svelte';
	import Tabs from '#lib/components/ui/Tabs.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { postAction } from '#lib/utils/actions.js';
	import { formatDate, formatMoney, formatPeriod, formatReading } from '#lib/utils/format.js';
	import { serviceLabel, unitLabel } from '#lib/utils/invoice.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Meter = (typeof data.meters)[number];

	let editOpen = $state(false);
	let meterOpen = $state(false);
	let meterEditOpen = $state(false);
	let editingMeter = $state<Meter | null>(null);
	let endLeaseOpen = $state(false);
	let inviteOpen = $state(false);
	let inviteUrl = $state('');
	let inviteCopy = $state<{ copy: () => Promise<void> }>();
	let inviting = $state(false);
	let rentOpen = $state(false);
	let replaceOpen = $state(false);
	let replacingMeter = $state<Meter | null>(null);
	let readingId = $state<string | null>(null);
	let readingOpen = $state(false);

	const now = new Date();
	const todayValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
	const act = (name: string) => `?/${name}&tab=${data.tab}`;
	const base = $derived(`/realtor/apartments/${data.apartment.id}`);
	const activeMeters = $derived(data.meters.filter((meter) => meter.active));
	const openReading = $derived(data.readings.find((reading) => reading.id === readingId) ?? null);

	const tabs = $derived([
		{ id: 'overview', label: m.apt_tab_overview() },
		{ id: 'meters', label: m.apt_tab_meters() },
		{ id: 'tenant', label: m.apt_tab_tenant() },
		{ id: 'readings', label: m.apt_tab_readings() },
		{ id: 'rent', label: m.apt_tab_rent() },
		{ id: 'statistics', label: m.apt_tab_statistics() }
	]);

	const meterIcons = { water: Droplets, gas: Flame, electricity: Zap };
	const meterTones = {
		water: 'bg-info-50 text-info-ink',
		gas: 'bg-warning-50 text-warning-ink',
		electricity: 'bg-primary-50 text-primary-ink'
	};

	function meterLabel(type: 'water' | 'gas' | 'electricity') {
		return { water: m.meter_water(), gas: m.meter_gas(), electricity: m.meter_electricity() }[type];
	}

	function readingStatusTone(status: string) {
		return status === 'confirmed' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
	}

	async function removeApartment() {
		const confirmed = await dialog.confirm({
			title: m.apt_delete_title({ name: data.apartment.name }),
			description: m.apt_delete_text(),
			confirmLabel: m.common_delete(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/remove');
		if (result.type === 'redirect') await goto(pathTo(result.location));
		else if (result.type === 'failure') toast.error(m.apt_delete_has_tenant());
		else toast.error(m.error_generic());
	}

	async function toggleMeter(meter: Meter) {
		const result = await postAction('?/toggleMeter', { id: meter.id });
		if (result.type !== 'success') toast.error(m.error_generic());
	}

	async function deleteMeter(meter: Meter) {
		const confirmed = await dialog.confirm({
			title: m.meter_delete_title({ serial: meter.serial }),
			description: m.meter_delete_text(),
			confirmLabel: m.common_delete(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/deleteMeter', { id: meter.id });
		if (result.type === 'failure') toast.error(m.meter_delete_has_readings());
		else if (result.type === 'success') toast.success(m.meter_deleted());
		else toast.error(m.error_generic());
	}

	async function revokeInvite() {
		const confirmed = await dialog.confirm({
			title: m.invite_revoke_title(),
			description: m.invite_revoke_text(),
			confirmLabel: m.invite_revoke(),
			tone: 'danger'
		});
		if (!confirmed) return;
		const result = await postAction('?/revokeInvite');
		if (result.type === 'success') toast.success(m.invite_revoked());
		else toast.error(m.error_generic());
	}

	async function createInvite() {
		if (data.invite) {
			const confirmed = await dialog.confirm({
				title: m.invite_regenerate_title(),
				description: m.invite_regenerate_text(),
				confirmLabel: m.invite_regenerate()
			});
			if (!confirmed) return;
		}
		inviting = true;
		const result = await postAction('?/createInvite');
		inviting = false;
		if (result.type === 'success' && result.data?.inviteUrl) {
			inviteUrl = String(result.data.inviteUrl);
			inviteOpen = true;
		} else {
			toast.error(m.error_generic());
		}
	}
</script>

<svelte:head><title>{data.apartment.name} · {m.app_name()}</title></svelte:head>

<a
	href={resolve('/realtor/apartments')}
	class="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
>
	<ArrowLeft class="size-4" />
	{m.nav_apartments()}
</a>

<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
	<div class="flex items-start gap-4">
		<span
			class="grid size-12 shrink-0 place-items-center rounded-card bg-primary-50 text-primary-ink"
		>
			<Building2 class="size-6" />
		</span>
		<div>
			<div class="flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-semibold tracking-tight">{data.apartment.name}</h1>
				<Badge tone={data.apartment.status === 'rented' ? 'success' : 'neutral'}>
					{data.apartment.status === 'rented' ? m.status_rented() : m.status_free()}
				</Badge>
			</div>
			{#if data.apartment.address}
				<p class="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
					<MapPin class="size-3.5" />
					{data.apartment.address}
				</p>
			{/if}
		</div>
	</div>
	<div class="flex items-center gap-2">
		<Button variant="secondary" onclick={() => (editOpen = true)}>
			{#snippet icon()}<Pencil class="size-4" />{/snippet}
			{m.common_edit()}
		</Button>
		<Menu
			label={m.common_actions()}
			triggerClass="grid size-10 place-items-center rounded-control border border-line-strong bg-surface text-ink-muted shadow-sm hover:bg-surface-muted"
			items={[
				{ label: m.common_delete(), icon: Trash2, tone: 'danger', onselect: removeApartment }
			]}
		>
			{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
		</Menu>
	</div>
</div>

<Tabs {tabs} active={data.tab} {base} />

{#if data.tab === 'overview'}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
		<Card>
			<p class="text-sm text-ink-muted">{m.apt_rent()}</p>
			<p class="mt-2 text-2xl font-semibold tabular-nums">
				{formatMoney(data.apartment.rentAmount)}
			</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">{m.apt_tenant()}</p>
			<p class="mt-2 truncate text-lg font-semibold">{data.tenant?.name ?? m.apt_no_tenant()}</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">{m.apt_tab_meters()}</p>
			<p class="mt-2 text-2xl font-semibold tabular-nums">{activeMeters.length}</p>
		</Card>
		<Card>
			<p class="text-sm text-ink-muted">{m.apt_added()}</p>
			<p class="mt-2 text-lg font-semibold">{formatDate(data.apartment.createdAt)}</p>
		</Card>
	</div>
{:else if data.tab === 'meters'}
	<div class="mb-4 flex justify-end">
		<Button onclick={() => (meterOpen = true)}>
			{#snippet icon()}<Plus class="size-4" />{/snippet}
			{m.meter_add()}
		</Button>
	</div>
	{#if data.meters.length === 0}
		<Card padded={false}>
			<EmptyState title={m.meter_empty_title()} text={m.meter_empty_text()}>
				{#snippet icon()}<Droplets class="size-6" />{/snippet}
				{#snippet action()}
					<Button onclick={() => (meterOpen = true)}>
						{#snippet icon()}<Plus class="size-4" />{/snippet}
						{m.meter_add()}
					</Button>
				{/snippet}
			</EmptyState>
		</Card>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			{#each data.meters as meter (meter.id)}
				{@const Icon = meterIcons[meter.type]}
				<Card class={meter.active ? '' : 'opacity-60'}>
					<div class="flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<span
								class="grid size-10 place-items-center rounded-control {meterTones[meter.type]}"
							>
								<Icon class="size-5" />
							</span>
							<div>
								<p class="font-semibold">{meterLabel(meter.type)}</p>
								<p class="text-[13px] text-ink-muted">
									{m.meter_serial_short({ serial: meter.serial })}
								</p>
							</div>
						</div>
						<div class="flex items-center gap-2">
							{#if meter.replacedById}
								<Badge>{m.meter_replaced()}</Badge>
							{:else if !meter.active}
								<Badge>{m.meter_inactive()}</Badge>
							{/if}
							{#if !meter.replacedById}
								<Menu
									label={m.common_actions()}
									triggerClass="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
									items={[
										{
											label: m.common_edit(),
											icon: Pencil,
											onselect: () => {
												editingMeter = meter;
												meterEditOpen = true;
											}
										},
										...(meter.active
											? [
													{
														label: m.meter_replace(),
														icon: ArrowLeftRight,
														onselect: () => {
															replacingMeter = meter;
															replaceOpen = true;
														}
													}
												]
											: []),
										{
											label: meter.active ? m.meter_deactivate() : m.meter_activate(),
											icon: Power,
											onselect: () => toggleMeter(meter)
										},
										{
											label: m.common_delete(),
											icon: Trash2,
											tone: 'danger',
											onselect: () => deleteMeter(meter)
										}
									]}
								>
									{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
								</Menu>
							{/if}
						</div>
					</div>
					{#if meter.replacedById}
						<p class="mt-3 rounded-control bg-surface-muted px-3 py-2 text-[13px] text-ink-soft">
							{m.meter_replaced_note({
								reading: formatReading(meter.finalReading),
								serial: data.meters.find((item) => item.id === meter.replacedById)?.serial ?? ''
							})}
						</p>
					{/if}
					<dl class="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-sm">
						<div>
							<dt class="text-ink-muted">{m.meter_digits()}</dt>
							<dd class="mt-0.5 font-medium">{meter.digits}</dd>
						</div>
						<div>
							<dt class="text-ink-muted">{m.meter_zones()}</dt>
							<dd class="mt-0.5 font-medium">{meter.zones}</dd>
						</div>
						<div>
							<dt class="text-ink-muted">{m.meter_initial()}</dt>
							<dd class="mt-0.5 font-medium tabular-nums">{formatReading(meter.initialReading)}</dd>
						</div>
					</dl>
				</Card>
			{/each}
		</div>
	{/if}
{:else if data.tab === 'tenant'}
	{#if data.tenant && data.lease}
		<Card>
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<Avatar name={data.tenant.name} src={data.tenant.picture} />
					<div>
						<p class="font-semibold">{data.tenant.name}</p>
						<p class="text-sm text-ink-muted">{data.tenant.email}</p>
						<p class="mt-1 text-[13px] text-ink-faint">
							{m.lease_since({ date: formatDate(data.lease.startedAt) })}
						</p>
					</div>
				</div>
				<Button variant="secondary" onclick={() => (endLeaseOpen = true)}>
					{#snippet icon()}<UserRoundX class="size-4" />{/snippet}
					{m.lease_end()}
				</Button>
			</div>
		</Card>
	{:else}
		<Card>
			<h2 class="text-base font-semibold">{m.invite_card_title()}</h2>
			<p class="mt-1 max-w-xl text-sm text-ink-muted">{m.invite_card_text()}</p>

			{#if data.invite}
				<p class="mt-4 text-sm text-ink-soft">
					{m.invite_active({ date: formatDate(data.invite.expiresAt) })}
				</p>
			{/if}

			<div class="mt-5 flex flex-wrap gap-2">
				<Button loading={inviting} onclick={createInvite}>
					{#snippet icon()}<Link2 class="size-4" />{/snippet}
					{data.invite ? m.invite_regenerate() : m.invite_generate()}
				</Button>
				{#if data.invite}
					<Button variant="ghost" onclick={revokeInvite}>{m.invite_revoke()}</Button>
				{/if}
			</div>
		</Card>
	{/if}
{:else if data.tab === 'statistics'}
	<StatisticsView stats={data.stats} />
{:else if data.tab === 'rent'}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-4">
		<div>
			<p class="text-sm text-ink-muted">{m.rent_current()}</p>
			<p class="text-3xl font-semibold tracking-tight tabular-nums">
				{formatMoney(data.rent.current)}
			</p>
		</div>
		<Button onclick={() => (rentOpen = true)}>
			{#snippet icon()}<Pencil class="size-4" />{/snippet}
			{m.rent_change()}
		</Button>
	</div>
	<Card padded={false}>
		<div class="table-scroll" use:fitViewport>
			<table class="w-full text-left text-sm">
				<thead class="text-xs text-ink-muted uppercase">
					<tr class="border-b border-line">
						<th class="px-5 py-3 font-medium">{m.tariff_effective_from()}</th>
						<th class="px-5 py-3 text-right font-medium">{m.apt_rent()}</th>
						<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
						<th class="px-5 py-3 font-medium">{m.rent_tenant_ack()}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each data.rent.history as entry, index (entry.effectiveFrom + index)}
						{@const planned = new Date(entry.effectiveFrom).getTime() > Date.now()}
						{@const isCurrent =
							!planned &&
							data.rent.history.findIndex(
								(item) => new Date(item.effectiveFrom).getTime() <= Date.now()
							) === index}
						<tr>
							<td class="px-5 py-3.5">{formatDate(entry.effectiveFrom)}</td>
							<td class="px-5 py-3.5 text-right font-medium tabular-nums"
								>{formatMoney(entry.amount)}</td
							>
							<td class="px-5 py-3.5">
								<Badge tone={isCurrent ? 'success' : planned ? 'info' : 'neutral'}>
									{isCurrent
										? m.tariff_current()
										: planned
											? m.tariff_planned()
											: m.tariff_archive()}
								</Badge>
							</td>
							<td class="px-5 py-3.5 text-ink-soft">
								{#if entry.ackedAt}
									{m.rent_acked({ date: formatDate(entry.ackedAt) })}
								{:else if entry.notified}
									{m.rent_ack_pending()}
								{:else}
									—
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Card>
{:else}
	<Card padded={false}>
		{#if data.readings.length === 0}
			<EmptyState title={m.reading_empty_title()} text={m.reading_empty_text()} />
		{:else}
			<div class="table-scroll" use:fitViewport>
				<table class="w-full text-left text-sm">
					<thead class="text-xs text-ink-muted uppercase">
						<tr class="border-b border-line">
							<th class="px-5 py-3 font-medium">{m.reading_period()}</th>
							<th class="px-5 py-3 font-medium">{m.reading_meter()}</th>
							<th class="px-5 py-3 text-right font-medium">{m.reading_value()}</th>
							<th class="px-5 py-3 font-medium">{m.apt_status()}</th>
							<th class="px-5 py-3"><span class="sr-only">{m.common_actions()}</span></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-line">
						{#each data.readings as reading (reading.id)}
							<tr class="transition-colors hover:bg-surface-muted/60">
								<td class="px-5 py-3.5">{formatPeriod(reading.period)}</td>
								<td class="px-5 py-3.5">{meterLabel(reading.meterType)} · {reading.serial}</td>
								<td class="px-5 py-3.5 text-right font-medium tabular-nums">
									{formatReading(reading.values)}
								</td>
								<td class="px-5 py-3.5">
									<Badge tone={readingStatusTone(reading.status)}>
										{reading.status === 'confirmed'
											? m.reading_confirmed()
											: reading.status === 'rejected'
												? m.reading_rejected()
												: m.reading_needs_confirmation()}
									</Badge>
								</td>
								<td class="px-5 py-3.5 text-right">
									<Button
										size="sm"
										variant="secondary"
										onclick={() => {
											readingId = reading.id;
											readingOpen = true;
										}}
									>
										{m.common_open()}
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</Card>
{/if}

{#if data.anomalies.length > 0}
	<Card class="mt-6">
		<h2 class="text-base font-semibold">{m.dashboard_anomalies_title()}</h2>
		<div class="mt-4 divide-y divide-line">
			{#each data.anomalies as item (item.service)}
				<div class="py-4 first:pt-0 last:pb-0">
					<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
						<p class="text-sm font-medium">{serviceLabel(item.service)}</p>
						<a
							href={pathTo(`/realtor/statistics?apartment=${item.apartmentId}`)}
							class="text-[13px] font-medium text-primary-ink hover:underline"
						>
							{m.dashboard_anomalies_open()}
						</a>
					</div>
					<AnomalyReasons
						reasons={item.reasons}
						unit={unitLabel(item.service === 'electricity' ? 'kwh' : 'm3')}
						period={formatPeriod(item.period)}
					/>
				</div>
			{/each}
		</div>
	</Card>
{/if}

<ReadingReviewModal bind:open={readingOpen} reading={openReading} />

<FormModal
	bind:open={rentOpen}
	title={m.rent_change()}
	description={m.rent_change_text()}
	action={act('changeRent')}
	submitLabel={m.common_save()}
	onsuccess={() => toast.success(m.rent_changed_toast())}
>
	{#snippet children({ errors })}
		{@const texts = errorTexts(errors)}
		<FormField label={m.rent_new_amount()} error={texts.amount} required>
			{#snippet children(field)}
				<Input name="amount" inputmode="decimal" defaultValue={data.rent.current} {...field} />
			{/snippet}
		</FormField>
		<FormField label={m.tariff_effective_from()} error={texts.effectiveFrom} required>
			{#snippet children(field)}
				<Input name="effectiveFrom" type="date" defaultValue={todayValue} {...field} />
			{/snippet}
		</FormField>
	{/snippet}
</FormModal>

<FormModal
	bind:open={editOpen}
	title={m.apt_edit_title()}
	action={act('update')}
	onsuccess={() => toast.success(m.common_saved())}
>
	{#snippet children({ errors })}
		<ApartmentFields
			errors={errorTexts(errors)}
			showRent={false}
			values={{
				name: data.apartment.name,
				address: data.apartment.address,
				residents: data.apartment.residents
			}}
		/>
	{/snippet}
</FormModal>

<FormModal
	bind:open={meterOpen}
	title={m.meter_add()}
	action={act('addMeter')}
	submitLabel={m.common_create()}
	onsuccess={() => toast.success(m.meter_added())}
>
	{#snippet children({ errors })}
		<MeterFields errors={errorTexts(errors)} />
	{/snippet}
</FormModal>

{#if editingMeter}
	<FormModal
		bind:open={meterEditOpen}
		title={m.meter_edit()}
		action={act('updateMeter')}
		onsuccess={() => toast.success(m.common_saved())}
	>
		{#snippet children({ errors })}
			<input type="hidden" name="id" value={editingMeter!.id} />
			<MeterFields errors={errorTexts(errors)} values={editingMeter!} />
		{/snippet}
	</FormModal>
{/if}

{#if replacingMeter}
	<FormModal
		bind:open={replaceOpen}
		title={m.meter_replace_title()}
		description={m.meter_replace_text()}
		action={act('replaceMeter')}
		submitLabel={m.meter_replace()}
		size="lg"
		onsuccess={() => toast.success(m.meter_replaced_toast())}
	>
		{#snippet children({ errors })}
			{@const texts = errorTexts(errors)}
			<input type="hidden" name="id" value={replacingMeter!.id} />
			<section>
				<h3 class="mb-3 text-sm font-semibold">
					{m.meter_replace_old({ serial: replacingMeter!.serial })}
				</h3>
				<ReadingValueInput meter={replacingMeter!} prefix="final" errors={texts} />
			</section>
			<section class="space-y-4 border-t border-line pt-5">
				<h3 class="text-sm font-semibold">{m.meter_replace_new()}</h3>
				<MeterFields
					errors={texts}
					fixedType={replacingMeter!.type}
					values={{ digits: replacingMeter!.digits, zones: replacingMeter!.zones }}
				/>
			</section>
		{/snippet}
	</FormModal>
{/if}

<FormModal
	bind:open={endLeaseOpen}
	title={m.lease_end_title()}
	description={m.lease_end_text()}
	action={act('endLease')}
	submitLabel={m.lease_end()}
	tone="danger"
	onsuccess={() => toast.success(m.lease_ended())}
>
	{#snippet children({ errors })}
		{@const texts = errorTexts(errors)}
		{#each activeMeters as meter (meter.id)}
			{#each Array.from({ length: meter.zones }, (_, zone) => zone) as zone (zone)}
				<FormField
					label={`${meterLabel(meter.type)} · ${meter.serial}${meter.zones === 2 ? ` · ${zone === 0 ? m.meter_zone_day() : m.meter_zone_night()}` : ''}`}
					error={texts[`out_${meter.id}_${zone}`]}
					required
				>
					{#snippet children(field)}
						<Input name="out_{meter.id}_{zone}" inputmode="decimal" {...field} />
					{/snippet}
				</FormField>
			{/each}
		{/each}
	{/snippet}
</FormModal>

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
