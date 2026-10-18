<script lang="ts">
	import { BarController, BarElement, CategoryScale, Chart, LinearScale, Tooltip } from 'chart.js';

	import { formatQuantity } from '#lib/utils/invoice.js';

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
		const chart = new Chart(canvas, {
			type: 'bar',
			data: {
				labels,
				datasets: [
					{
						label: name,
						data: values,
						backgroundColor: anomalies.map((flag) => (flag ? '#dc2626' : '#3b66f3')),
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
					x: { grid: { display: false }, ticks: { color: '#6b7491' } },
					y: {
						beginAtZero: true,
						grid: { color: '#e4e7ef' },
						border: { display: false },
						ticks: { color: '#6b7491' }
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
