import type { Types } from 'mongoose';
import type { MeterDoc } from './models/meter';
import type { Repo } from './repo';
import type { RecognitionClaims } from './recognition-token';
import { checkReadingAnomaly } from './billing/anomaly-service';
import { notify } from './notifications';
import { checkReading, type MeterKind } from './validation/reading';

export type ReadingHistoryEntry = {
	values: number[];
	label: 'recognized' | 'tenant' | 'realtor' | 'manual';
	reason: string;
};

export async function confirmedSeries(scope: Repo, meter: MeterDoc): Promise<number[][]> {
	const rows = await scope.readings
		.find({ meterId: meter._id, status: 'confirmed' })
		.sort({ period: -1 })
		.limit(7)
		.lean();
	return rows.reverse().map((row) => [...row.values]);
}

export async function previousFor(scope: Repo, meter: MeterDoc) {
	const series = await confirmedSeries(scope, meter);
	const previous = series.length > 0 ? series[series.length - 1]! : [...meter.initialReading];
	return { previous, history: series.slice(0, -1) };
}

type Submission = {
	scope: Repo;
	leaseId: Types.ObjectId;
	apartmentId: Types.ObjectId;
	meter: MeterDoc;
	period: string;
	values: number[];
	claims: RecognitionClaims | null;
	photoPublicId: string;
	reason: string;
};

export type SubmitResult = { status: 'created' | 'resubmitted' | 'duplicate' };

export async function submitReading(input: Submission): Promise<SubmitResult> {
	const { scope, meter, claims, values } = input;
	const existing = await scope.readings.findOne({ meterId: meter._id, period: input.period });
	if (existing && existing.status !== 'rejected') return { status: 'duplicate' };

	const { previous, history } = await previousFor(scope, meter);
	const check = checkReading({
		meterType: meter.type as MeterKind,
		digits: meter.digits,
		serial: meter.serial,
		values,
		previous,
		history,
		recognized: claims
			? {
					meterType: claims.meterType,
					serial: claims.serial,
					legible: claims.legible,
					confidence: claims.confidence
				}
			: undefined
	});

	const entries: ReadingHistoryEntry[] = [];
	if (claims) {
		entries.push({ values: claims.numbers, label: 'recognized', reason: '' });
		const changed =
			claims.numbers.length !== values.length ||
			values.some((value, zone) => value !== claims.numbers[zone]);
		if (changed) entries.push({ values, label: 'tenant', reason: input.reason });
	} else {
		entries.push({ values, label: 'manual', reason: '' });
	}

	const fields = {
		values,
		source: claims ? 'gemini' : 'manual',
		status: check.ok ? 'confirmed' : 'needs_confirmation',
		flags: check.flags,
		photoPublicId: claims?.publicId ?? input.photoPublicId,
		rejectReason: '',
		confirmedAt: check.ok ? new Date() : undefined,
		history: entries
	};

	if (existing) {
		existing.set(fields);
		await existing.save();
		await afterSubmit(scope, meter, input.period, input.apartmentId, check.ok, existing);
		return { status: 'resubmitted' };
	}
	const created = await scope.readings.create({
		apartmentId: input.apartmentId,
		meterId: meter._id,
		leaseId: input.leaseId,
		period: input.period,
		...fields
	});
	await afterSubmit(scope, meter, input.period, input.apartmentId, check.ok, created);
	return { status: 'created' };
}

async function afterSubmit(
	scope: Repo,
	meter: MeterDoc,
	period: string,
	apartmentId: Types.ObjectId,
	confirmed: boolean,
	reading: { apartmentId: unknown; meterId: unknown; period: string }
) {
	if (confirmed) {
		await checkReadingAnomaly(scope, reading);
		return;
	}
	const apartment = await scope.apartments.findById(apartmentId);
	await notify(
		scope.realtorId,
		'reading_pending',
		{
			apartmentId: String(apartmentId),
			apartmentName: apartment?.name ?? '',
			serial: meter.serial,
			period
		},
		`pending:${meter._id}:${period}:${Date.now()}`
	);
}
