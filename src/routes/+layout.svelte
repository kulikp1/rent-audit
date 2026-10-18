<script lang="ts">
	import './layout.css';
	import favicon from '#lib/assets/favicon.svg';
	import DialogHost from '#lib/components/overlay/DialogHost.svelte';
	import ToastHost from '#lib/components/overlay/ToastHost.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<DialogHost />
<ToastHost />
