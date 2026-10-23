import { json } from '@sveltejs/kit';
import { authorizeCron, cronNow, runRentInvoices } from '#lib/server/cron.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ request, url }) => {
	authorizeCron(request);
	return json(await runRentInvoices(cronNow(url)));
};
