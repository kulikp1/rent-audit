import type { ApartmentDoc } from '../models/apartment';
import type { Repo } from '../repo';
import { apartmentAnalysis } from './anomaly-service';
import type { AnomalyReason } from './anomalies';
import type { Service, Unit } from './calc';

export type StatsView = {
	service: Service;
	unit: Unit;
	points: { period: string; value: number; reasons: AnomalyReason[] }[];
};

const units: Record<Service, Unit> = { water: 'm3', gas: 'm3', electricity: 'kwh' };

export async function statsFor(
	scope: Repo,
	apartment: Pick<ApartmentDoc, '_id' | 'residents'>
): Promise<StatsView[]> {
	const analysis = await apartmentAnalysis(scope, apartment);
	return (['electricity', 'gas', 'water'] as const).flatMap((service) => {
		const points = analysis[service];
		return points && points.length > 0 ? [{ service, unit: units[service], points }] : [];
	});
}
