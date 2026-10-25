<script lang="ts">
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';
	import type { Plugin } from 'chart.js';

	import { formatQuantity } from '#lib/utils/invoice.js';
	import { theme } from '#lib/theme.svelte.js';

	Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

	type Props = {
		labels: string[];
		values: number[];
		anomalies: boolean[];
		unit: string;
		name: string;
	};

	let { labels, values, anomalies, unit, name }: Props = $props();

	let canvas = $state<HTMLCanvasElement>();

	$effect(() => {
		if (!canvas) return;
		void theme.current;
		const css = getComputedStyle(document.documentElement);
		const muted = css.getPropertyValue('--color-ink-muted').trim();
		const strong = css.getPropertyValue('--color-ink').trim();
		const grid = css.getPropertyValue('--color-line').trim();
		const bar = css.getPropertyValue('--color-primary-500').trim();
		const danger = css.getPropertyValue('--color-danger-ink').trim();
		const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';

		const badges: Plugin<'bar'> = {
			id: 'anomalyBadges',
			afterDatasetsDraw(chart) {
				const { ctx } = chart;
				chart.getDatasetMeta(0).data.forEach((element, index) => {
					if (!anomalies[index]) return;
					const text = formatQuantity(values[index]!);
					ctx.save();
					ctx.font = `700 11px ${mono}`;
					const width = ctx.measureText(text).width + 14;
					const x = element.x - width / 2;
					const y = element.y - 26;
					ctx.fillStyle = danger;
					ctx.beginPath();
					ctx.roundRect(x, y, width, 20, 6);
					ctx.fill();
					ctx.fillStyle = '#fff';
					ctx.textAlign = 'center';
					ctx.textBaseline = 'middle';
					ctx.fillText(text, element.x, y + 10.5);
					ctx.restore();
				});
			}
		};

		const chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: name,
						data: values,
						backgroundColor: anomalies.map((flag) => (flag ? danger : bar)),
						borderRadius: 6,
						maxBarThickness: 44
					}
				]
			},
			plugins: [badges],
			options: {
				responsive: true,
				maintainAspectRatio: false,
				layout: { padding: { top: 30 } },
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (item) => `${formatQuantity(Number(item.raw))} ${unit}`
						}
					}
				},
				scales: {
					x: {
						grid: { display: false },
						border: { display: false },
						ticks: {
							color: (context) => (anomalies[context.index] ? strong : muted),
							font: (context) => ({
								family: mono,
								size: 11,
								weight: anomalies[context.index] ? 'bold' : 'normal'
							})
						}
					},
					y: {
						beginAtZero: true,
						grid: { color: grid },
						border: { display: false },
						ticks: { color: muted, font: { family: mono, size: 11 } }
					}
				}
			}
		});
		return () => chart.destroy();
	});
</script>

<div class="h-80 w-full lg:h-[26rem]" role="img" aria-label={name}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>
