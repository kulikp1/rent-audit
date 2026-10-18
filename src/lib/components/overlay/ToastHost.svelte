<script lang="ts">
	import ToastItem from './ToastItem.svelte';
	import { toastState } from './toast.svelte';

	const visible = $derived(toastState.items.slice(0, 3));
</script>

<div
	class="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[calc(100%-2rem)] flex-col items-end gap-2 sm:w-auto"
>
	{#each visible as item (item.id)}
		<ToastItem {item} />
	{/each}
</div>
