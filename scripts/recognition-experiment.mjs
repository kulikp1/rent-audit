import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { AiUnavailableError, callGemini } from '../src/lib/server/gemini-core.ts';
import { evaluate, parseExpectedCsv, summarize } from '../src/lib/server/experiment.ts';

const args = process.argv.slice(2);
const option = (name, fallback) => {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : fallback;
};

const dir = option('--dir', 'experiment');
const delay = Number(option('--delay', '6500'));
const refresh = args.includes('--refresh');
const { GEMINI_API_KEY, GEMINI_MODEL } = process.env;

if (!GEMINI_API_KEY) {
	console.error('GEMINI_API_KEY is not set. Run through "npm run experiment:recognition".');
	process.exit(1);
}

const csvPath = join(dir, 'expected.csv');
if (!existsSync(csvPath)) {
	console.error(
		`${csvPath} not found. Copy ${dir}/expected.example.csv to expected.csv and fill it in.`
	);
	process.exit(1);
}

const samples = parseExpectedCsv(readFileSync(csvPath, 'utf8'));
const cachePath = join(dir, 'results.json');
const cache = !refresh && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, 'utf8')) : {};
const mimeByExtension = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp'
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const items = [];
for (const [index, sample] of samples.entries()) {
	const path = join(dir, 'photos', sample.file);
	let recognition = cache[sample.file] ?? null;
	if (!recognition) {
		const mime = mimeByExtension[extname(sample.file).toLowerCase()];
		if (!existsSync(path) || !mime) {
			console.warn(`skip ${sample.file}: file missing or unsupported type`);
		} else {
			for (let attempt = 1; attempt <= 4 && !recognition; attempt += 1) {
				try {
					recognition = await callGemini(
						{ apiKey: GEMINI_API_KEY, model: GEMINI_MODEL || 'gemini-flash-latest' },
						{ data: readFileSync(path), mime }
					);
					cache[sample.file] = recognition;
					writeFileSync(cachePath, JSON.stringify(cache, null, 2));
				} catch (error) {
					if (!(error instanceof AiUnavailableError)) throw error;
					const retryable = /gemini_(http_(429|500|502|503|504)|unreachable)/.test(error.message);
					console.warn(`${sample.file}: ${error.message} (attempt ${attempt})`);
					if (!retryable || attempt === 4) break;
					await sleep(attempt * 4000);
				}
			}
			if (index < samples.length - 1) await sleep(delay);
		}
	}
	const outcome = evaluate(sample, recognition);
	items.push({ sample, outcome, recognition });
	console.log(
		`${String(index + 1).padStart(3)}/${samples.length} ${sample.file.padEnd(24)} ${sample.condition.padEnd(10)} ${outcome.decision}${outcome.flags.length ? ` [${outcome.flags.join(', ')}]` : ''}`
	);
}

const pct = (part, total) => (total === 0 ? '—' : `${((part / total) * 100).toFixed(1)}%`);
const rows = summarize(items);

console.log('\nRecognition without checks vs with contextual validation\n');
for (const row of rows) {
	const done = row.total - row.unavailable;
	console.log(`${row.condition} (${row.total} photos, ${row.unavailable} unavailable)`);
	console.log(
		`  without checks: correct ${row.baselineCorrect} (${pct(row.baselineCorrect, done)}), wrong accepted ${row.baselineWrong} (${pct(row.baselineWrong, done)})`
	);
	console.log(
		`  with checks:    correct accepted ${row.acceptedCorrect} (${pct(row.acceptedCorrect, done)}), wrong accepted ${row.acceptedWrong} (${pct(row.acceptedWrong, done)})`
	);
	console.log(
		`                  sent to manual confirmation ${row.manualJustified + row.manualUnnecessary} (${pct(row.manualJustified + row.manualUnnecessary, done)}): justified ${row.manualJustified}, unnecessary ${row.manualUnnecessary}`
	);
}

const header =
	'condition,total,unavailable,baseline_correct,baseline_wrong,accepted_correct,accepted_wrong,manual_justified,manual_unnecessary';
const lines = rows.map((row) =>
	[
		row.condition,
		row.total,
		row.unavailable,
		row.baselineCorrect,
		row.baselineWrong,
		row.acceptedCorrect,
		row.acceptedWrong,
		row.manualJustified,
		row.manualUnnecessary
	].join(',')
);
writeFileSync(join(dir, 'report.csv'), [header, ...lines].join('\n'));
console.log(`\nSaved ${join(dir, 'report.csv')} and ${cachePath}`);
