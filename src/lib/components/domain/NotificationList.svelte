<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { Bell, CircleAlert, CircleCheck, Info, TriangleAlert } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { NotificationView } from '#lib/server/notifications.js';
	import { pathTo } from '#lib/utils/path.js';
	import { formatDate } from '#lib/utils/format.js';
	import { describeNotification } from '#lib/utils/notifications.js';
	import EmptyState from '../ui/EmptyState.svelte';

	type Props = {
		items: NotificationView[];
		role: 'realtor' | 'tenant';
		compact?: boolean;
		onnavigate?: () => void;
	};

	let { items, role, compact = false, onnavigate }: Props = $props();

	const icons = { info: Info, warning: TriangleAlert, success: CircleCheck, danger: CircleAlert };
	const tones = {
		info: 'bg-info-50 text-info-600',
		warning: 'bg-warning-50 text-warning-600',
		success: 'bg-success-50 text-success-600',
		danger: 'bg-danger-50 text-danger-600'
	};

	async function open(item: NotificationView, href: string) {
		if (!item.read) {
			await fetch('/api/notifications', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ id: item.id })
			});
		}
		onnavigate?.();
		await goto(pathTo(href));
		await invalidateAll();
	}
</script>

{#if items.length === 0}
	<EmptyState title={m.notif_empty_title()} text={compact ? undefined : m.notif_empty_text()}>
		{#snippet icon()}<Bell class="size-6" />{/snippet}
	</EmptyState>
{:else}
	<ul class="divide-y divide-line">
		{#each items as item (item.id)}
			{@const info = describeNotification(item, role)}
			{@const Icon = icons[info.tone]}
			<li>
				<button
					type="button"
					onclick={() => open(item, info.href)}
					class="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted/70 {item.read
						? ''
						: 'bg-primary-50/40'}"
				>
					<span
						class="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full {tones[info.tone]}"
					>
						<Icon class="size-4" />
					</span>
					<span class="min-w-0 flex-1">
						<span class="block text-sm {item.read ? 'text-ink-soft' : 'font-medium text-ink'}">
							{info.text}
						</span>
						<span class="mt-0.5 block text-[12px] text-ink-muted">{formatDate(item.createdAt)}</span
						>
					</span>
					{#if !item.read}
						<span
							class="mt-2 size-2 shrink-0 rounded-full bg-primary-600"
							aria-label={m.notif_unread()}
						></span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
{/if}
