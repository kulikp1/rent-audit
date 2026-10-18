<script lang="ts">
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#if data.user}
	<AppShell
		user={data.user}
		role="tenant"
		notifications={data.notifications}
		badges={{ notifications: data.notifications.unread }}
	>
		{@render children()}
	</AppShell>
{/if}
