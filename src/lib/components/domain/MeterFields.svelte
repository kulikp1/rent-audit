<script lang="ts">
	import { untrack } from 'svelte';
	import { m } from '#lib/paraglide/messages.js';
	import FormField from '../ui/FormField.svelte';
	import Input from '../ui/Input.svelte';
	import Select from '../ui/Select.svelte';

	type Values = {
		type?: string;
		serial?: string;
		digits?: number;
		zones?: number;
		initialReading?: number[];
	};

	let {
		errors,
		values = {},
		fixedType
	}: { errors: Record<string, string>; values?: Values; fixedType?: string } = $props();

	let type = $state(untrack(() => fixedType ?? values.type ?? 'water'));
	let zones = $state(untrack(() => String(values.zones ?? 1)));

	const typeOptions = $derived([
		{ value: 'water', label: m.meter_water() },
		{ value: 'gas', label: m.meter_gas() },
		{ value: 'electricity', label: m.meter_electricity() }
	]);

	const zoneOptions = $derived([
		{ value: '1', label: m.meter_zones_one() },
		{ value: '2', label: m.meter_zones_two() }
	]);
</script>

<div class="grid gap-4 sm:grid-cols-2">
	{#if fixedType}
		<input type="hidden" name="type" value={fixedType} />
	{:else}
		<FormField label={m.meter_type()} error={errors.type} required>
			{#snippet children(field)}
				<Select name="type" bind:value={type} options={typeOptions} {...field} />
			{/snippet}
		</FormField>
	{/if}

	{#if type === 'electricity'}
		<FormField label={m.meter_zones()} error={errors.zones} required>
			{#snippet children(field)}
				<Select name="zones" bind:value={zones} options={zoneOptions} {...field} />
			{/snippet}
		</FormField>
	{:else}
		<input type="hidden" name="zones" value="1" />
	{/if}
</div>

<div class="grid gap-4 sm:grid-cols-2">
	<FormField label={m.meter_serial()} error={errors.serial} required>
		{#snippet children(field)}
			<Input name="serial" defaultValue={values.serial ?? ''} maxlength={40} {...field} />
		{/snippet}
	</FormField>
	<FormField label={m.meter_digits()} hint={m.meter_digits_hint()} error={errors.digits} required>
		{#snippet children(field)}
			<Input
				name="digits"
				type="number"
				min="3"
				max="10"
				defaultValue={values.digits ?? 5}
				{...field}
			/>
		{/snippet}
	</FormField>
</div>

<div class="grid gap-4 sm:grid-cols-2">
	<FormField
		label={type === 'electricity' && zones === '2' ? m.meter_initial_day() : m.meter_initial()}
		hint={m.meter_initial_hint()}
		error={errors.initial1}
		required
	>
		{#snippet children(field)}
			<Input
				name="initial1"
				defaultValue={values.initialReading?.[0] ?? ''}
				inputmode="decimal"
				{...field}
			/>
		{/snippet}
	</FormField>
	{#if type === 'electricity' && zones === '2'}
		<FormField label={m.meter_initial_night()} error={errors.initial2} required>
			{#snippet children(field)}
				<Input
					name="initial2"
					defaultValue={values.initialReading?.[1] ?? ''}
					inputmode="decimal"
					{...field}
				/>
			{/snippet}
		</FormField>
	{/if}
</div>
