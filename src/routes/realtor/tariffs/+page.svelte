<script lang="ts">
	import { Droplet, Ellipsis, Flame, History, Pencil, Plus, Zap } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import TariffFields from '#lib/components/domain/TariffFields.svelte';
	import TariffTable from '#lib/components/domain/TariffTable.svelte';
	import FormModal from '#lib/components/overlay/FormModal.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import Modal from '#lib/components/overlay/Modal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Button from '#lib/components/ui/Button.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { errorTexts } from '#lib/i18n/errors.js';
	import { postAction } from '#lib/utils/actions.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import { formatDate } from '#lib/utils/format.js';
	import type { TariffView } from '#lib/server/billing/tariffs.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let addOpen = $state(false);
	let editOpen = $state(false);
	let editing = $state<TariffView | null>(null);
	let historyService = $state<Service | null>(null);
	let historyOpen = $state(false);
	let addServices = $state<Service[]>(['electricity', 'gas', 'water']);

	type Service = 'electricity' | 'gas' | 'water';

	const now = Date.now();
	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');
	const money = (value: number) =>
		new Intl.NumberFormat(intlLocale, {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);

	const serviceStyles = {
		electricity: { icon: Zap, color: 'var(--color-service-electricity)' },
		gas: { icon: Flame, color: 'var(--color-service-gas)' },
		water: { icon: Droplet, color: 'var(--color-service-water)' }
	};

	const sections = $derived(
		(
			[
				{ service: 'electricity' as const, title: m.meter_electricity(), rows: data.electricity },
				{ service: 'gas' as const, title: m.meter_gas(), rows: data.gas },
				{ service: 'water' as const, title: m.meter_water(), rows: data.water }
			] as const
		).map((section) => {
			const current = section.rows.find((row) => new Date(row.effectiveFrom).getTime() <= now);
			const planned = section.rows
				.filter((row) => new Date(row.effectiveFrom).getTime() > now)
				.at(-1);
			return { ...section, current, planned };
		})
	);

	const historySection = $derived(sections.find((section) => section.service === historyService));

	let quantities = $state({ day: '180', night: '38', gas: '22', water: '7' });

	const priceOf = (service: Service, night = false) => {
		const row = sections.find((section) => section.service === service)?.current;
		if (!row) return 0;
		return night ? (row.nightPrice ?? row.price) : row.price;
	};

	const calcRows = $derived(
		[
			{
				key: 'day' as const,
				label: m.tariff_calc_light_day(),
				unit: m.unit_kwh(),
				color: 'var(--color-service-electricity)',
				price: priceOf('electricity')
			},
			{
				key: 'night' as const,
				label: m.tariff_calc_light_night(),
				unit: m.unit_kwh(),
				color: 'var(--color-service-electricity)',
				price: priceOf('electricity', true)
			},
			{
				key: 'gas' as const,
				label: m.meter_gas(),
				unit: m.unit_m3(),
				color: 'var(--color-service-gas)',
				price: priceOf('gas')
			},
			{
				key: 'water' as const,
				label: m.meter_water(),
				unit: m.unit_m3(),
				color: 'var(--color-service-water)',
				price: priceOf('water')
			}
		].map((row) => {
			const quantity = Math.max(0, Number(quantities[row.key].replace(',', '.')) || 0);
			return {
				...row,
				quantity,
				sum: Math.round((quantity * row.price + Number.EPSILON) * 100) / 100
			};
		})
	);
	const calcTotal = $derived(calcRows.reduce((sum, row) => sum + row.sum, 0));

	function openHistory(service: Service) {
		historyService = service;
		historyOpen = true;
	}

	function openAdd(services: Service[]) {
		addServices = services;
		addOpen = true;
	}

	function startEdit(row: TariffView) {
		historyOpen = false;
		editing = row;
		editOpen = true;
	}

	async function remove(id: string) {
		historyOpen = false;
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
		<Button onclick={() => openAdd(['electricity', 'gas', 'water'])}>
			{#snippet icon()}<Plus class="size-4" />{/snippet}
			{m.tariff_add()}
		</Button>
	{/snippet}
</PageHeader>

<div class="grid gap-4 md:grid-cols-3">
	{#each sections as section (section.service)}
		{@const style = serviceStyles[section.service]}
		{@const unit = section.service === 'electricity' ? m.unit_kwh() : m.unit_m3()}
		<div
			class="relative flex flex-col gap-5 overflow-hidden rounded-card border border-line bg-surface p-5"
		>
			<span
				class="pointer-events-none absolute -top-14 -right-14 size-44 rounded-full opacity-[0.16]"
				style="background-color: {style.color}"
			></span>

			<div class="relative flex items-start gap-3">
				<span
					class="grid size-11 shrink-0 place-items-center rounded-control text-white"
					style="background-color: {style.color}"
				>
					<style.icon class="size-5" />
				</span>
				<div class="min-w-0 flex-1">
					<h2 class="text-base font-semibold text-ink">{section.title}</h2>
					<p class="text-xs text-ink-muted">
						{section.current
							? m.tariff_since({ date: formatDate(section.current.effectiveFrom) })
							: m.tariff_no_current()}
					</p>
				</div>
				<Menu
					label={m.common_actions()}
					triggerClass="grid size-9 place-items-center rounded-control border border-line bg-canvas text-ink-muted transition-colors hover:text-ink"
					items={[
						...(section.current
							? [
									{
										label: m.common_edit(),
										icon: Pencil,
										onselect: () => startEdit(section.current!)
									}
								]
							: []),
						{ label: m.tariff_add(), icon: Plus, onselect: () => openAdd([section.service]) },
						{
							label: m.tariff_history(),
							icon: History,
							onselect: () => openHistory(section.service)
						}
					]}
				>
					{#snippet trigger()}<Ellipsis class="size-[18px]" />{/snippet}
				</Menu>
			</div>

			<div class="relative">
				{#if section.current}
					<div class="flex gap-6">
						<div>
							<p class="text-xs text-ink-muted">
								{section.service === 'electricity' ? m.tariff_day() : m.tariff_price()}
							</p>
							<p class="mt-1 font-mono text-4xl font-bold tracking-tight tabular-nums">
								{money(section.current.price)}
							</p>
							<p class="mt-1 text-[11px] text-ink-muted">{m.tariff_unit_per({ unit })}</p>
						</div>
						{#if section.service === 'electricity'}
							<div>
								<p class="text-xs text-ink-muted">{m.tariff_night()}</p>
								<p class="mt-1 font-mono text-4xl font-bold tracking-tight tabular-nums">
									{money(section.current.nightPrice ?? section.current.price)}
								</p>
								<p class="mt-1 text-[11px] text-ink-muted">{m.tariff_unit_per({ unit })}</p>
							</div>
						{/if}
					</div>
				{:else}
					<p class="text-sm text-ink-muted">{m.tariff_empty_hint()}</p>
				{/if}
				{#if section.planned}
					<p class="mt-3 text-xs text-info-ink">
						{m.tariff_planned_line({
							date: formatDate(section.planned.effectiveFrom),
							price: money(section.planned.price)
						})}
					</p>
				{/if}
			</div>

			<div class="relative mt-auto flex items-center justify-between border-t border-line pt-4">
				{#if section.current}
					<Badge tone="success">{m.tariff_current()}</Badge>
				{:else}
					<Button size="sm" onclick={() => openAdd([section.service])}>{m.tariff_add()}</Button>
				{/if}
				<button
					type="button"
					onclick={() => openHistory(section.service)}
					class="text-xs font-semibold text-primary-ink hover:underline"
				>
					{m.tariff_history()}
				</button>
			</div>
		</div>
	{/each}
</div>

<Card class="mt-4" padded={false}>
	<div class="grid gap-6 p-6 lg:grid-cols-[1fr_20rem]">
		<div>
			<h2 class="text-base font-semibold">{m.tariff_calc_title()}</h2>
			<p class="mt-1 text-sm text-ink-muted">{m.tariff_calc_text()}</p>
			<div class="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
				{#each calcRows as row (row.key)}
					<label class="block rounded-control border border-line bg-canvas px-3.5 py-3">
						<span class="flex items-center gap-2 text-xs text-ink-muted">
							<span class="size-2 rounded-full" style="background-color: {row.color}"></span>
							{row.label}
						</span>
						<span class="mt-2 flex items-baseline justify-between gap-2">
							<input
								bind:value={quantities[row.key]}
								inputmode="decimal"
								aria-label={row.label}
								class="w-full min-w-0 border-0 bg-transparent p-0 font-mono text-2xl font-bold text-ink tabular-nums focus:ring-0 focus:outline-none"
							/>
							<span class="shrink-0 text-[11px] text-ink-muted">{row.unit}</span>
						</span>
						<span class="mt-2 block font-mono text-xs font-semibold text-ink-soft tabular-nums">
							= {money(row.sum)} ₴
						</span>
					</label>
				{/each}
			</div>
		</div>

		<div class="flex flex-col justify-center rounded-card bg-primary-500 p-5 text-white">
			<p class="text-sm text-white/85">{m.tariff_calc_total()}</p>
			<p class="mt-2 font-mono text-4xl font-bold tracking-tight tabular-nums">
				{money(calcTotal)} <span class="text-lg">₴</span>
			</p>
			<div class="mt-4 flex h-2 overflow-hidden rounded-full bg-white/20">
				{#each calcRows as row (row.key)}
					{#if row.sum > 0}
						<span
							style="width: {(row.sum / calcTotal) *
								100}%; background-color: {row.color}; opacity: {row.key === 'night' ? 0.6 : 1}"
						></span>
					{/if}
				{/each}
			</div>
			<p class="mt-4 text-xs text-white/80">{m.tariff_calc_note()}</p>
		</div>
	</div>
</Card>

<Modal
	bind:open={historyOpen}
	size="lg"
	title={m.tariff_history_title({ service: historySection?.title ?? '' })}
>
	{#if historySection && historySection.rows.length > 0}
		<div class="table-scroll -mx-6">
			<TariffTable
				rows={historySection.rows}
				service={historySection.service}
				onedit={startEdit}
				ondelete={(row) => remove(row.id)}
			/>
		</div>
	{:else}
		<p class="py-6 text-center text-sm text-ink-muted">{m.tariff_empty_hint()}</p>
	{/if}
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (historyOpen = false)}>{m.common_close()}</Button>
	{/snippet}
</Modal>

{#key addServices.join()}
	<FormModal
		bind:open={addOpen}
		title={m.tariff_add()}
		description={m.tariff_add_text()}
		action="?/add"
		submitLabel={m.common_create()}
		onsuccess={() => toast.success(m.tariff_added())}
	>
		{#snippet children({ errors })}
			<TariffFields services={addServices} errors={errorTexts(errors)} />
		{/snippet}
	</FormModal>
{/key}

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
