import { error, fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { fieldErrors } from '#lib/schemas/errors.js';
import { requireRole } from '#lib/server/auth/guards.js';
import {
	canCancel,
	canEdit,
	canIssue,
	canMarkPaid,
	effectiveStatus,
	round2,
	sumLines
} from '#lib/server/billing/calc.js';
import { invoiceViews, issueInvoice, nextInvoiceNumber } from '#lib/server/billing/invoices.js';
import { connectDb } from '#lib/server/db.js';
import { notify } from '#lib/server/notifications.js';
import { User } from '#lib/server/models/user.js';
import { parseId, repo } from '#lib/server/repo.js';
import type { Actions, PageServerLoad } from './$types';

const number = (min: number) =>
	z
		.string()
		.trim()
		.min(1, 'required')
		.transform((value) => Number(value.replace(',', '.')))
		.pipe(z.number('invalid_number').min(min, 'min_zero').max(10_000_000, 'invalid_number'));

const lineSchema = z.object({
	description: z.string().trim().min(1, 'required').max(120, 'too_long'),
	quantity: number(0.001),
	price: number(0)
});

async function loadInvoice(userId: string, id: string) {
	const scope = await repo(userId);
	const invoice = await scope.invoices.findById(parseId(id));
	if (!invoice) error(404);
	return { scope, invoice };
}

async function notifyTenant(
	scope: Awaited<ReturnType<typeof repo>>,
	invoice: { _id: unknown; leaseId: unknown; number: string; total: number },
	type: 'invoice_issued' | 'payment_confirmed'
) {
	const lease = await scope.leases.findById(String(invoice.leaseId));
	if (!lease) return;
	await notify(lease.tenantId, type, {
		invoiceId: String(invoice._id),
		number: invoice.number,
		total: invoice.total
	});
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = requireRole(locals, 'realtor');
	const { scope, invoice } = await loadInvoice(user.id, params.id);
	const [view] = await invoiceViews(scope, [invoice.toObject()]);
	await connectDb();
	const realtor = await User.findById(user.id).select('realtorProfile').lean();
	const [replaces, replacedBy] = await Promise.all([
		invoice.replacesId ? scope.invoices.findById(invoice.replacesId).select('number').lean() : null,
		invoice.replacedById
			? scope.invoices.findById(invoice.replacedById).select('number').lean()
			: null
	]);
	return {
		invoice: view!,
		payoutReady: !!(realtor?.realtorProfile?.iban && realtor.realtorProfile.fullName),
		replaces: replaces ? { id: String(replaces._id), number: replaces.number } : null,
		replacedBy: replacedBy ? { id: String(replacedBy._id), number: replacedBy.number } : null
	};
};

export const actions: Actions = {
	addLine: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { invoice } = await loadInvoice(user.id, params.id);
		if (!canEdit(invoice.status)) return fail(400, { errors: {}, formError: 'not_draft' });
		const parsed = lineSchema.safeParse(Object.fromEntries(await request.formData()));
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });
		invoice.lines.push({
			kind: 'manual',
			description: parsed.data.description,
			quantity: parsed.data.quantity,
			unit: 'pcs',
			price: parsed.data.price,
			sum: round2(parsed.data.quantity * parsed.data.price)
		});
		invoice.total = sumLines(invoice.lines);
		await invoice.save();
		return { success: true };
	},

	removeLine: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { invoice } = await loadInvoice(user.id, params.id);
		if (!canEdit(invoice.status)) return fail(400, { formError: 'not_draft' });
		const data = await request.formData();
		const line = invoice.lines.id(String(data.get('lineId') ?? ''));
		if (!line || line.kind !== 'manual') error(404);
		line.deleteOne();
		invoice.total = sumLines(invoice.lines);
		await invoice.save();
		return { success: true };
	},

	issue: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, invoice } = await loadInvoice(user.id, params.id);
		if (!canIssue(invoice.status)) return fail(400, { formError: 'not_draft' });
		const result = await issueInvoice(invoice, scope.realtorId);
		if (!result.ok) return fail(400, { formError: result.error });
		await notifyTenant(scope, invoice, 'invoice_issued');
		return { success: true };
	},

	markPaid: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, invoice } = await loadInvoice(user.id, params.id);
		if (!canMarkPaid(effectiveStatus(invoice))) return fail(400, { formError: 'not_open' });
		invoice.status = 'paid';
		invoice.paidAt = new Date();
		await invoice.save();
		await notifyTenant(scope, invoice, 'payment_confirmed');
		return { success: true };
	},

	cancel: async ({ request, params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, invoice } = await loadInvoice(user.id, params.id);
		if (!canCancel(effectiveStatus(invoice)))
			return fail(400, { errors: {}, formError: 'not_open' });
		const data = await request.formData();
		const reason = String(data.get('reason') ?? '').trim();
		if (!reason) return fail(400, { errors: { reason: 'required' } });

		invoice.status = 'cancelled';
		invoice.cancelledAt = new Date();
		invoice.cancelledReason = reason;

		if (data.get('reissue') === 'on') {
			const copy = await scope.invoices.create({
				apartmentId: invoice.apartmentId,
				leaseId: invoice.leaseId,
				type: invoice.type,
				period: invoice.period,
				number: await nextInvoiceNumber(scope.realtorId),
				lines: invoice.lines.map((line) => line.toObject()),
				total: invoice.total,
				status: 'draft',
				replacesId: invoice._id
			});
			invoice.replacedById = copy._id;
			await invoice.save();
			redirect(303, `/realtor/invoices/${copy._id}`);
		}
		await invoice.save();
		return { success: true };
	},

	deleteDraft: async ({ params, locals }) => {
		const user = requireRole(locals, 'realtor');
		const { scope, invoice } = await loadInvoice(user.id, params.id);
		if (!canEdit(invoice.status)) return fail(400, { formError: 'not_draft' });
		await scope.invoices.deleteOne({ _id: invoice._id });
		redirect(303, '/realtor/invoices');
	}
};
