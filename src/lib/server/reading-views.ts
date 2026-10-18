import type { QueryFilter } from 'mongoose';
import type { ReadingDoc } from './models/reading';
import { User } from './models/user';
import type { Repo } from './repo';
import { lockedKeys } from './billing/invoices';

export type ReadingView = {
	id: string;
	apartmentId: string;
	apartmentName: string;
	tenantName: string;
	meterId: string;
	meterType: 'water' | 'gas' | 'electricity';
	serial: string;
	digits: number;
	zones: number;
	period: string;
	values: number[];
	previous: number[];
	status: 'confirmed' | 'needs_confirmation' | 'rejected';
	source: 'manual' | 'gemini';
	flags: string[];
	hasPhoto: boolean;
	locked: boolean;
	rejectReason: string;
	history: { label: string; values: number[]; reason: string; at: string }[];
};

export async function readingViews(
	scope: Repo,
	filter: QueryFilter<ReadingDoc> = {},
	limit = 200
): Promise<ReadingView[]> {
	const readings = await scope.readings
		.find(filter)
		.sort({ period: -1, createdAt: -1 })
		.limit(limit)
		.lean();
	if (readings.length === 0) return [];

	const meterIds = [...new Set(readings.map((reading) => String(reading.meterId)))];
	const apartmentIds = [...new Set(readings.map((reading) => String(reading.apartmentId)))];
	const leaseIds = [...new Set(readings.map((reading) => String(reading.leaseId)))];

	const locked = await lockedKeys(scope, apartmentIds);

	const [meters, apartments, leases, confirmed] = await Promise.all([
		scope.meters.find({ _id: { $in: meterIds } }).lean(),
		scope.apartments.find({ _id: { $in: apartmentIds } }).lean(),
		scope.leases.find({ _id: { $in: leaseIds } }).lean(),
		scope.readings.find({ meterId: { $in: meterIds }, status: 'confirmed' }).lean()
	]);
	const tenants = await User.find({ _id: { $in: leases.map((lease) => lease.tenantId) } })
		.select('name')
		.lean();

	const meterById = new Map(meters.map((meter) => [String(meter._id), meter]));
	const apartmentById = new Map(apartments.map((apartment) => [String(apartment._id), apartment]));
	const tenantByLease = new Map(
		leases.map((lease) => [
			String(lease._id),
			tenants.find((tenant) => String(tenant._id) === String(lease.tenantId))?.name ?? ''
		])
	);

	function previousValues(reading: (typeof readings)[number], initial: number[]): number[] {
		const earlier = confirmed
			.filter(
				(item) => String(item.meterId) === String(reading.meterId) && item.period < reading.period
			)
			.sort((a, b) => b.period.localeCompare(a.period))[0];
		return earlier ? [...earlier.values] : [...initial];
	}

	return readings.flatMap((reading) => {
		const meter = meterById.get(String(reading.meterId));
		const apartment = apartmentById.get(String(reading.apartmentId));
		if (!meter || !apartment) return [];
		return [
			{
				id: String(reading._id),
				apartmentId: String(apartment._id),
				apartmentName: apartment.name,
				tenantName: tenantByLease.get(String(reading.leaseId)) ?? '',
				meterId: String(meter._id),
				meterType: meter.type,
				serial: meter.serial,
				digits: meter.digits,
				zones: meter.zones,
				period: reading.period,
				values: [...reading.values],
				previous: previousValues(reading, meter.initialReading),
				status: reading.status,
				source: reading.source,
				flags: [...reading.flags],
				hasPhoto: !!reading.photoPublicId,
				locked: locked.has(`${reading.apartmentId}|${reading.period}`),
				rejectReason: reading.rejectReason ?? '',
				history: reading.history.map((entry) => ({
					label: entry.label,
					values: [...entry.values],
					reason: entry.reason ?? '',
					at: entry.at.toISOString()
				}))
			}
		];
	});
}
