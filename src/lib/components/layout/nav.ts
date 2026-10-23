import {
	Bell,
	Building2,
	ChartColumn,
	History,
	House,
	LayoutDashboard,
	Percent,
	Receipt,
	ScanLine,
	ScanSearch,
	Settings,
	TriangleAlert,
	Users
} from '@lucide/svelte';
import type { Component } from 'svelte';
import { m } from '#lib/paraglide/messages.js';

export type NavItem = {
	href: string;
	label: () => string;
	icon: Component<{ class?: string }>;
	exact?: boolean;
	badge?: string;
};

export const navByRole: Record<'realtor' | 'tenant' | 'admin', NavItem[]> = {
	realtor: [
		{ href: '/realtor', label: () => m.nav_dashboard(), icon: LayoutDashboard, exact: true },
		{ href: '/realtor/apartments', label: () => m.nav_apartments(), icon: Building2 },
		{
			href: '/realtor/readings',
			label: () => m.nav_readings(),
			icon: ScanSearch,
			badge: 'pendingReadings'
		},
		{ href: '/realtor/invoices', label: () => m.nav_invoices(), icon: Receipt },
		{ href: '/realtor/anomalies', label: () => m.nav_anomalies(), icon: TriangleAlert },
		{ href: '/realtor/statistics', label: () => m.nav_statistics(), icon: ChartColumn },
		{ href: '/realtor/tariffs', label: () => m.nav_tariffs(), icon: Percent },
		{
			href: '/realtor/notifications',
			label: () => m.nav_notifications(),
			icon: Bell,
			badge: 'notifications'
		},
		{ href: '/realtor/settings', label: () => m.nav_settings(), icon: Settings }
	],
	tenant: [
		{ href: '/tenant', label: () => m.nav_home(), icon: House, exact: true },
		{
			href: '/tenant/readings/new',
			label: () => m.tenant_submit_readings(),
			icon: ScanLine,
			exact: true
		},
		{ href: '/tenant/readings', label: () => m.nav_readings_history(), icon: History, exact: true },
		{ href: '/tenant/invoices', label: () => m.nav_invoices(), icon: Receipt },
		{
			href: '/tenant/notifications',
			label: () => m.nav_notifications(),
			icon: Bell,
			badge: 'notifications'
		}
	],
	admin: [{ href: '/admin/users', label: () => m.admin_users_title(), icon: Users }]
};
