<script lang="ts">
	import { Camera, CircleAlert, Keyboard, LoaderCircle, RotateCcw } from '@lucide/svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { resizeImage, uploadToCloudinary } from '#lib/utils/image.js';
	import Button from '../ui/Button.svelte';
	import Card from '../ui/Card.svelte';
	import FormField from '../ui/FormField.svelte';
	import Textarea from '../ui/Textarea.svelte';
	import MeterHeader from './MeterHeader.svelte';
	import ReadingValueInput from './ReadingValueInput.svelte';

	type Meter = {
		id: string;
		type: 'water' | 'gas' | 'electricity';
		serial: string;
		digits: number;
		zones: number;
	};

	type Recognized = { token: string; numbers: number[]; legible: boolean; flags: string[] };

	type Props = {
		meter: Meter;
		previous: number[];
		errors: Record<string, string>;
		photos: boolean;
		rejectReason?: string;
		disabled?: boolean;
	};

	let { meter, previous, errors, photos, rejectReason = '', disabled = false }: Props = $props();

	let mode = $state<'choose' | 'busy' | 'result' | 'manual'>('choose');
	let busyStep = $state<'upload' | 'recognize'>('upload');
	let notice = $state('');
	let recognized = $state<Recognized | null>(null);
	let publicId = $state('');
	let preview = $state('');
	let current = $state<string[]>([]);
	let attempt = $state(0);
	let fileInput = $state<HTMLInputElement>();

	const showFields = $derived(!photos || mode === 'manual' || mode === 'result');
	const initial = $derived(recognized ? recognized.numbers.map(String) : []);
	const edited = $derived(
		!!recognized &&
			recognized.numbers.length > 0 &&
			recognized.numbers.some(
				(number, zone) => Number((current[zone] ?? '').replace(',', '.')) !== number
			)
	);
	const warnings = $derived.by(() => {
		if (!recognized) return [];
		const texts: string[] = [];
		if (!recognized.legible || recognized.flags.includes('unreadable')) {
			texts.push(m.reading_flag_unreadable());
		}
		if (recognized.flags.includes('type_mismatch')) texts.push(m.reading_flag_type_mismatch());
		if (recognized.flags.includes('serial_mismatch')) texts.push(m.reading_flag_serial_mismatch());
		return texts;
	});

	async function handleFile(file: File | undefined) {
		if (!file) return;
		notice = '';
		mode = 'busy';
		busyStep = 'upload';
		if (preview) URL.revokeObjectURL(preview);
		preview = URL.createObjectURL(file);
		try {
			publicId = await uploadToCloudinary(await resizeImage(file));
		} catch {
			publicId = '';
			notice = m.photo_upload_failed();
			mode = 'manual';
			return;
		}
		busyStep = 'recognize';
		try {
			const response = await fetch('/api/readings/recognize', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ meterId: meter.id, publicId })
			});
			if (!response.ok) throw new Error('recognize_failed');
			recognized = (await response.json()) as Recognized;
			current = recognized.numbers.map(String);
			attempt += 1;
			mode = 'result';
		} catch {
			recognized = null;
			notice = m.photo_ai_unavailable();
			mode = 'manual';
		}
	}

	function restart() {
		recognized = null;
		publicId = '';
		current = [];
		notice = '';
		mode = 'choose';
		if (fileInput) fileInput.value = '';
	}
</script>

<Card>
	<MeterHeader type={meter.type} serial={meter.serial} {previous} />

	{#if rejectReason}
		<div
			class="mt-4 flex items-start gap-3 rounded-control bg-warning-50 p-3 text-sm text-warning-700"
		>
			<CircleAlert class="mt-0.5 size-4 shrink-0" />
			<span>{m.reading_rejected_note({ reason: rejectReason })}</span>
		</div>
	{/if}

	{#if photos}
		<input
			bind:this={fileInput}
			type="file"
			accept="image/*"
			capture="environment"
			class="hidden"
			onchange={(event) => handleFile(event.currentTarget.files?.[0])}
		/>
	{/if}

	<div class="mt-4">
		{#if photos && mode === 'choose'}
			<div class="flex flex-wrap gap-2">
				<Button {disabled} onclick={() => fileInput?.click()}>
					{#snippet icon()}<Camera class="size-4" />{/snippet}
					{m.photo_take()}
				</Button>
				<Button variant="secondary" {disabled} onclick={() => (mode = 'manual')}>
					{#snippet icon()}<Keyboard class="size-4" />{/snippet}
					{m.photo_manual()}
				</Button>
			</div>
		{:else if mode === 'busy'}
			<div class="flex items-center gap-4">
				{#if preview}
					<img src={preview} alt="" class="size-20 rounded-control object-cover" />
				{/if}
				<p class="flex items-center gap-2 text-sm text-ink-soft">
					<LoaderCircle class="size-4 animate-spin" />
					{busyStep === 'upload' ? m.photo_uploading() : m.photo_recognizing()}
				</p>
			</div>
		{/if}

		{#if showFields}
			{#if notice}
				<div
					class="mb-4 flex items-start gap-3 rounded-control bg-warning-50 p-3 text-sm text-warning-700"
				>
					<CircleAlert class="mt-0.5 size-4 shrink-0" />
					<span>{notice}</span>
				</div>
			{/if}

			{#if mode === 'result' && preview}
				<div class="mb-4 flex items-start gap-4">
					<img src={preview} alt="" class="size-24 shrink-0 rounded-control object-cover" />
					<div class="min-w-0 text-sm">
						<p class="font-medium text-ink">{m.photo_recognized()}</p>
						<p class="mt-0.5 text-ink-muted">{m.photo_check_values()}</p>
					</div>
				</div>
				{#each warnings as warning (warning)}
					<div
						class="mb-3 flex items-start gap-3 rounded-control bg-warning-50 p-3 text-sm text-warning-700"
					>
						<CircleAlert class="mt-0.5 size-4 shrink-0" />
						<span>{warning}</span>
					</div>
				{/each}
			{/if}

			{#key attempt}
				<ReadingValueInput
					{meter}
					{errors}
					{disabled}
					{initial}
					onvalue={(zone, value) => (current[zone] = value)}
				/>
			{/key}

			{#if edited}
				<div class="mt-4 max-w-md">
					<FormField label={m.reading_edit_reason()} error={errors[`reason_${meter.id}`]} required>
						{#snippet children(field)}
							<Textarea name="reason_{meter.id}" rows={2} {...field} />
						{/snippet}
					</FormField>
				</div>
			{/if}

			{#if photos}
				<div class="mt-4">
					<Button variant="ghost" size="sm" {disabled} onclick={restart}>
						{#snippet icon()}<RotateCcw class="size-4" />{/snippet}
						{m.photo_retake()}
					</Button>
				</div>
			{/if}

			{#if publicId}<input type="hidden" name="photo_{meter.id}" value={publicId} />{/if}
			{#if recognized}<input type="hidden" name="rec_{meter.id}" value={recognized.token} />{/if}
		{/if}
	</div>
</Card>
