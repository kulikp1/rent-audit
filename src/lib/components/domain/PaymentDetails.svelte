<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import CopyField from '../ui/CopyField.svelte';

	type Props = {
		payout: { iban: string; fullName: string; taxId: string };
		purpose: string;
	};

	let { payout, purpose }: Props = $props();
</script>

<div class="space-y-3">
	<div>
		<p class="mb-1 text-[13px] text-ink-muted">IBAN</p>
		<CopyField value={payout.iban} label="IBAN" />
	</div>
	<div>
		<p class="mb-1 text-[13px] text-ink-muted">{m.settings_full_name()}</p>
		<CopyField value={payout.fullName} label={m.settings_full_name()} />
	</div>
	{#if payout.taxId}
		<div>
			<p class="mb-1 text-[13px] text-ink-muted">{m.settings_tax_id()}</p>
			<CopyField value={payout.taxId} label={m.settings_tax_id()} />
		</div>
	{/if}
	<div>
		<p class="mb-1 text-[13px] text-ink-muted">{m.invoice_purpose()}</p>
		<CopyField value={purpose} label={m.invoice_purpose()} />
	</div>
</div>
