<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { m } from '#lib/paraglide/messages.js';
	import NotificationList from '#lib/components/domain/NotificationList.svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const unread = $derived(data.items.filter((item) => !item.read).length);

	async function markAll() {
		await fetch('/api/notifications', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}'
		});
		await invalidateAll();
	}
</script>

<svelte:head><title>{m.nav_notifications()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_notifications()} subtitle={m.notif_subtitle()}>
	{#snippet actions()}
		<Button variant="secondary" disabled={unread === 0} onclick={markAll}
			>{m.notif_mark_all()}</Button
		>
	{/snippet}
</PageHeader>

<Card padded={false}><NotificationList items={data.items} role="tenant" /></Card>
