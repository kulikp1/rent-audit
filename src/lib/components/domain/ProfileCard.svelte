<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { Camera, LoaderCircle } from '@lucide/svelte';
	import { avatarColorKeys, avatarColors, type AvatarColor } from '#lib/avatar-colors.js';
	import { m } from '#lib/paraglide/messages.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import { resizeImage, uploadToCloudinary } from '#lib/utils/image.js';
	import Avatar from '../ui/Avatar.svelte';
	import Badge from '../ui/Badge.svelte';
	import Card from '../ui/Card.svelte';

	type Props = {
		name: string;
		picture: string;
		roleLabel: string;
		uploadEnabled: boolean;
		color: AvatarColor;
	};

	let { name, picture, roleLabel, uploadEnabled, color = $bindable() }: Props = $props();

	let uploadingAvatar = $state(false);
	let avatarInput = $state<HTMLInputElement>();

	async function changeAvatar(event: Event & { currentTarget: HTMLInputElement }) {
		const file = event.currentTarget.files?.[0];
		event.currentTarget.value = '';
		if (!file) return;
		uploadingAvatar = true;
		try {
			const blob = await resizeImage(file, 512);
			const publicId = await uploadToCloudinary(blob, '/api/avatar/sign', 'avatar.jpg');
			const response = await fetch('/api/avatar', {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ publicId })
			});
			if (!response.ok) throw new Error('save_failed');
			await invalidateAll();
			toast.success(m.settings_avatar_updated());
		} catch {
			toast.error(m.settings_avatar_error());
		} finally {
			uploadingAvatar = false;
		}
	}
</script>

<Card>
	<div class="flex flex-wrap items-center gap-6">
		<span class="relative">
			<span
				class="block rounded-full p-1 ring-2 transition-colors"
				style="--tw-ring-color: {avatarColors[color]}"
			>
				<Avatar {name} src={picture} {color} size="xl" />
			</span>
			{#if uploadEnabled}
				<input
					bind:this={avatarInput}
					type="file"
					accept="image/*"
					class="sr-only"
					tabindex="-1"
					onchange={changeAvatar}
				/>
				<button
					type="button"
					aria-label={m.settings_avatar_change()}
					title={m.settings_avatar_change()}
					disabled={uploadingAvatar}
					onclick={() => avatarInput?.click()}
					class="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border-2 border-surface bg-primary-500 text-white transition-colors hover:bg-primary-400 disabled:cursor-wait"
				>
					{#if uploadingAvatar}
						<LoaderCircle class="size-4 animate-spin" />
					{:else}
						<Camera class="size-4" />
					{/if}
				</button>
			{/if}
		</span>
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2">
				<h2 class="text-lg font-semibold tracking-tight text-ink">{name}</h2>
				<Badge tone="info">{roleLabel}</Badge>
			</div>
			<p class="mt-1 text-[13px] text-ink-muted">{m.settings_profile_hint()}</p>
			<fieldset class="mt-4">
				<legend class="sr-only">{m.settings_avatar_color()}</legend>
				<div class="flex items-center gap-2.5">
					{#each avatarColorKeys as key (key)}
						<label class="relative cursor-pointer">
							<input
								type="radio"
								name="avatarColor"
								value={key}
								checked={color === key}
								onchange={() => (color = key)}
								class="peer sr-only"
							/>
							<span
								class="block size-8 rounded-full ring-offset-2 ring-offset-surface transition-shadow peer-checked:ring-2 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500"
								style="background-color: {avatarColors[key]}; --tw-ring-color: {avatarColors[key]}"
							></span>
							<span class="sr-only">{key}</span>
						</label>
					{/each}
				</div>
			</fieldset>
		</div>
	</div>
</Card>
