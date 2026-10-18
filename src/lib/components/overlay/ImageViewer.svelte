<script lang="ts">
	import Button from '../ui/Button.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import Modal from './Modal.svelte';

	let {
		open = $bindable(false),
		src,
		title
	}: { open: boolean; src: string; title: string } = $props();
</script>

<Modal bind:open {title} size="lg">
	<img {src} alt={title} class="mx-auto max-h-[70dvh] rounded-control object-contain" />
	{#snippet footer()}
		<Button variant="secondary" data-autofocus onclick={() => (open = false)}>
			{m.common_close()}
		</Button>
	{/snippet}
</Modal>
