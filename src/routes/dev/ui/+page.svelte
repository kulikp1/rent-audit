<script lang="ts">
	import { Pencil, Trash2, Copy } from '@lucide/svelte';
	import Button from '#lib/components/ui/Button.svelte';
	import Card from '#lib/components/ui/Card.svelte';
	import PageHeader from '#lib/components/ui/PageHeader.svelte';
	import Menu from '#lib/components/overlay/Menu.svelte';
	import Modal from '#lib/components/overlay/Modal.svelte';
	import { dialog } from '#lib/components/overlay/dialog.svelte.js';
	import { toast } from '#lib/components/overlay/toast.svelte.js';

	let modalOpen = $state(false);
	let result = $state('');

	async function askConfirm() {
		result = String(
			await dialog.confirm({ title: 'Зберегти зміни?', description: 'Дані буде оновлено.' })
		);
	}

	async function askDanger() {
		result = String(
			await dialog.confirm({
				title: 'Видалити квартиру?',
				description: 'Цю дію неможливо скасувати.',
				tone: 'danger',
				confirmLabel: 'Видалити квартиру'
			})
		);
	}

	async function askReason() {
		result = String(
			await dialog.confirmWithReason({
				title: 'Анулювати рахунок',
				description: 'Рахунок буде анульовано, новий можна виставити окремо.',
				tone: 'danger',
				confirmLabel: 'Анулювати рахунок',
				reason: { label: 'Причина', required: true }
			})
		);
	}
</script>

<div class="mx-auto max-w-3xl p-8">
	<PageHeader title="UI kit" subtitle="Dev only" />

	<Card class="space-y-6">
		<div class="flex flex-wrap gap-3">
			<Button>Primary</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="danger">Danger</Button>
			<Button variant="ghost">Ghost</Button>
			<Button loading>Loading</Button>
			<Button disabled>Disabled</Button>
		</div>

		<div class="flex flex-wrap gap-3">
			<Button id="open-modal" onclick={() => (modalOpen = true)}>Modal</Button>
			<Button id="open-confirm" variant="secondary" onclick={askConfirm}>Confirm</Button>
			<Button id="open-danger" variant="secondary" onclick={askDanger}>Danger confirm</Button>
			<Button id="open-reason" variant="secondary" onclick={askReason}>Confirm with reason</Button>
			<Button variant="secondary" onclick={() => toast.success('Збережено')}>Toast success</Button>
			<Button variant="secondary" onclick={() => toast.error('Не вдалося зберегти зміни')}
				>Toast error</Button
			>
			<Menu
				label="Дії"
				triggerClass="inline-flex h-10 items-center rounded-control border border-line-strong bg-surface px-4 text-sm font-medium shadow-sm hover:bg-surface-muted"
				items={[
					{ label: 'Редагувати', icon: Pencil, onselect: () => toast.info('Редагувати') },
					{ label: 'Копіювати', icon: Copy, onselect: () => toast.info('Копіювати') },
					{ label: 'Видалити', icon: Trash2, tone: 'danger', onselect: askDanger }
				]}
			>
				{#snippet trigger()}Меню дій{/snippet}
			</Menu>
		</div>

		<p id="result" class="text-sm text-ink-muted">Результат: {result}</p>
	</Card>
</div>

<Modal
	bind:open={modalOpen}
	title="Інформаційна модалка"
	description="Закривається по Esc, ✕ і кліку поза нею."
>
	<p class="text-sm text-ink-soft">Вміст модалки.</p>
	{#snippet footer()}
		<Button variant="secondary" onclick={() => (modalOpen = false)}>Закрити</Button>
	{/snippet}
</Modal>
