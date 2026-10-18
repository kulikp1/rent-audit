<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import FormField from '../ui/FormField.svelte';
	import Input from '../ui/Input.svelte';
	import Select from '../ui/Select.svelte';

	type Props = {
		services: ('electricity' | 'gas' | 'water')[];
		errors: Record<string, string>;
	};

	let { services, errors }: Props = $props();

	let service = $state<string>('');
	$effect(() => {
		if (!service) service = services[0] ?? '';
	});

	const today = new Date();
	const todayValue = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

	const labels = $derived({
		electricity: m.meter_electricity(),
		gas: m.meter_gas(),
		water: m.meter_water()
	});
	const options = $derived(services.map((value) => ({ value, label: labels[value] })));
	const unit = $derived(service === 'electricity' ? m.unit_kwh() : m.unit_m3());
</script>

{#if services.length > 1}
	<FormField label={m.tariff_service()} error={errors.service} required>
		{#snippet children(field)}
			<Select name="service" bind:value={service} {options} {...field} />
		{/snippet}
	</FormField>
{:else}
	<input type="hidden" name="service" value={services[0]} />
{/if}

<div class="grid gap-4 sm:grid-cols-2">
	<FormField
		label={service === 'electricity' ? m.tariff_price_day() : m.tariff_price()}
		hint={m.tariff_price_hint({ unit })}
		error={errors.price}
		required
	>
		{#snippet children(field)}
			<Input name="price" inputmode="decimal" {...field} />
		{/snippet}
	</FormField>
	{#if service === 'electricity'}
		<FormField
			label={m.tariff_price_night()}
			hint={m.tariff_night_hint()}
			error={errors.nightPrice}
		>
			{#snippet children(field)}
				<Input name="nightPrice" inputmode="decimal" {...field} />
			{/snippet}
		</FormField>
	{/if}
</div>

<FormField
	label={m.tariff_effective_from()}
	hint={m.tariff_effective_hint()}
	error={errors.effectiveFrom}
	required
>
	{#snippet children(field)}
		<Input name="effectiveFrom" type="date" defaultValue={todayValue} {...field} />
	{/snippet}
</FormField>
