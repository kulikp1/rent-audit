import type { ApartmentDoc } from '../models/apartment';
import { notify } from '../notifications';
import type { Repo } from '../repo';
import {
	analyzeSeries,
	consumptionSeries,
	mergeSeries,
	median,
	normPerResident,
	periodIndex,
	type AnalyzedPoint,
	type AnomalyReason
} from './anomalies';
import type { Service } from './calc';

export type ApartmentAnalysis = Partial<Record<Service, AnalyzedPoint[]>>;

export async function apartmentAnalysis(
	scope: Repo,
	apartment: Pick<ApartmentDoc, '_id' | 'residents'>
): Promise<ApartmentAnalysis> {
	const [meters, readings] = await Promise.all([
		scope.meters.find({ apartmentId: apartment._id }).lean(),
		scope.readings.find({ apartmentId: apartment._id, status: 'confirmed' }).lean()
	]);
	const result: ApartmentAnalysis = {};
	for (const service of ['water', 'gas', 'electricity'] as const) {
		const perMeter = meters
			.filter((meter) => meter.type === service)
			.map((meter) =>
				consumptionSeries(
					readings
						.filter((reading) => String(reading.meterId) === String(meter._id))
						.map((reading) => ({ period: reading.period, values: reading.values })),
					meter.initialReading
				)
			);
		const merged = mergeSeries(perMeter);
		if (merged.length > 0) {
			result[service] = analyzeSeries(merged, { service, residents: apartment.residents ?? 1 });
		}
	}
	return result;
}

export type AnomalySeriesPoint = { period: string; value: number; anomaly: boolean };

export type DashboardAnomaly = {
	apartmentId: string;
	apartmentName: string;
	service: Service;
	period: string;
	reasons: AnomalyReason[];
	value: number;
	usual: number;
	norm: number;
	series: AnomalySeriesPoint[];
};

const SERIES_LENGTH = 6;

function buildAnomaly(
	apartment: Pick<ApartmentDoc, '_id' | 'name' | 'residents'>,
	service: Service,
	points: AnalyzedPoint[],
	index: number
): DashboardAnomaly {
	const point = points[index]!;
	const history = points.slice(Math.max(0, index - SERIES_LENGTH), index);
	return {
		apartmentId: String(apartment._id),
		apartmentName: apartment.name,
		service,
		period: point.period,
		reasons: point.reasons,
		value: point.value,
		usual: median(history.map((item) => item.value)),
		norm: normPerResident[service] * Math.max(1, apartment.residents ?? 1),
		series: points.slice(Math.max(0, index - SERIES_LENGTH + 1), index + 1).map((item) => ({
			period: item.period,
			value: item.value,
			anomaly: item.reasons.length > 0
		}))
	};
}

function recentAnomalies(
	apartment: Pick<ApartmentDoc, '_id' | 'name' | 'residents'>,
	analysis: ApartmentAnalysis,
	currentIndex: number
): DashboardAnomaly[] {
	const found: DashboardAnomaly[] = [];
	for (const [service, points] of Object.entries(analysis) as [Service, AnalyzedPoint[]][]) {
		const last = points[points.length - 1];
		if (last && last.reasons.length > 0 && currentIndex - periodIndex(last.period) <= 2) {
			found.push(buildAnomaly(apartment, service, points, points.length - 1));
		}
	}
	return found;
}

export async function apartmentAnomalies(
	scope: Repo,
	apartment: Pick<ApartmentDoc, '_id' | 'name' | 'residents'>,
	now = new Date()
): Promise<DashboardAnomaly[]> {
	const analysis = await apartmentAnalysis(scope, apartment);
	return recentAnomalies(apartment, analysis, now.getFullYear() * 12 + now.getMonth());
}

export async function dashboardAnomalies(
	scope: Repo,
	now = new Date()
): Promise<DashboardAnomaly[]> {
	const currentIndex = now.getFullYear() * 12 + now.getMonth();
	const apartments = await scope.apartments.find().lean();
	const found: DashboardAnomaly[] = [];
	for (const apartment of apartments) {
		found.push(
			...recentAnomalies(apartment, await apartmentAnalysis(scope, apartment), currentIndex)
		);
	}
	return found;
}

export type HistoryAnomaly = DashboardAnomaly & { recent: boolean };

export async function allAnomalies(scope: Repo, now = new Date()): Promise<HistoryAnomaly[]> {
	const currentIndex = now.getFullYear() * 12 + now.getMonth();
	const apartments = await scope.apartments.find().lean();
	const found: HistoryAnomaly[] = [];
	for (const apartment of apartments) {
		const analysis = await apartmentAnalysis(scope, apartment);
		for (const [service, points] of Object.entries(analysis) as [Service, AnalyzedPoint[]][]) {
			points.forEach((point, index) => {
				if (point.reasons.length === 0) return;
				found.push({
					...buildAnomaly(apartment, service, points, index),
					recent: currentIndex - periodIndex(point.period) <= 2
				});
			});
		}
	}
	return found.sort(
		(left, right) =>
			right.period.localeCompare(left.period) ||
			left.apartmentName.localeCompare(right.apartmentName)
	);
}

export async function checkReadingAnomaly(
	scope: Repo,
	reading: { apartmentId: unknown; meterId: unknown; period: string }
): Promise<void> {
	const apartment = await scope.apartments.findById(String(reading.apartmentId));
	const meter = await scope.meters.findById(String(reading.meterId));
	if (!apartment || !meter) return;
	const analysis = await apartmentAnalysis(scope, apartment);
	const point = analysis[meter.type]?.find((item) => item.period === reading.period);
	if (!point || point.reasons.length === 0) return;
	await notify(
		scope.realtorId,
		'anomaly',
		{
			apartmentId: String(apartment._id),
			apartmentName: apartment.name,
			service: meter.type,
			period: reading.period
		},
		`anomaly:${meter._id}:${reading.period}`
	);
}
