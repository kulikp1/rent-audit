import mongoose from 'mongoose';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
};

const email = option('--email')?.trim().toLowerCase();
const reset = flag('--reset');
const { MONGODB_URI, MONGODB_DB } = process.env;

if (!email) {
	console.error('Usage: npm run seed -- --email <realtor google email> [--reset]');
	process.exit(1);
}
if (!MONGODB_URI) {
	console.error('MONGODB_URI is not set. Run through "npm run seed" so .env is loaded.');
	process.exit(1);
}

await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB || 'rent-audit' });
const db = mongoose.connection.db;
const id = () => new mongoose.Types.ObjectId();

const SAMPLE_IBAN = 'UA213223130000026007233566001';
const DEMO_COLLECTIONS = [
	'apartments',
	'meters',
	'leases',
	'readings',
	'invoices',
	'notifications',
	'tariffs'
];

const realtor = await db.collection('users').findOne({ email, role: 'realtor' });
if (!realtor) {
	console.error(
		`No realtor with email ${email}. Sign in with this Google account once, then run the seed again.`
	);
	await mongoose.disconnect();
	process.exit(1);
}

async function removeDemo() {
	const demoTenants = await db
		.collection('users')
		.find({ demoSeed: true })
		.project({ _id: 1 })
		.toArray();
	const tenantIds = demoTenants.map((user) => user._id);
	const removed = {};
	for (const name of DEMO_COLLECTIONS) {
		const filter =
			name === 'notifications'
				? { $or: [{ demoSeed: true }, { userId: { $in: tenantIds } }] }
				: { demoSeed: true };
		removed[name] = (await db.collection(name).deleteMany(filter)).deletedCount;
	}
	removed.tenants = (await db.collection('users').deleteMany({ demoSeed: true })).deletedCount;
	await db.collection('users').updateOne(
		{ _id: realtor._id, 'realtorProfile.iban': SAMPLE_IBAN },
		{
			$set: { 'realtorProfile.iban': '', 'realtorProfile.fullName': '', 'realtorProfile.taxId': '' }
		}
	);
	return removed;
}

if (reset) {
	console.log('Removed demo data:', JSON.stringify(await removeDemo()));
	await mongoose.disconnect();
	process.exit(0);
}

if (await db.collection('apartments').findOne({ realtorId: realtor._id, demoSeed: true })) {
	console.error('Demo data already exists for this realtor. Run with --reset to remove it first.');
	await mongoose.disconnect();
	process.exit(1);
}

const now = new Date();
const monthDate = (offset, day = 1) => new Date(now.getFullYear(), now.getMonth() + offset, day, 9);
const periodOf = (offset) => {
	const date = monthDate(offset);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
const round3 = (value) => Math.round((value + Number.EPSILON) * 1000) / 1000;
const days = (count) => new Date(now.getTime() + count * 86400000);

const demo = { demoSeed: true, realtorId: realtor._id };
const stamps = (date = now) => ({ createdAt: date, updatedAt: date });

const prices = {
	water: { price: 40, night: null },
	gas: { price: 7.96, night: null },
	electricity: { price: 4.32, night: 2.16 }
};

await db.collection('tariffs').insertMany([
	{
		demoSeed: true,
		scope: 'local',
		realtorId: realtor._id,
		service: 'water',
		price: prices.water.price,
		effectiveFrom: monthDate(-12),
		...stamps()
	},
	...((await db.collection('tariffs').countDocuments({ scope: 'national' })) === 0
		? [
				{
					demoSeed: true,
					scope: 'national',
					service: 'electricity',
					price: prices.electricity.price,
					nightPrice: prices.electricity.night,
					effectiveFrom: monthDate(-12),
					...stamps()
				},
				{
					demoSeed: true,
					scope: 'national',
					service: 'gas',
					price: prices.gas.price,
					effectiveFrom: monthDate(-12),
					...stamps()
				}
			]
		: [])
]);

await db.collection('users').updateOne(
	{
		_id: realtor._id,
		$or: [
			{ 'realtorProfile.iban': { $in: [null, ''] } },
			{ 'realtorProfile.iban': { $exists: false } }
		]
	},
	{
		$set: {
			'realtorProfile.iban': SAMPLE_IBAN,
			'realtorProfile.fullName': 'Демонстраційний Ріелтор',
			'realtorProfile.taxId': '0000000000'
		}
	}
);

const tenants = [
	{
		_id: id(),
		googleId: 'demo-tenant-1',
		email: 'demo.tenant.1@example.invalid',
		name: 'Олена Прикладна',
		picture: '',
		role: 'tenant',
		locale: 'uk',
		demoSeed: true,
		...stamps()
	},
	{
		_id: id(),
		googleId: 'demo-tenant-2',
		email: 'demo.tenant.2@example.invalid',
		name: 'Максим Тестовий',
		picture: '',
		role: 'tenant',
		locale: 'uk',
		demoSeed: true,
		...stamps()
	}
];
await db.collection('users').insertMany(tenants);

const apartments = [
	{
		_id: id(),
		name: 'Центр, вул. Прикладна 10',
		address: 'Київ, вул. Прикладна, 10, кв. 12',
		rentAmount: 14000,
		residents: 2,
		status: 'rented',
		rentHistory: [
			{ amount: 12500, effectiveFrom: monthDate(-12) },
			{ amount: 14000, effectiveFrom: monthDate(-6) }
		]
	},
	{
		_id: id(),
		name: 'Лівий берег, пр. Тестовий 5',
		address: 'Київ, пр. Тестовий, 5, кв. 48',
		rentAmount: 9500,
		residents: 1,
		status: 'rented',
		rentHistory: [{ amount: 9500, effectiveFrom: monthDate(-12) }]
	},
	{
		_id: id(),
		name: 'Околиця, вул. Вигадана 3',
		address: 'Київ, вул. Вигадана, 3, кв. 7',
		rentAmount: 8000,
		residents: 1,
		status: 'free',
		rentHistory: [{ amount: 8000, effectiveFrom: monthDate(-12) }]
	}
].map((apartment) => ({ ...apartment, ...demo, ...stamps() }));
const [central, left, free] = apartments;
await db.collection('apartments').insertMany(apartments);

const meter = (apartment, type, serial, zones, initial, extra = {}) => ({
	_id: id(),
	...demo,
	apartmentId: apartment._id,
	type,
	serial,
	digits: 5,
	zones,
	initialReading: initial,
	active: true,
	finalReading: [],
	...extra,
	...stamps()
});

const centralWater = meter(central, 'water', 'W-DEMO-101', 1, [100]);
const centralGas = meter(central, 'gas', 'G-DEMO-201', 1, [500]);
const centralPower = meter(central, 'electricity', 'E-DEMO-301', 2, [3000, 1500]);
const leftOldWater = meter(left, 'water', 'W-DEMO-102', 1, [50], {
	active: false,
	replacedAt: monthDate(-2, 12),
	finalReading: [95]
});
const leftWater = meter(left, 'water', 'W-DEMO-103', 1, [0], { replacesId: leftOldWater._id });
leftOldWater.replacedById = leftWater._id;
const leftPower = meter(left, 'electricity', 'E-DEMO-302', 1, [8000]);
const freeWater = meter(free, 'water', 'W-DEMO-104', 1, [10]);
const meters = [
	centralWater,
	centralGas,
	centralPower,
	leftOldWater,
	leftWater,
	leftPower,
	freeWater
];
await db.collection('meters').insertMany(meters);

const leases = [
	{
		_id: id(),
		...demo,
		apartmentId: central._id,
		tenantId: tenants[0]._id,
		startedAt: monthDate(-11, 15),
		moveInReadings: [centralWater, centralGas, centralPower].map((item) => ({
			meterId: item._id,
			values: item.initialReading
		})),
		moveOutReadings: [],
		...stamps()
	},
	{
		_id: id(),
		...demo,
		apartmentId: left._id,
		tenantId: tenants[1]._id,
		startedAt: monthDate(-8, 3),
		moveInReadings: [leftOldWater, leftPower].map((item) => ({
			meterId: item._id,
			values: item.initialReading
		})),
		moveOutReadings: [],
		...stamps()
	}
];
await db.collection('leases').insertMany(leases);
const [centralLease, leftLease] = leases;

const readings = [];
const series = {};
function addSeries(item, lease, deltas, fromOffset) {
	let values = [...item.initialReading];
	const points = [];
	deltas.forEach((delta, index) => {
		values = values.map((value, zone) =>
			round3(value + (Array.isArray(delta) ? delta[zone] : delta))
		);
		const period = periodOf(fromOffset + index);
		points.push({ period, values: [...values], delta });
		readings.push({
			_id: id(),
			...demo,
			apartmentId: item.apartmentId,
			meterId: item._id,
			leaseId: lease._id,
			period,
			values: [...values],
			source: 'manual',
			status: 'confirmed',
			flags: [],
			photoPublicId: '',
			rejectReason: '',
			history: [
				{
					values: [...values],
					label: 'manual',
					reason: '',
					at: monthDate(fromOffset + index + 1, 2)
				}
			],
			confirmedAt: monthDate(fromOffset + index + 1, 2),
			...stamps(monthDate(fromOffset + index + 1, 2))
		});
	});
	series[String(item._id)] = points;
	return values;
}

const waterLast = addSeries(centralWater, centralLease, [6, 7, 6, 8, 7, 6, 7, 8, 7, 31], -10);
addSeries(centralGas, centralLease, [20, 35, 50, 55, 40, 25, 12, 8, 10, 22], -10);
addSeries(
	centralPower,
	centralLease,
	[
		[130, 70],
		[150, 80],
		[170, 90],
		[180, 90],
		[160, 85],
		[140, 75],
		[120, 65],
		[115, 60],
		[125, 70],
		[140, 78]
	],
	-10
);
addSeries(leftOldWater, leftLease, [4, 5, 4, 5, 4], -7);
addSeries(leftWater, leftLease, [5, 4], -2);
const leftPowerLast = addSeries(leftPower, leftLease, [90, 110, 130, 120, 100, 95, 105], -7);

const pendingReadings = [
	{
		meter: centralWater,
		lease: centralLease,
		values: [round3(waterLast[0] - 12)],
		source: 'manual',
		flags: ['lower_than_previous'],
		history: [{ label: 'manual' }]
	},
	{
		meter: leftPower,
		lease: leftLease,
		values: [round3(leftPowerLast[0] + 15)],
		source: 'gemini',
		flags: ['unreadable', 'serial_mismatch'],
		history: [{ label: 'recognized' }]
	}
];
for (const item of pendingReadings) {
	readings.push({
		_id: id(),
		...demo,
		apartmentId: item.meter.apartmentId,
		meterId: item.meter._id,
		leaseId: item.lease._id,
		period: periodOf(0),
		values: item.values,
		source: item.source,
		status: 'needs_confirmation',
		flags: item.flags,
		photoPublicId: '',
		rejectReason: '',
		history: item.history.map((entry) => ({ ...entry, values: item.values, reason: '', at: now })),
		...stamps()
	});
}
await db.collection('readings').insertMany(readings);

let sequence = 0;
const invoices = [];
function invoice({ apartment, lease, type, period, lines, status, issuedAt, extra = {} }) {
	sequence += 1;
	const total = round2(lines.reduce((sum, line) => sum + line.sum, 0));
	const issued =
		issuedAt ??
		monthDate(
			Number(period.slice(5)) -
				1 -
				now.getMonth() +
				(Number(period.slice(0, 4)) - now.getFullYear()) * 12 +
				1,
			3
		);
	const doc = {
		_id: id(),
		...demo,
		apartmentId: apartment._id,
		leaseId: lease._id,
		type,
		period,
		number: `INV-${String(sequence).padStart(4, '0')}`,
		lines: lines.map((line) => ({ _id: id(), serial: '', description: '', ...line })),
		total,
		status,
		...(status === 'draft'
			? {}
			: {
					issuedAt: issued,
					dueDate: new Date(issued.getTime() + 10 * 86400000),
					payout: { iban: SAMPLE_IBAN, fullName: 'Демонстраційний Ріелтор', taxId: '0000000000' }
				}),
		...extra,
		...stamps(issued)
	};
	invoices.push(doc);
	return doc;
}

const rentLine = (amount) => [
	{ kind: 'rent', quantity: 1, unit: 'month', price: amount, sum: amount }
];
const utilityLine = (item, point, service) => {
	const deltas = Array.isArray(point.delta) ? point.delta : [point.delta];
	return deltas.map((quantity, zone) => {
		const price = item.zones === 2 && zone === 1 ? prices[service].night : prices[service].price;
		return {
			kind: 'utility',
			service,
			serial: item.serial,
			zone: item.zones === 2 ? (zone === 0 ? 'day' : 'night') : 'single',
			quantity,
			unit: service === 'electricity' ? 'kwh' : 'm3',
			price,
			sum: round2(quantity * price)
		};
	});
};
const utilitiesFor = (period) => {
	const at = (item) => series[String(item._id)].find((point) => point.period === period);
	return [
		...utilityLine(centralWater, at(centralWater), 'water'),
		...utilityLine(centralGas, at(centralGas), 'gas'),
		...utilityLine(centralPower, at(centralPower), 'electricity')
	];
};

const cancelled = invoice({
	apartment: central,
	lease: centralLease,
	type: 'rent',
	period: periodOf(-4),
	lines: rentLine(1400),
	status: 'cancelled',
	extra: { cancelledAt: monthDate(-3, 4), cancelledReason: 'Помилка в сумі' }
});
const replacement = invoice({
	apartment: central,
	lease: centralLease,
	type: 'rent',
	period: periodOf(-4),
	lines: rentLine(14000),
	status: 'paid',
	extra: { paidAt: monthDate(-3, 6), replacesId: cancelled._id }
});
cancelled.replacedById = replacement._id;
for (const offset of [-3, -2]) {
	invoice({
		apartment: central,
		lease: centralLease,
		type: 'rent',
		period: periodOf(offset),
		lines: rentLine(14000),
		status: 'paid',
		extra: { paidAt: monthDate(offset + 1, 6) }
	});
}
for (const offset of [-4, -3, -2]) {
	invoice({
		apartment: central,
		lease: centralLease,
		type: 'utilities',
		period: periodOf(offset),
		lines: utilitiesFor(periodOf(offset)),
		status: 'paid',
		extra: { paidAt: monthDate(offset + 1, 9) }
	});
}
invoice({
	apartment: central,
	lease: centralLease,
	type: 'utilities',
	period: periodOf(-1),
	lines: utilitiesFor(periodOf(-1)),
	status: 'overdue',
	issuedAt: days(-25),
	extra: { tenantPaidAt: days(-2) }
});
invoice({
	apartment: central,
	lease: centralLease,
	type: 'rent',
	period: periodOf(0),
	lines: rentLine(14000),
	status: 'issued',
	issuedAt: days(-3)
});
invoice({
	apartment: left,
	lease: leftLease,
	type: 'rent',
	period: periodOf(-1),
	lines: rentLine(9500),
	status: 'paid',
	extra: { paidAt: monthDate(0, 5) }
});
invoice({
	apartment: left,
	lease: leftLease,
	type: 'utilities',
	period: periodOf(-1),
	lines: [
		...utilityLine(leftWater, series[String(leftWater._id)].at(-1), 'water'),
		...utilityLine(leftPower, series[String(leftPower._id)].at(-1), 'electricity')
	],
	status: 'draft'
});
await db.collection('invoices').insertMany(invoices);
await db
	.collection('counters')
	.updateOne({ _id: `invoice:${realtor._id}` }, { $max: { seq: sequence } }, { upsert: true });

const nextRentStart = monthDate(1);
await db.collection('apartments').updateOne(
	{ _id: left._id },
	{
		$push: {
			rentHistory: {
				amount: 10500,
				effectiveFrom: nextRentStart,
				leaseId: leftLease._id,
				notifiedAt: now
			}
		}
	}
);

await db.collection('notifications').insertMany([
	{
		userId: realtor._id,
		type: 'reading_pending',
		payload: {
			apartmentId: String(central._id),
			apartmentName: central.name,
			serial: centralWater.serial,
			period: periodOf(0)
		},
		demoSeed: true,
		createdAt: now
	},
	{
		userId: realtor._id,
		type: 'reading_pending',
		payload: {
			apartmentId: String(left._id),
			apartmentName: left.name,
			serial: leftPower.serial,
			period: periodOf(0)
		},
		demoSeed: true,
		createdAt: now
	},
	{
		userId: realtor._id,
		type: 'anomaly',
		payload: {
			apartmentId: String(central._id),
			apartmentName: central.name,
			service: 'water',
			period: periodOf(-1)
		},
		demoSeed: true,
		createdAt: new Date(now.getTime() - 3600000)
	},
	{
		userId: realtor._id,
		type: 'tenant_paid',
		payload: {
			invoiceId: String(invoices.find((item) => item.status === 'overdue')._id),
			number: invoices.find((item) => item.status === 'overdue').number
		},
		demoSeed: true,
		createdAt: new Date(now.getTime() - 7200000)
	}
]);

console.log(
	`Demo data created for ${email}: ${apartments.length} apartments, ${meters.length} meters, ${readings.length} readings, ${invoices.length} invoices.`
);
console.log(
	'Tenants are placeholders and cannot sign in. To see the tenant view, invite a second Google account to an apartment.'
);
await mongoose.disconnect();
