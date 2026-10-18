<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { LogOut, Menu as MenuIcon, X } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { NotificationView } from '#lib/server/notifications.js';
	import Avatar from '../ui/Avatar.svelte';
	import Logo from '../ui/Logo.svelte';
	import Menu from '../overlay/Menu.svelte';
	import LocaleSwitcher from './LocaleSwitcher.svelte';
	import NotificationBell from './NotificationBell.svelte';
	import { navByRole } from './nav';

	type ShellUser = {
		name: string;
		picture: string;
		role: 'realtor' | 'tenant' | 'admin';
	};

	type Notifications = { unread: number; recent: NotificationView[] };

	let {
		user,
		role,
		notifications,
		badges = {},
		children
	}: {
		user: ShellUser;
		role?: 'realtor' | 'tenant';
		notifications?: Notifications;
		badges?: Record<string, number>;
		children: Snippet;
	} = $props();

	let mobileOpen = $state(false);
	let logoutForm = $state<HTMLFormElement>();

	const items = $derived(navByRole[user.role]);
	const roleLabel = $derived(
		{ realtor: m.role_realtor(), tenant: m.role_tenant(), admin: m.role_admin() }[user.role]
	);

	function isActive(href: string, exact?: boolean) {
		const path = page.url.pathname;
		return exact ? path === href : path === href || path.startsWith(`${href}/`);
	}

	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && mobileOpen) mobileOpen = false;
	}
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<div class="min-h-dvh lg:pl-64">
	{#if mobileOpen}
		<button
			type="button"
			aria-label={m.menu_close()}
			class="fixed inset-0 z-30 animate-fade-in bg-ink/40 backdrop-blur-[2px] lg:hidden"
			onclick={() => (mobileOpen = false)}
		></button>
	{/if}

	<aside
		class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0 {mobileOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<div class="flex h-16 items-center justify-between px-5">
			<a href={pathTo('/')} aria-label={m.app_name()}><Logo /></a>
			<button
				type="button"
				class="grid size-9 place-items-center rounded-control text-ink-muted hover:bg-surface-muted lg:hidden"
				aria-label={m.menu_close()}
				onclick={() => (mobileOpen = false)}
			>
				<X class="size-5" />
			</button>
		</div>

		<nav class="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label={m.app_name()}>
			{#each items as item (item.href)}
				{@const active = isActive(item.href, item.exact)}
				<a
					href={pathTo(item.href)}
					aria-current={active ? 'page' : undefined}
					onclick={() => (mobileOpen = false)}
					class="flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors {active
						? 'bg-primary-50 text-primary-700'
						: 'text-ink-soft hover:bg-surface-muted hover:text-ink'}"
				>
					<item.icon class="size-[18px] {active ? 'text-primary-600' : 'text-ink-faint'}" />
					<span class="flex-1">{item.label()}</span>
					{#if item.badge && badges[item.badge]}
						<span
							class="grid min-w-5 place-items-center rounded-full bg-warning-600 px-1.5 text-[11px] font-semibold text-white"
						>
							{badges[item.badge]}
						</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="border-t border-line p-3">
			<div class="flex items-center gap-3 rounded-control px-2 py-2">
				<Avatar name={user.name} src={user.picture} />
				<div class="min-w-0">
					<p class="truncate text-sm font-medium text-ink">{user.name}</p>
					<p class="truncate text-xs text-ink-muted">{roleLabel}</p>
				</div>
			</div>
		</div>
	</aside>

	<header
		class="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-8"
	>
		<button
			type="button"
			class="grid size-10 place-items-center rounded-control text-ink-soft hover:bg-surface-muted lg:hidden"
			aria-label={m.menu_open()}
			onclick={() => (mobileOpen = true)}
		>
			<MenuIcon class="size-5" />
		</button>
		<div class="ml-auto flex items-center gap-3">
			{#if role && notifications}
				<NotificationBell unread={notifications.unread} recent={notifications.recent} {role} />
			{/if}
			<LocaleSwitcher />
			<Menu
				label={user.name}
				triggerClass="flex items-center gap-2 rounded-full p-0.5 transition-shadow hover:shadow-card focus-visible:outline-2"
				items={[
					{
						label: m.user_menu_logout(),
						icon: LogOut,
						tone: 'danger',
						onselect: () => logoutForm?.requestSubmit()
					}
				]}
			>
				{#snippet trigger()}
					<Avatar name={user.name} src={user.picture} />
				{/snippet}
			</Menu>
		</div>
	</header>

	<form bind:this={logoutForm} method="POST" action="/auth/logout" class="hidden"></form>

	<main class="mx-auto w-full max-w-6xl px-4 py-8 lg:px-8">
		{@render children()}
	</main>
</div>
