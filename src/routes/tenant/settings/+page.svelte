<script lang="ts">
	import { enhance } from '$app/forms';
	import { fitViewport } from '#lib/utils/fit.js';
	import type { AvatarColor } from '#lib/avatar-colors.js';
	import { m } from '#lib/paraglide/messages.js';
	import AppearanceCard from '#lib/components/domain/AppearanceCard.svelte';
	import ProfileCard from '#lib/components/domain/ProfileCard.svelte';
	import { toast } from '#lib/components/overlay/toast.svelte.js';
	import Button from '#lib/components/ui/Button.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let saving = $state(false);
	let color = $derived<AvatarColor>(data.avatarColor as AvatarColor);
</script>

<svelte:head><title>{m.nav_settings()} · {m.app_name()}</title></svelte:head>

<PageHeader title={m.nav_settings()} subtitle={m.settings_tenant_subtitle()} />

<form
	method="POST"
	class="-mx-1 max-w-3xl space-y-4 overflow-y-auto px-1 pb-1"
	use:fitViewport
	use:enhance={() => {
		saving = true;
		return async ({ result, update }) => {
			saving = false;
			if (result.type === 'success') toast.success(m.common_saved());
			await update({ reset: false });
		};
	}}
>
	<ProfileCard
		name={data.name}
		picture={data.picture}
		roleLabel={m.role_tenant()}
		uploadEnabled={data.avatarUploadEnabled}
		bind:color
	/>
	<AppearanceCard preference={data.themePreference} />
	<div class="flex justify-end">
		<Button type="submit" loading={saving}>{m.common_save()}</Button>
	</div>
</form>
