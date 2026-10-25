<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	const INTERVAL_MS = 3400;
	const RADIUS = 140;

	const steps = $derived([
		{ title: m.login_cycle_collect_title(), text: m.login_cycle_collect_text() },
		{ title: m.login_cycle_check_title(), text: m.login_cycle_check_text() },
		{ title: m.login_cycle_calc_title(), text: m.login_cycle_calc_text() },
		{ title: m.login_cycle_invoice_title(), text: m.login_cycle_invoice_text() }
	]);

	let progress = $state(0);

	const index = $derived(Math.min(steps.length - 1, Math.floor((progress / 100) * steps.length)));
	const step = $derived(steps[index]!);

	$effect(() => {
		const total = INTERVAL_MS * steps.length;
		const start = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			progress = (((now - start) % total) / total) * 100;
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	});
</script>

<div class="relative aspect-square w-full max-w-[19.5rem]" role="img" aria-label={step.title}>
	<svg viewBox="0 0 320 320" class="absolute inset-0 size-full" fill="none" aria-hidden="true">
		<circle
			cx="160"
			cy="160"
			r="158"
			stroke="var(--color-primary-300)"
			stroke-opacity="0.22"
			stroke-width="1.5"
			stroke-linecap="round"
			stroke-dasharray="0.1 5"
		/>
		<g transform="rotate(-90 160 160)">
			<circle
				cx="160"
				cy="160"
				r={RADIUS}
				stroke="var(--color-night-700)"
				stroke-width="14"
				pathLength="100"
				stroke-dasharray="23.4 1.6"
				stroke-dashoffset="-0.8"
			/>
			<circle
				cx="160"
				cy="160"
				r={RADIUS}
				stroke="var(--color-primary-500)"
				stroke-width="14"
				stroke-linecap="round"
				pathLength="100"
				stroke-dasharray="{progress} 100"
			/>
			<g style="transform-origin: 160px 160px; transform: rotate({progress * 3.6}deg)">
				<circle cx={160 + RADIUS} cy="160" r="15" fill="var(--color-primary-900)" opacity="0.9" />
				<circle cx={160 + RADIUS} cy="160" r="7" fill="#fff" />
			</g>
		</g>
	</svg>

	<div class="absolute inset-0 grid place-items-center px-14 text-center">
		{#key index}
			<div class="animate-fade-in">
				<p class="font-tag text-xs tracking-[0.2em] text-primary-300">
					{String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
				</p>
				<p
					class="mt-2 font-display text-[1.7rem] leading-tight font-bold tracking-tight text-white"
				>
					{step.title}
				</p>
				<p class="mt-2 font-onest text-[13px] leading-snug text-white/70">{step.text}</p>
			</div>
		{/key}
	</div>
</div>
