<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Bell } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { NotificationView } from '#lib/server/notifications.js';
	import { pathTo } from '#lib/utils/path.js';
	import NotificationList from '../domain/NotificationList.svelte';

	type Props = {
		unread: number;
		recent: NotificationView[];
		role: 'realtor' | 'tenant';
	};

	let { unread, recent, role }: Props = $props();

	const uid = $props.id();
	const id = `bell-${uid}`;
	let panel = $state<HTMLDivElement>();
	let trigger = $state<HTMLButtonElement>();

	function place() {
		if (!panel || !trigger) return;
		const rect = trigger.getBoundingClientRect();
		const width = panel.offsetWidth;
		panel.style.top = `${rect.bottom + 8}px`;
		panel.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
	}

	async function markAll() {
		await fetch('/api/notifications', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: '{}'
		});
		await invalidateAll();
	}
</script>

<button
	bind:this={trigger}
	type="button"
	popovertarget={id}
	aria-label={m.nav_notifications()}
	class="relative grid size-10 place-items-center rounded-control text-ink-soft transition-colors hover:bg-surface-muted"
>
	<Bell class="size-5" />
	{#if unread > 0}
		<span
			class="absolute top-1 right-1 grid min-w-[18px] place-items-center rounded-full bg-danger-600 px-1 text-[10px] leading-[18px] font-semibold text-white"
		>
			{unread > 9 ? '9+' : unread}
		</span>
	{/if}
</button>

<div
	{id}
	bind:this={panel}
	popover="auto"
	ontoggle={(event) => event.newState === 'open' && place()}
	class="fixed m-0 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-card border border-line bg-surface p-0 shadow-pop [&:popover-open]:animate-pop-in"
>
	<div class="flex items-center justify-between border-b border-line px-4 py-3">
		<h2 class="text-sm font-semibold">{m.nav_notifications()}</h2>
		{#if unread > 0}
			<button
				type="button"
				onclick={markAll}
				class="text-[13px] font-medium text-primary-ink hover:underline"
			>
				{m.notif_mark_all()}
			</button>
		{/if}
	</div>
	<div class="max-h-96 overflow-y-auto">
		<NotificationList items={recent} {role} compact onnavigate={() => panel?.hidePopover()} />
	</div>
	<a
		href={pathTo(`/${role}/notifications`)}
		onclick={() => panel?.hidePopover()}
		class="block border-t border-line px-4 py-3 text-center text-sm font-medium text-primary-ink hover:bg-surface-muted"
	>
		{m.notif_all()}
	</a>
</div>
