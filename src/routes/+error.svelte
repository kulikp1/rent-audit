<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Button from '#lib/components/ui/Button.svelte';

	const status = $derived(page.status);
	const title = $derived(
		status === 404
			? m.error_title_404()
			: status === 403
				? m.error_title_403()
				: m.error_title_500()
	);
	const text = $derived(
		status === 404 ? m.error_text_404() : status === 403 ? m.error_text_403() : m.error_text_500()
	);
</script>

<svelte:head><title>{title} · {m.app_name()}</title></svelte:head>

<div class="grid min-h-dvh place-items-center px-6">
	<div class="text-center">
		<p class="text-6xl font-semibold tracking-tight text-primary-ink">{status}</p>
		<h1 class="mt-4 text-xl font-semibold text-ink">{title}</h1>
		<p class="mx-auto mt-2 max-w-sm text-sm text-ink-muted">{text}</p>
		<div class="mt-8"><Button href="/">{m.error_go_home()}</Button></div>
	</div>
</div>
