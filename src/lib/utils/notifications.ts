import { m } from '#lib/paraglide/messages.js';
import { formatDate, formatMoney, formatPeriod } from './format';
import { serviceLabel } from './invoice';
import type { NotificationView } from '#lib/server/notifications.js';

type Role = 'realtor' | 'tenant';

export function describeNotification(
	notification: NotificationView,
	role: Role
): { text: string; href: string; tone: 'info' | 'warning' | 'success' | 'danger' } {
	const p = notification.payload;
	const str = (key: string) => String(p[key] ?? '');
	const invoiceHref = `/${role}/invoices/${str('invoiceId')}`;

	switch (notification.type) {
		case 'readings_submitted':
			return {
				text: m.notif_readings_submitted({
					tenantName: str('tenantName'),
					apartmentName: str('apartmentName'),
					count: Number(p.count ?? 0)
				}),
				href: '/realtor/readings?status=all',
				tone: 'info'
			};
		case 'reading_pending':
			return {
				text: m.notif_reading_pending({
					serial: str('serial'),
					apartmentName: str('apartmentName')
				}),
				href: '/realtor/readings',
				tone: 'warning'
			};
		case 'anomaly':
			return {
				text: m.notif_anomaly({
					service: serviceLabel(str('service') as 'water' | 'gas' | 'electricity'),
					apartmentName: str('apartmentName'),
					period: formatPeriod(str('period'))
				}),
				href: `/realtor/statistics?apartment=${str('apartmentId')}`,
				tone: 'danger'
			};
		case 'tenant_paid':
			return {
				text: m.notif_tenant_paid({ number: str('number') }),
				href: invoiceHref,
				tone: 'info'
			};
		case 'invoice_overdue':
			return {
				text: m.notif_invoice_overdue({ number: str('number') }),
				href: invoiceHref,
				tone: 'danger'
			};
		case 'invoice_issued':
			return {
				text: m.notif_invoice_issued({
					number: str('number'),
					total: formatMoney(Number(p.total ?? 0))
				}),
				href: invoiceHref,
				tone: 'info'
			};
		case 'payment_confirmed':
			return {
				text: m.notif_payment_confirmed({ number: str('number') }),
				href: invoiceHref,
				tone: 'success'
			};
		case 'rent_changed':
			return {
				text: m.notif_rent_changed({
					date: formatDate(str('effectiveFrom')),
					amount: formatMoney(Number(p.amount ?? 0))
				}),
				href: '/tenant',
				tone: 'warning'
			};
		case 'readings_reminder':
			return { text: m.notif_readings_reminder(), href: '/tenant/readings/new', tone: 'warning' };
	}
}
