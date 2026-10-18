import { error, fail } from '@sveltejs/kit';
import { Types } from 'mongoose';
import { requireRole } from '#lib/server/auth/guards.js';
import { isOpenStatus, effectiveStatus } from '#lib/server/billing/calc.js';
import { connectDb } from '#lib/server/db.js';
import { notify } from '#lib/server/notifications.js';
import { Invoice } from '#lib/server/models/invoice.js';
import { Lease } from '#lib/server/models/lease.js';
import { parseId } from '#lib/server/repo.js';
import { tenantInvoices } from '#lib/server/tenant.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireRole(locals, 'tenant');
	const invoice = (await tenantInvoices(user.id)).find((item) => item.id === params.id);
	if (!invoice) error(404);
	return { invoice };
};

export const actions: Actions = {
	paid: async ({ params, locals }) => {
		const user = requireRole(locals, 'tenant');
		await connectDb();
		const invoice = await Invoice.findById(parseId(params.id));
		if (!invoice || invoice.status === 'draft') error(404);
		const owns = await Lease.exists({
			_id: invoice.leaseId,
			tenantId: new Types.ObjectId(user.id)
		});
		if (!owns) error(404);
		if (!isOpenStatus(effectiveStatus(invoice))) return fail(400, { formError: 'not_open' });
		const first = !invoice.tenantPaidAt;
		invoice.tenantPaidAt ??= new Date();
		await invoice.save();
		if (first) {
			await notify(invoice.realtorId, 'tenant_paid', {
				invoiceId: String(invoice._id),
				number: invoice.number
			});
		}
		return { success: true };
	}
};
