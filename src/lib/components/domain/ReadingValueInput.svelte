<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import FormField from '../ui/FormField.svelte';
	import Input from '../ui/Input.svelte';

	type Meter = { id: string; digits: number; zones: number };

	type Props = {
		meter: Meter;
		errors?: Record<string, string>;
		disabled?: boolean;
		initial?: string[];
		prefix?: string;
		onvalue?: (zone: number, value: string) => void;
	};

	let {
		meter,
		errors = {},
		disabled = false,
		initial = [],
		prefix = 'v',
		onvalue
	}: Props = $props();

	const zones = $derived(Array.from({ length: meter.zones }, (_, zone) => zone));

	function zoneLabel(zone: number) {
		if (meter.zones === 1) return m.reading_value();
		return zone === 0 ? m.meter_zone_day() : m.meter_zone_night();
	}
</script>

<div class="grid gap-4 {meter.zones === 2 ? 'sm:grid-cols-2' : 'max-w-xs'}">
	{#each zones as zone (zone)}
		<FormField
			label={zoneLabel(zone)}
			error={errors[`${prefix}_${meter.id}_${zone}`]}
			hint={zone === 0 ? m.reading_digits_hint({ digits: meter.digits }) : undefined}
		>
			{#snippet children(field)}
				<Input
					name="{prefix}_{meter.id}_{zone}"
					inputmode="decimal"
					autocomplete="off"
					maxlength={meter.digits + 4}
					{disabled}
					defaultValue={initial[zone] ?? ''}
					oninput={(event) => onvalue?.(zone, event.currentTarget.value)}
					class="font-medium tracking-wider tabular-nums"
					{...field}
				/>
			{/snippet}
		</FormField>
	{/each}
</div>
