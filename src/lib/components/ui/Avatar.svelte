<script lang="ts">
	let {
		name,
		src = '',
		size = 'md'
	}: { name: string; src?: string; size?: 'sm' | 'md' } = $props();

	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0]!.toUpperCase())
			.join('')
	);
</script>

<span
	class="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-100 font-semibold text-primary-ink {size ===
	'sm'
		? 'size-8 text-xs'
		: 'size-9 text-[13px]'}"
>
	{#if src}
		<img {src} alt="" class="size-full object-cover" referrerpolicy="no-referrer" />
	{:else}
		{initials}
	{/if}
</span>
