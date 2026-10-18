<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	type Props = Omit<HTMLTextareaAttributes, 'value'> & {
		invalid?: boolean;
		describedby?: string;
	};

	let { invalid = false, describedby, class: className = '', rows = 3, ...rest }: Props = $props();
</script>

<textarea
	{rows}
	aria-invalid={invalid || undefined}
	aria-describedby={describedby}
	class="w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink shadow-sm transition-colors placeholder:text-ink-faint focus:ring-2 focus:outline-none disabled:bg-surface-muted {invalid
		? 'border-danger-600 focus:border-danger-600 focus:ring-danger-600/20'
		: 'border-line-strong focus:border-primary-500 focus:ring-primary-500/20'} {className}"
	{...rest}></textarea>
