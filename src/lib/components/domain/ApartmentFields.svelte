<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import FormField from '../ui/FormField.svelte';
	import Input from '../ui/Input.svelte';

	type Values = {
		name?: string;
		address?: string;
		rentAmount?: string | number;
		residents?: number;
	};

	let {
		errors,
		values = {},
		showRent = true
	}: { errors: Record<string, string>; values?: Values; showRent?: boolean } = $props();
</script>

<FormField label={m.apt_name()} error={errors.name} required>
	{#snippet children(field)}
		<Input
			name="name"
			defaultValue={values.name ?? ''}
			maxlength={80}
			{...field}
			placeholder={m.apt_name_placeholder()}
		/>
	{/snippet}
</FormField>

<FormField label={m.apt_address()} error={errors.address}>
	{#snippet children(field)}
		<Input
			name="address"
			defaultValue={values.address ?? ''}
			maxlength={200}
			{...field}
			placeholder={m.apt_address_placeholder()}
		/>
	{/snippet}
</FormField>

<div class="grid gap-4 sm:grid-cols-2">
	{#if showRent}
		<FormField label={m.apt_rent()} hint={m.apt_rent_hint()} error={errors.rentAmount} required>
			{#snippet children(field)}
				<Input
					name="rentAmount"
					defaultValue={values.rentAmount ?? ''}
					inputmode="decimal"
					{...field}
					placeholder="0"
				/>
			{/snippet}
		</FormField>
	{/if}
	<FormField label={m.apt_residents()} hint={m.apt_residents_hint()} error={errors.residents}>
		{#snippet children(field)}
			<Input
				name="residents"
				type="number"
				min="1"
				max="20"
				defaultValue={values.residents ?? 1}
				{...field}
			/>
		{/snippet}
	</FormField>
</div>
