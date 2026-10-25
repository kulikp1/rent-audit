<script lang="ts">
	import { CircleAlert, CircleCheck, Info, X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { dismissToast, type ToastItem } from './toast.svelte';

	let { item }: { item: ToastItem } = $props();

	const DURATION = 5000;
	let remaining = DURATION;
	let startedAt = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function start() {
		if (item.tone === 'error') return;
		startedAt = Date.now();
		timer = setTimeout(() => dismissToast(item.id), remaining);
	}

	function pause() {
		if (!timer) return;
		clearTimeout(timer);
		timer = undefined;
		remaining -= Date.now() - startedAt;
	}

	$effect(() => {
		start();
		return () => clearTimeout(timer);
	});

	const tones = {
		success: { icon: CircleCheck, color: 'text-success-ink' },
		error: { icon: CircleAlert, color: 'text-danger-ink' },
		info: { icon: Info, color: 'text-info-ink' }
	};
	const tone = $derived(tones[item.tone]);
</script>

<div
	role={item.tone === 'error' ? 'alert' : 'status'}
	onmouseenter={pause}
	onmouseleave={start}
	class="pointer-events-auto flex w-full max-w-sm animate-slide-in items-start gap-3 rounded-card border border-line bg-surface p-4 shadow-pop"
>
	<tone.icon class="mt-0.5 size-5 shrink-0 {tone.color}" />
	<p class="flex-1 text-sm text-ink">{item.message}</p>
	<button
		type="button"
		onclick={() => dismissToast(item.id)}
		aria-label={m.common_close()}
		class="-m-1 grid size-7 place-items-center rounded-md text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
	>
		<X class="size-4" />
	</button>
</div>
