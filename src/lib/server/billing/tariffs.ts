import type { Types } from 'mongoose';
import { connectDb } from '../db';
import { Tariff, type TariffDoc } from '../models/tariff';
import { tariffAt, type PriceLookup, type Service } from './calc';

export type TariffView = {
	id: string;
	service: Service;
	price: number;
	nightPrice: number | null;
	effectiveFrom: string;
};

export function toTariffView(doc: TariffDoc): TariffView {
	return {
		id: String(doc._id),
		service: doc.service,
		price: doc.price,
		nightPrice: doc.nightPrice ?? null,
		effectiveFrom: doc.effectiveFrom.toISOString()
	};
}

export async function nationalTariffs(): Promise<TariffDoc[]> {
	await connectDb();
	return Tariff.find({ scope: 'national' }).sort({ effectiveFrom: -1 }).lean();
}

export async function localTariffs(realtorId: Types.ObjectId): Promise<TariffDoc[]> {
	await connectDb();
	return Tariff.find({ scope: 'local', realtorId }).sort({ effectiveFrom: -1 }).lean();
}

export async function priceLookup(realtorId: Types.ObjectId, at: Date): Promise<PriceLookup> {
	const [national, local] = await Promise.all([nationalTariffs(), localTariffs(realtorId)]);
	return (service) => {
		const rows = (service === 'water' ? local : national).filter((row) => row.service === service);
		const row = tariffAt(rows, at);
		return row ? { price: row.price, nightPrice: row.nightPrice ?? null } : null;
	};
}
