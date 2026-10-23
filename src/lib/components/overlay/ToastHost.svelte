<script lang="ts">
	import ToastItem from './ToastItem.svelte';
	import { toastState } from './toast.svelte';

	const visible = $derived(toastState.items.slice(0, 3));
	const latest = $derived(visible.at(-1)?.id);

	let host = $state<HTMLDivElement>();

	$effect(() => {
		if (!host) return;
		const shown = host.matches(':popover-open');
		if (visible.length === 0) {
			if (shown) host.hidePopover();
			return;
		}
		void latest;
		if (shown) host.hidePopover();
		host.showPopover();
	});
</script>

<div
	bind:this={host}
	popover="manual"
	class="pointer-events-none fixed inset-auto right-4 bottom-4 m-0 flex w-[calc(100%-2rem)] flex-col items-end gap-2 overflow-visible border-0 bg-transparent p-0 sm:w-auto"
>
	{#each visible as item (item.id)}
		<ToastItem {item} />
	{/each}
</div>
