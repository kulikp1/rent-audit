<script lang="ts">
	import AppShell from '#lib/components/layout/AppShell.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();
</script>

{#if data.user}
	<AppShell
		user={data.user}
		role="realtor"
		notifications={data.notifications}
		badges={{ pendingReadings: data.pendingReadings, notifications: data.notifications.unread }}
	>
		{@render children()}
	</AppShell>
{/if}
