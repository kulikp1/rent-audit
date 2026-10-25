<script lang="ts">
	import { avatarColors, type AvatarColor } from '#lib/avatar-colors.js';

	let {
		name,
		src = '',
		size = 'md',
		color
	}: { name: string; src?: string; size?: 'sm' | 'md' | 'xl'; color?: AvatarColor } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('')
	);

	const sizes = { sm: 'size-8 text-xs', md: 'size-9 text-[13px]', xl: 'size-20 text-3xl' };
</script>

<span
	style={color ? `background-color: ${avatarColors[color]}` : undefined}
	class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold {color
		? 'text-white'
		: 'bg-primary-100 text-primary-ink'} {sizes[size]}"
>
	{#if src}
		<img {src} alt="" class="size-full object-cover" referrerpolicy="no-referrer" />
	{:else}
		{initials}
	{/if}
</span>
