import { requireRole } from '#lib/server/auth/guards.js';
import { tenantInvoices } from '#lib/server/tenant.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'tenant');
	return { invoices: await tenantInvoices(user.id) };
};
