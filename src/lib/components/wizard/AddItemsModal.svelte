<script lang="ts">
	import type { SalesforceComponent, ComponentType } from '$lib/types/salesforce';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Plus } from '@lucide/svelte';

	interface Props {
		open: boolean;
		onOpenChange: (open: boolean) => void;
		availableComponents: SalesforceComponent[];
		alreadyInKanban: Set<string>;
		onAddComponents: (componentIds: string[]) => void;
	}

	let { open, onOpenChange, availableComponents, alreadyInKanban, onAddComponents }: Props = $props();

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all'>('all');
	let selectedComponentIds = $state<Set<string>>(new Set());
	let showSystemComponents = $state(false);

	const componentTypes: Array<{ value: ComponentType | 'all'; label: string }> = [
		{ value: 'all', label: 'All Types' },
		{ value: 'lwc', label: 'Lightning Web Components' },
		{ value: 'apex', label: 'Apex Classes' },
		{ value: 'trigger', label: 'Apex Triggers' },
		{ value: 'object', label: 'Custom Objects' },
		{ value: 'field', label: 'Custom Fields' },
		{ value: 'flow', label: 'Flows' },
		{ value: 'visualforce', label: 'Visualforce Pages' }
	];

	const filteredComponents = $derived(() => {
		let filtered = availableComponents.filter(c => !alreadyInKanban.has(c.id));

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				c =>
					c.name.toLowerCase().includes(query) ||
					c.apiName.toLowerCase().includes(query) ||
					c.description?.toLowerCase().includes(query)
			);
		}

		// Apply type filter
		if (selectedTab !== 'all') {
			filtered = filtered.filter(c => c.type === selectedTab);
		}

		// Apply system/custom filter
		if (!showSystemComponents) {
			filtered = filtered.filter(c => !c.apiName.startsWith('System.') && !c.metadata?.isStandard);
		}

		return filtered;
	});

	function toggleComponent(componentId: string) {
		const newSet = new Set(selectedComponentIds);
		if (newSet.has(componentId)) {
			newSet.delete(componentId);
		} else {
			newSet.add(componentId);
		}
		selectedComponentIds = newSet;
	}

	function handleAddSelected() {
		onAddComponents(Array.from(selectedComponentIds));
		selectedComponentIds = new Set();
		onOpenChange(false);
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
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
	<Dialog.Content class="max-w-3xl max-h-[80vh] flex flex-col">
		<Dialog.Header>
			<Dialog.Title>Adicionar Itens</Dialog.Title>
			<Dialog.Description>
				Selecione os componentes para adicionar ao quadro Kanban
			</Dialog.Description>
		</Dialog.Header>

		<!-- Filter Bar -->
		<div class="flex gap-3 py-4 border-b">
			<Select.Root
				type="single"
				bind:value={selectedTab}
			>
				<Select.Trigger class="w-[200px]">
					{componentTypes.find(t => t.value === selectedTab)?.label || 'All Types'}
				</Select.Trigger>
				<Select.Content>
					{#each componentTypes as type}
						<Select.Item value={type.value}>{type.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Search components..."
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<div class="flex items-center gap-2">
				<Checkbox
					id="show-system"
					checked={showSystemComponents}
					onCheckedChange={(checked) => { showSystemComponents = !!checked; }}
				/>
				<label for="show-system" class="text-sm cursor-pointer">
					Show System
				</label>
			</div>
		</div>

		<!-- Component List -->
		<div class="flex-1 overflow-y-auto py-4 space-y-2">
			{#each filteredComponents() as component (component.id)}
				<div
					role="button"
					tabindex="0"
					aria-label="Toggle {component.name}"
					class="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
					onclick={() => toggleComponent(component.id)}
					onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleComponent(component.id); } }}
				>
					<Checkbox
						checked={selectedComponentIds.has(component.id)}
						onCheckedChange={() => toggleComponent(component.id)}
					/>
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2 mb-1">
							<Badge
								class={typeColors[component.type] || 'bg-gray-500/10 text-gray-700 dark:text-gray-400'}
								variant="secondary"
							>
								{component.type}
							</Badge>
							<span class="font-medium truncate">{component.name}</span>
						</div>
						<p class="text-sm text-muted-foreground truncate">{component.apiName}</p>
					</div>
				</div>
			{:else}
				<div class="text-center text-muted-foreground py-8">
					Nenhum componente disponível
				</div>
			{/each}
		</div>

		<!-- Footer -->
		<Dialog.Footer class="border-t pt-4">
			<div class="flex items-center justify-between w-full">
				<span class="text-sm text-muted-foreground">
					{selectedComponentIds.size} selecionado{selectedComponentIds.size !== 1 ? 's' : ''}
				</span>
				<div class="flex gap-2">
					<Button variant="outline" onclick={() => onOpenChange(false)}>
						Cancelar
					</Button>
					<Button
						onclick={handleAddSelected}
						disabled={selectedComponentIds.size === 0}
					>
						<Plus class="w-4 h-4 mr-2" />
						Adicionar Selecionados
					</Button>
				</div>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

