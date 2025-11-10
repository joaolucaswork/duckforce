<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Save, X } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		componentName: string;
		note: string | undefined;
		onSaveNote: (note: string) => void;
	}

	let { open, onOpenChange, componentName, note, onSaveNote }: Props = $props();

	let localNote = $state(note || '');
	let hasChanges = $derived(localNote !== (note || ''));

	// Update local note when the note prop changes
	$effect(() => {
		localNote = note || '';
	});

	function handleSave() {
		onSaveNote(localNote);
		onOpenChange(false);
	}

	function handleCancel() {
		localNote = note || '';
		onOpenChange(false);
	}
</script>

<Sheet.Root {open} onOpenChange={onOpenChange}>
	<Sheet.Content side="right" class="w-full sm:max-w-md flex flex-col p-0 h-full">
		<Sheet.Header class="p-6 pb-4 flex-shrink-0 border-b">
			<Sheet.Title>Nota do Componente</Sheet.Title>
			<Sheet.Description>
				{componentName}
			</Sheet.Description>
		</Sheet.Header>

		<!-- Note Content -->
		<div class="flex-1 p-6 overflow-y-auto">
			<Textarea
				bind:value={localNote}
				placeholder="Adicione uma nota sobre este componente..."
				class="min-h-[200px] resize-none"
			/>
		</div>

		<!-- Footer -->
		<Sheet.Footer class="border-t p-6 pt-4 flex-shrink-0 bg-background">
			<div class="flex gap-2 w-full justify-end">
				<Button variant="outline" onclick={handleCancel}>
					<X class="w-4 h-4 mr-2" />
					Cancelar
				</Button>
				<Button onclick={handleSave} disabled={!hasChanges}>
					<Save class="w-4 h-4 mr-2" />
					Salvar Nota
				</Button>
			</div>
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

