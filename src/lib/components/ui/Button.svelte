<script lang="ts">
	import { pathTo } from '#lib/utils/path.js';
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type Size = 'sm' | 'md' | 'lg';

	type Props = Omit<HTMLButtonAttributes, 'children'> & {
		variant?: Variant;
		size?: Size;
		loading?: boolean;
		fullWidth?: boolean;
		href?: HTMLAnchorAttributes['href'];
		icon?: Snippet;
		children?: Snippet;
	};

	let {
		variant = 'primary',
		size = 'md',
		loading = false,
		fullWidth = false,
		href,
		icon,
		children,
		class: className = '',
		disabled,
		type = 'button',
		...rest
	}: Props = $props();

	const variants: Record<Variant, string> = {
		primary:
			'bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 disabled:bg-primary-300',
		secondary:
			'bg-surface text-ink border border-line-strong shadow-sm hover:bg-surface-muted active:bg-line disabled:text-ink-faint',
		danger:
			'bg-danger-600 text-white shadow-sm hover:bg-danger-700 active:bg-danger-700 disabled:bg-danger-600/40',
		ghost: 'text-ink-soft hover:bg-surface-muted active:bg-line disabled:text-ink-faint'
	};

	const sizes: Record<Size, string> = {
		sm: 'h-8 px-3 text-[13px] gap-1.5',
		md: 'h-10 px-4 text-sm gap-2',
		lg: 'h-12 px-5 text-[15px] gap-2.5'
	};

	const classes = $derived(
		[
			'inline-flex select-none items-center justify-center rounded-control font-medium whitespace-nowrap transition-colors',
			'disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
			variants[variant],
			sizes[size],
			fullWidth && 'w-full',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

{#if href && !disabled && !loading}
	<a href={pathTo(href)} class={classes} {...rest as HTMLAnchorAttributes}>
		{#if icon}{@render icon()}{/if}
		{@render children?.()}
	</a>
{:else}
	<button
		{type}
		class={classes}
		disabled={disabled || loading}
		aria-busy={loading || undefined}
		{...rest}
	>
		{#if loading}
			<svg class="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
				<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="3" opacity="0.25" />
				<path
					d="M21 12a9 9 0 0 0-9-9"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
				/>
			</svg>
		{:else if icon}
			{@render icon()}
		{/if}
		{@render children?.()}
	</button>
{/if}
