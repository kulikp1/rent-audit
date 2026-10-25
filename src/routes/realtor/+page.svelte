<script lang="ts">
	import type { PageProps } from './$types';
	import { onMount } from 'svelte';
	import {
		ArrowRight,
		Building2,
		Droplet,
		Flame,
		Plus,
		Receipt,
		ScanSearch,
		TriangleAlert,
		Zap
	} from '@lucide/svelte';
	import { fitViewport } from '#lib/utils/fit.js';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import EmptyState from '#lib/components/ui/EmptyState.svelte';
	import AnomalyReasons from '#lib/components/domain/AnomalyReasons.svelte';
	import { formatPeriod } from '#lib/utils/format.js';
	import { pathTo } from '#lib/utils/path.js';
	import { formatQuantity, serviceLabel, unitLabel } from '#lib/utils/invoice.js';

	let { data }: PageProps = $props();

	const VISIBLE_ANOMALIES = 3;
	const RING_RADIUS = 17;
	const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

	let now = $state<Date | null>(null);

	onMount(() => {
		now = new Date();
	});

	const intlLocale = $derived(getLocale() === 'uk' ? 'uk-UA' : 'en-GB');
	const firstName = $derived(data.user?.name.split(/\s+/)[0] ?? '');

	const greeting = $derived.by(() => {
		const hour = now?.getHours() ?? 12;
		if (hour >= 5 && hour < 12) return m.dashboard_greeting_morning();
		if (hour >= 12 && hour < 18) return m.dashboard_greeting_day();
		if (hour >= 18 && hour < 23) return m.dashboard_greeting_evening();
		return m.dashboard_greeting_night();
	});

	const today = $derived.by(() => {
		if (!now) return '';
		const text = new Intl.DateTimeFormat(intlLocale, {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		}).format(now);
		return text.charAt(0).toLocaleUpperCase(intlLocale) + text.slice(1);
	});

	const collectionDate = $derived(
		new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
			new Date(data.nextCollection.date)
		)
	);
	const collectionIn = $derived(
		new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' }).format(
			data.nextCollection.days,
			'day'
		)
	);

	type Tone = 'default' | 'primary' | 'danger';

	const stats = $derived<
		{
			label: string;
			value: number;
			icon: typeof Building2;
			tone: Tone;
			link: string;
			href: string;
		}[]
	>([
		{
			label: m.stat_apartments(),
			value: data.stats.apartments,
			icon: Building2,
			tone: 'default',
			link: m.dashboard_link_all(),
			href: '/realtor/apartments'
		},
		{
			label: m.stat_readings_pending(),
			value: data.stats.pendingReadings,
			icon: ScanSearch,
			tone: data.stats.pendingReadings > 0 ? 'primary' : 'default',
			link: m.dashboard_link_review(),
			href: '/realtor/readings'
		},
		{
			label: m.stat_invoices_unpaid(),
			value: data.stats.unpaidInvoices,
			icon: Receipt,
			tone: 'default',
			link: m.dashboard_link_open(),
			href: '/realtor/invoices'
		},
		{
			label: m.stat_anomalies(),
			value: data.stats.anomalies,
			icon: TriangleAlert,
			tone: data.stats.anomalies > 0 ? 'danger' : 'default',
			link: m.dashboard_link_check(),
			href: '/realtor/anomalies'
		}
	]);

	const cardTones: Record<Tone, string> = {
		default: 'border-line bg-surface',
		primary: 'border-primary-500 bg-primary-500 text-white',
		danger: 'border-danger-600/40 bg-danger-50'
	};
	const iconTones: Record<Tone, string> = {
		default: 'bg-surface-muted text-ink-muted',
		primary: 'bg-white/20 text-white',
		danger: 'bg-danger-600/15 text-danger-ink'
	};
	const labelTones: Record<Tone, string> = {
		default: 'text-ink-muted',
		primary: 'text-white/85',
		danger: 'text-ink-muted'
	};
	const linkTones: Record<Tone, string> = {
		default: 'text-ink-muted hover:text-ink',
		primary: 'text-white hover:text-white/80',
		danger: 'text-danger-ink hover:opacity-80'
	};

	const serviceIcons = { water: Droplet, gas: Flame, electricity: Zap };

	function monthLabel(period: string) {
		const [year, month] = period.split('-').map(Number);
		const text = new Intl.DateTimeFormat(intlLocale, { month: 'short' })
			.format(new Date(year!, month! - 1, 1))
			.replace('.', '');
		return text.charAt(0).toLocaleUpperCase(intlLocale) + text.slice(1);
	}

	function unitFor(service: string) {
		return unitLabel(service === 'electricity' ? 'kwh' : 'm3');
	}
</script>

<svelte:head><title>{m.realtor_dashboard_title()} · {m.app_name()}</title></svelte:head>

<div class="mb-4 flex flex-wrap items-start justify-between gap-3">
	<div class="transition-opacity {now ? 'opacity-100' : 'opacity-0'}">
		<p class="min-h-5 text-[13px] text-ink-muted">{today}</p>
		<h1 class="mt-1 text-3xl font-bold tracking-tight text-ink">
			{greeting}{firstName ? `, ${firstName}` : ''}
		</h1>
		<p class="mt-1.5 text-sm text-ink-muted">{m.realtor_dashboard_subtitle()}</p>
	</div>

	<div class="flex items-center gap-4 rounded-card border border-line bg-surface px-4 py-3">
		<svg viewBox="0 0 40 40" class="size-10 -rotate-90" fill="none" aria-hidden="true">
			<circle cx="20" cy="20" r={RING_RADIUS} stroke="var(--color-line-strong)" stroke-width="3" />
			<circle
				cx="20"
				cy="20"
				r={RING_RADIUS}
				stroke="var(--color-primary-500)"
				stroke-width="3"
				stroke-linecap="round"
				stroke-dasharray="{RING_LENGTH * data.nextCollection.progress} {RING_LENGTH}"
			/>
		</svg>
		<div>
			<p class="text-xs text-ink-muted">{m.dashboard_next_collection()}</p>
			<p class="mt-0.5 text-sm font-semibold text-ink">{collectionDate} · {collectionIn}</p>
		</div>
	</div>
</div>

<div class="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
	{#each stats as stat (stat.label)}
		<div
			class="flex min-h-24 flex-col justify-between gap-2 rounded-card border p-4 {cardTones[
				stat.tone
			]}"
		>
			<div class="flex items-start justify-between gap-2">
				<p class="text-[13px] leading-snug sm:text-sm {labelTones[stat.tone]}">{stat.label}</p>
				<span
					class="grid size-9 shrink-0 place-items-center rounded-control {iconTones[stat.tone]}"
				>
					<stat.icon class="size-[18px]" />
				</span>
			</div>
			<div class="flex items-end justify-between gap-2">
				<p class="text-4xl font-bold tracking-tight tabular-nums">{stat.value}</p>
				<a
					href={pathTo(stat.href)}
					class="inline-flex items-center gap-1 text-xs font-medium transition-colors {linkTones[
						stat.tone
					]}"
				>
					{stat.link}<ArrowRight class="size-3.5" />
				</a>
			</div>
		</div>
	{/each}
</div>

{#if data.anomalies.length > 0}
	<Card class="mt-4" padded={false}>
		<div class="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
			<div class="flex items-center gap-2.5">
				<h2 class="text-lg font-semibold tracking-tight">{m.dashboard_anomalies_title()}</h2>
				<Badge>{data.anomalies.length}</Badge>
			</div>
			<a
				href={pathTo('/realtor/anomalies')}
				class="text-sm font-semibold text-primary-ink hover:underline"
			>
				{m.dashboard_anomalies_all()}
			</a>
		</div>

		<div class="divide-y divide-line overflow-y-auto" use:fitViewport>
			{#each data.anomalies.slice(0, VISIBLE_ANOMALIES) as item (item.apartmentId + item.service)}
				{@const ServiceIcon = serviceIcons[item.service]}
				{@const unit = unitFor(item.service)}
				{@const ceiling = Math.max(item.norm, ...item.series.map((point) => point.value), 1) * 1.15}
				<div class="grid gap-5 p-5 lg:grid-cols-[1fr_1.1fr]">
					<div class="min-w-0">
						<div class="flex items-center gap-3">
							<span
								class="grid size-11 shrink-0 place-items-center rounded-control border border-danger-600/30 bg-danger-50 text-danger-ink"
							>
								<ServiceIcon class="size-5" />
							</span>
							<div class="min-w-0">
								<p class="truncate text-base font-semibold text-ink">{item.apartmentName}</p>
								<p class="text-[13px] text-ink-muted">
									{serviceLabel(item.service)} · {formatPeriod(item.period).toLocaleLowerCase(
										intlLocale
									)}
								</p>
							</div>
						</div>

						<div class="mt-4">
							<Badge tone="danger">
								<TriangleAlert class="size-3" />
								{m.anomaly_badge()}
							</Badge>
						</div>

						<div class="mt-4 grid grid-cols-3 gap-2.5">
							{#each [{ label: m.dashboard_metric_this_month(), value: item.value, hot: true }, { label: m.dashboard_metric_usual(), value: item.usual, hot: false }, { label: m.dashboard_metric_norm(), value: item.norm, hot: false }] as metric (metric.label)}
								<div class="rounded-control border border-line bg-canvas px-3 py-2.5">
									<p class="text-[11px] leading-tight text-ink-muted">{metric.label}</p>
									<p
										class="mt-1.5 font-mono text-lg font-bold tabular-nums {metric.hot
											? 'text-danger-ink'
											: 'text-ink'}"
									>
										{formatQuantity(metric.value)}
										<span class="text-xs font-semibold">{unit}</span>
									</p>
								</div>
							{/each}
						</div>

						<div class="mt-4">
							<AnomalyReasons reasons={item.reasons} {unit} showBadge={false} />
						</div>

						<div class="mt-5">
							<Button href={`/realtor/statistics?apartment=${item.apartmentId}`}>
								{m.dashboard_anomalies_open()}
							</Button>
						</div>
					</div>

					<div class="rounded-card border border-line bg-canvas p-4">
						<div class="flex items-center justify-between gap-2 text-xs text-ink-muted">
							<span>{m.dashboard_chart_title({ service: serviceLabel(item.service), unit })}</span>
							<span class="flex items-center gap-1.5">
								<span class="w-3.5 border-t border-dashed border-ink-faint"></span>
								{m.dashboard_chart_norm({ value: `${formatQuantity(item.norm)} ${unit}` })}
							</span>
						</div>
						<div class="relative mt-4 h-52">
							<span
								class="absolute inset-x-0 border-t border-dashed border-ink-faint"
								style="bottom: calc(1.5rem + (100% - 3rem) * {item.norm / ceiling})"
							></span>
							<div class="relative flex h-full items-end justify-between gap-3">
								{#each item.series as point (point.period)}
									<div class="flex h-full flex-1 flex-col items-center justify-end gap-1">
										<span
											class="text-[11px] font-semibold tabular-nums {point.anomaly
												? 'text-danger-ink'
												: 'text-ink-muted'}"
										>
											{formatQuantity(point.value)}
										</span>
										<span
											class="w-full max-w-11 rounded-md {point.anomaly
												? 'bg-danger-ink'
												: 'bg-line-strong'}"
											style="height: calc((100% - 3rem) * {point.value / ceiling})"
										></span>
										<span
											class="h-5 text-xs {point.anomaly
												? 'font-semibold text-ink'
												: 'text-ink-muted'}"
										>
											{monthLabel(point.period)}
										</span>
									</div>
								{/each}
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</Card>
{/if}

{#if data.stats.apartments === 0}
	<Card class="mt-6" padded={false}>
		<EmptyState title={m.empty_apartments_title()} text={m.empty_apartments_text()}>
			{#snippet icon()}<Building2 class="size-6" />{/snippet}
			{#snippet action()}
				<Button href="/realtor/apartments">
					{#snippet icon()}<Plus class="size-4" />{/snippet}
					{m.empty_apartments_title()}
				</Button>
			{/snippet}
		</EmptyState>
	</Card>
{/if}
