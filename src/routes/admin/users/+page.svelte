<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import Avatar from '#lib/components/ui/Avatar.svelte';
	import Badge from '#lib/components/ui/Badge.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import { formatDate } from '#lib/utils/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const roleLabels = $derived({
		realtor: m.role_realtor(),
		tenant: m.role_tenant(),
		admin: m.role_admin()
	});
	const roleTones = { realtor: 'info', tenant: 'neutral', admin: 'warning' } as const;
</script>

<svelte:head><title>{m.admin_users_title()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.admin_users_title()} subtitle={m.admin_users_subtitle()} />

<Card padded={false}>
	{#if data.users.length === 0}
		<p class="px-5 py-8 text-center text-sm text-ink-muted">{m.admin_users_empty()}</p>
	{:else}
		<div class="table-scroll">
			<table class="w-full text-left text-sm">
				<thead class="text-xs text-ink-muted uppercase">
					<tr class="border-b border-line">
						<th class="px-5 py-3 font-medium">{m.admin_users_user()}</th>
						<th class="px-5 py-3 font-medium">{m.admin_users_role()}</th>
						<th class="px-5 py-3 text-right font-medium">{m.admin_users_apartments()}</th>
						<th class="px-5 py-3 font-medium">{m.admin_users_joined()}</th>
					</tr>
				</thead>
				<tbody>
					{#each data.users as user (user.id)}
						<tr class="border-b border-line last:border-0">
							<td class="px-5 py-3">
								<div class="flex items-center gap-3">
									<Avatar name={user.name} src={user.picture} size="sm" />
									<div>
										<div class="font-medium text-ink">{user.name}</div>
										<div class="text-xs text-ink-muted">{user.email}</div>
									</div>
								</div>
							</td>
							<td class="px-5 py-3">
								<Badge tone={roleTones[user.role]}>{roleLabels[user.role]}</Badge>
							</td>
							<td class="px-5 py-3 text-right tabular-nums">{user.apartments ?? '—'}</td>
							<td class="px-5 py-3 whitespace-nowrap text-ink-soft">{formatDate(user.createdAt)}</td
							>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</Card>
