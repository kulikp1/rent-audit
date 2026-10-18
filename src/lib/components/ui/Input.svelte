<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'value'> & {
		invalid?: boolean;
		describedby?: string;
	};

	let { invalid = false, describedby, class: className = '', ...rest }: Props = $props();
</script>

<input
	aria-invalid={invalid || undefined}
	aria-describedby={describedby}
	class="h-10 w-full rounded-control border bg-surface px-3 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted {invalid
		? 'border-danger-600 focus:border-danger-600 focus:ring-danger-600/20'
		: 'border-line-strong focus:border-primary-500 focus:ring-primary-500/20'} {className}"
	{...rest}
/>
