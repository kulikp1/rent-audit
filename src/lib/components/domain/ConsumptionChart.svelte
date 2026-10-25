<script lang="ts">
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

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
		const grid = css.getPropertyValue('--color-line').trim();
		const bar = css.getPropertyValue('--color-primary-500').trim();
		const danger = css.getPropertyValue('--color-danger-600').trim();
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
						maxBarThickness: 42
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (item) => `${formatQuantity(Number(item.raw))} ${unit}`
						}
					}
				},
				scales: {
					x: { grid: { display: false }, ticks: { color: muted } },
					y: {
						beginAtZero: true,
						grid: { color: grid },
						border: { display: false },
						ticks: { color: muted }
					}
				}
			}
		});
		return () => chart.destroy();
	});
</script>

<div class="h-64 w-full" role="img" aria-label={name}>
	<canvas bind:this={canvas} aria-hidden="true"></canvas>
</div>
