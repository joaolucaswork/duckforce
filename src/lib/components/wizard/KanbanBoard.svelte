<script lang="ts">
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import type { KanbanState } from '$lib/types/wizard';
	import KanbanCard from './KanbanCard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Plus } from '@lucide/svelte';

	interface Props {
		components: SalesforceComponent[];
		kanbanState: KanbanState;
		onMoveComponent: (componentId: string, fromColumn: string, toColumn: string) => void;
		onUpdateNote: (componentId: string, note: string) => void;
		onAddItems: () => void;
	}

	let { components, kanbanState, onMoveComponent, onUpdateNote, onAddItems }: Props = $props();

	let draggedComponentId = $state<string | null>(null);
	let draggedFromColumn = $state<string | null>(null);
	let dragOverColumn = $state<string | null>(null);

	const columnTitles = {
		'nao-iniciado': 'Não Iniciado',
		'em-andamento': 'Em Andamento',
		'concluido': 'Concluído'
	};

	function handleDragStart(componentId: string, columnId: string) {
		draggedComponentId = componentId;
		draggedFromColumn = columnId;
	}

	function handleDragEnd() {
		draggedComponentId = null;
		draggedFromColumn = null;
		dragOverColumn = null;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
	}

	function handleDragEnter(columnId: string) {
		dragOverColumn = columnId;
	}

	function handleDragLeave() {
		dragOverColumn = null;
	}

	function handleDrop(event: DragEvent, toColumnId: string) {
		event.preventDefault();
		if (draggedComponentId && draggedFromColumn && draggedFromColumn !== toColumnId) {
			onMoveComponent(draggedComponentId, draggedFromColumn, toColumnId);
		}
		handleDragEnd();
	}

	function getComponentById(id: string): SalesforceComponent | undefined {
		return components.find(c => c.id === id);
	}

	function getComponentNote(id: string): string | undefined {
		return kanbanState.componentNotes.get(id);
	}
</script>

<div class="grid grid-cols-3 gap-4 h-full overflow-hidden">
	{#each kanbanState.columns as column (column.columnId)}
		<div
			role="region"
			aria-label="{columnTitles[column.columnId as keyof typeof columnTitles]} column"
			class="flex flex-col bg-muted/30 rounded-lg border-2 transition-colors min-h-0 {dragOverColumn ===
			column.columnId
				? 'border-primary bg-primary/5'
				: 'border-border'}"
			ondragover={handleDragOver}
			ondragenter={() => handleDragEnter(column.columnId)}
			ondragleave={handleDragLeave}
			ondrop={(e) => handleDrop(e, column.columnId)}
		>
			<!-- Column Header -->
			<div class="p-4 border-b border-border flex-shrink-0">
				<div class="flex items-center justify-between">
					<h3 class="font-semibold text-lg">
						{columnTitles[column.columnId as keyof typeof columnTitles]}
					</h3>
					<span
						class="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full"
					>
						{column.componentIds.length}
					</span>
				</div>
				{#if column.columnId === 'nao-iniciado'}
					<Button
						variant="outline"
						size="sm"
						class="mt-3 w-full"
						onclick={onAddItems}
					>
						<Plus class="w-4 h-4 mr-2" />
						Adicionar Itens
					</Button>
				{/if}
			</div>

			<!-- Column Content -->
			<div class="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-white p-4 space-y-3 min-h-0">
				{#each column.componentIds as componentId (componentId)}
					{@const component = getComponentById(componentId)}
					{#if component}
						<div
							role="button"
							tabindex="0"
							aria-label="Drag {component.name}"
							draggable="true"
							ondragstart={() => handleDragStart(componentId, column.columnId)}
							ondragend={handleDragEnd}
						>
							<KanbanCard
								{component}
								note={getComponentNote(componentId)}
								isDragging={draggedComponentId === componentId}
								onUpdateNote={(note) => onUpdateNote(componentId, note)}
							/>
						</div>
					{/if}
				{/each}
				{#if column.componentIds.length === 0}
					<div class="text-center text-muted-foreground text-sm py-8">
						Nenhum item
					</div>
				{/if}
			</div>
		</div>
	{/each}
</div>

