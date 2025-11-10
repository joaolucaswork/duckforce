<script lang="ts">
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { GripVertical, MessageSquare, Save, X } from '@lucide/svelte';

	interface Props {
		component: SalesforceComponent;
		note: string | undefined;
		isDragging: boolean;
		onUpdateNote: (note: string) => void;
	}

	let { component, note, isDragging, onUpdateNote }: Props = $props();

	let isEditingNote = $state(false);
	let showNoteSection = $state(false);
	let localNote = $state(note || '');

	function handleSaveNote() {
		onUpdateNote(localNote);
		isEditingNote = false;
	}

	function handleCancelEdit() {
		localNote = note || '';
		isEditingNote = false;
	}

	function toggleNoteSection() {
		showNoteSection = !showNoteSection;
		if (showNoteSection && !isEditingNote && !note) {
			isEditingNote = true;
		}
	}

	const typeColors: Record<string, string> = {
		ApexClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
		ApexTrigger: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
		LightningComponentBundle: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
		CustomObject: 'bg-green-500/10 text-green-700 dark:text-green-400',
		CustomField: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
		Flow: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
		VisualforcePage: 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
	};

	const typeColor = typeColors[component.type] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
</script>

<Card.Root class="transition-all {isDragging ? 'opacity-50 cursor-grabbing' : 'cursor-grab hover:shadow-md'}">
	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				<Badge class={typeColor} variant="secondary">
					{component.type}
				</Badge>
				<h4 class="font-medium mt-2 truncate" title={component.name}>
					{component.name}
				</h4>
			</div>
			<GripVertical class="w-5 h-5 text-muted-foreground flex-shrink-0" />
		</div>
	</Card.Header>
	<Card.Content class="pb-3">
		<p class="text-sm text-muted-foreground truncate" title={component.apiName}>
			{component.apiName}
		</p>
		{#if component.description}
			<p class="text-xs text-muted-foreground mt-2 line-clamp-2">
				{component.description}
			</p>
		{/if}
	</Card.Content>
	<Card.Footer class="pt-3 border-t flex-col items-stretch gap-2">
		<Button
			variant="ghost"
			size="sm"
			class="w-full justify-start"
			onclick={toggleNoteSection}
		>
			<MessageSquare class="w-4 h-4 mr-2" />
			{note ? 'Ver Nota' : 'Adicionar Nota'}
			{#if note}
				<Badge variant="secondary" class="ml-auto">1</Badge>
			{/if}
		</Button>

		{#if showNoteSection}
			<div class="mt-2 space-y-2">
				{#if isEditingNote}
					<Textarea
						bind:value={localNote}
						placeholder="Adicione uma nota..."
						class="min-h-[80px] text-sm"
					/>
					<div class="flex gap-2">
						<Button size="sm" onclick={handleSaveNote}>
							<Save class="w-3 h-3 mr-1" />
							Salvar
						</Button>
						<Button size="sm" variant="ghost" onclick={handleCancelEdit}>
							<X class="w-3 h-3 mr-1" />
							Cancelar
						</Button>
					</div>
				{:else if note}
					<div class="text-sm p-2 bg-muted rounded-md">
						{note}
					</div>
					<Button size="sm" variant="outline" onclick={() => { isEditingNote = true; }}>
						Editar Nota
					</Button>
				{/if}
			</div>
		{/if}
	</Card.Footer>
</Card.Root>

