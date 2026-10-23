import { analyzePoint } from '../src/lib/server/billing/anomalies.ts';

const args = process.argv.slice(2);
const option = (name, fallback) => {
	const index = args.indexOf(name);
	return index >= 0 ? Number(args[index + 1]) : fallback;
};

const runs = option('--runs', 500);
const seed = option('--seed', 42);

function rng(start) {
	let state = start >>> 0;
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

const random = rng(seed);
const between = (min, max) => min + random() * (max - min);

const services = {
	water: { base: [5, 9], season: 0.1, spread: 0.12 },
	gas: { base: [25, 45], season: 0.55, spread: 0.15 },
	electricity: { base: [180, 320], season: 0.2, spread: 0.12 }
};

const deviations = {
	spike_x2: (value) => value * 2,
	spike_x3: (value) => value * 3,
	zero: () => 0,
	drop_80: (value) => value * 0.2
};

const buckets = [
	{ id: 'new (2 months of history)', length: 2 },
	{ id: 'regular (6 months)', length: 6 },
	{ id: 'year (14 months)', length: 14 }
];

function period(index) {
	const year = 2024 + Math.floor(index / 12);
	return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}

function history(service, length, start) {
	const { base, season, spread } = services[service];
	const level = between(base[0], base[1]);
	return Array.from({ length }, (_, offset) => {
		const month = (start + offset) % 12;
		const seasonal = 1 + season * Math.cos(((month - 0) / 12) * 2 * Math.PI);
		return {
			period: period(start + offset),
			value: Math.max(0, level * seasonal * (1 + between(-spread, spread)))
		};
	});
}

const stats = new Map();
const bucketStats = (key) => {
	if (!stats.has(key)) {
		stats.set(key, { clean: 0, falsePositive: 0, byService: {}, byReason: {}, injected: {} });
	}
	return stats.get(key);
};

for (const bucket of buckets) {
	for (let run = 0; run < runs; run += 1) {
		const service = Object.keys(services)[run % 3];
		const start = Math.floor(between(0, 12));
		const points = history(service, bucket.length + 1, start);
		const target = points[points.length - 1];
		const prior = points.slice(0, -1);
		const context = { service, residents: 4 };
		const entry = bucketStats(bucket.id);

		entry.clean += 1;
		entry.byService[service] ??= { clean: 0, falsePositive: 0 };
		entry.byService[service].clean += 1;
		const cleanReasons = analyzePoint(target, prior, context);
		if (cleanReasons.length > 0) {
			entry.falsePositive += 1;
			entry.byService[service].falsePositive += 1;
			for (const reason of cleanReasons) {
				entry.byReason[reason.code] = (entry.byReason[reason.code] ?? 0) + 1;
			}
		}

		for (const [name, apply] of Object.entries(deviations)) {
			entry.injected[name] ??= { total: 0, detected: 0 };
			entry.injected[name].total += 1;
			const modified = { ...target, value: Math.round(apply(target.value) * 1000) / 1000 };
			if (analyzePoint(modified, prior, context).length > 0) entry.injected[name].detected += 1;
		}
	}
}

const pct = (part, total) => (total === 0 ? '—' : `${((part / total) * 100).toFixed(1)}%`);

console.log(
	`Anomaly detection on synthetic histories (${runs} histories per bucket, seed ${seed})\n`
);
for (const [bucket, entry] of stats) {
	console.log(bucket);
	console.log(
		`  false positives on normal months: ${pct(entry.falsePositive, entry.clean)} (${entry.falsePositive}/${entry.clean})`
	);
	for (const [service, result] of Object.entries(entry.byService)) {
		console.log(
			`    false positives, ${service.padEnd(11)}: ${pct(result.falsePositive, result.clean)}`
		);
	}
	const reasons = Object.entries(entry.byReason).map(([code, count]) => `${code}=${count}`);
	if (reasons.length > 0) console.log(`    false positive reasons: ${reasons.join(', ')}`);
	for (const [name, result] of Object.entries(entry.injected)) {
		console.log(
			`  ${name.padEnd(10)} detected: ${pct(result.detected, result.total)} (${result.detected}/${result.total})`
		);
	}
	console.log('');
}
