<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { initTheme, theme, toggleTheme } from '#lib/theme.svelte.js';
	import IconButton from '../ui/IconButton.svelte';

	onMount(initTheme);

	const label = $derived(theme.current === 'dark' ? m.theme_switch_light() : m.theme_switch_dark());
</script>

<IconButton {label} onclick={toggleTheme}>
	{#if theme.current === 'dark'}
		<Sun class="size-[18px]" />
	{:else}
		<Moon class="size-[18px]" />
	{/if}
</IconButton>
