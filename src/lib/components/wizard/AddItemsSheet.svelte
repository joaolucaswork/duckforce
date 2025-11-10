<script lang="ts">
	import type { SalesforceComponent, ComponentType } from '$lib/types/salesforce';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Select from '$lib/components/ui/select';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Search, Plus, Ellipsis } from '@lucide/svelte';

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

	// Capitalize first letter of a string
	function capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	// Determine if a component is custom (user-created) or system (standard Salesforce)
	function isCustomComponent(component: SalesforceComponent): boolean {
		// Components with a namespace that is not null are from managed packages (not custom)
		if (component.namespace) {
			return false;
		}

		// For different component types, check specific indicators
		switch (component.type) {
			case 'object':
				// Custom objects end with __c
				return component.apiName.endsWith('__c');

			case 'field':
				// Custom fields end with __c
				return component.apiName.includes('__c');

			case 'lwc':
			case 'apex':
			case 'trigger':
			case 'visualforce':
			case 'flow':
				// These are always custom if they have no namespace
				// (system components of these types would have a namespace)
				return true;

			default:
				return true;
		}
	}

	// Memoize component counts
	const componentCounts = $derived.by(() => {
		// Filter components based on custom/system setting and not already in kanban
		let componentsToCount = availableComponents.filter(c => !alreadyInKanban.has(c.id));

		if (!showSystemComponents) {
			componentsToCount = componentsToCount.filter(c => isCustomComponent(c));
		}

		const counts: Record<ComponentType | 'all', number> = {
			all: componentsToCount.length,
			lwc: 0,
			apex: 0,
			object: 0,
			field: 0,
			trigger: 0,
			visualforce: 0,
			flow: 0
		};

		componentsToCount.forEach(c => {
			counts[c.type]++;
		});

		return counts;
	});

	const filteredComponents = $derived.by(() => {
		let filtered = availableComponents.filter(c => !alreadyInKanban.has(c.id));

		// Filter by custom/system components
		if (!showSystemComponents) {
			filtered = filtered.filter(c => isCustomComponent(c));
		}

		// Filter by type
		if (selectedTab !== 'all') {
			filtered = filtered.filter(c => c.type === selectedTab);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				c =>
					c.name.toLowerCase().includes(query) ||
					c.apiName.toLowerCase().includes(query) ||
					c.description?.toLowerCase().includes(query)
			);
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

	// Calculate checkbox state for select all
	const allSelected = $derived(() => {
		return filteredComponents.length > 0 && filteredComponents.every(c => selectedComponentIds.has(c.id));
	});

	const someSelected = $derived(() => {
		const count = filteredComponents.filter(c => selectedComponentIds.has(c.id)).length;
		return count > 0 && count < filteredComponents.length;
	});

	// Handle select all checkbox toggle
	function handleSelectAllToggle() {
		if (allSelected()) {
			// Deselect all
			filteredComponents.forEach(component => {
				if (selectedComponentIds.has(component.id)) {
					toggleComponent(component.id);
				}
			});
		} else {
			// Select all
			filteredComponents.forEach(component => {
				if (!selectedComponentIds.has(component.id)) {
					toggleComponent(component.id);
				}
			});
		}
	}
</script>

<Sheet.Root {open} onOpenChange={onOpenChange}>
	<Sheet.Content side="right" class="w-full sm:max-w-2xl flex flex-col p-0 h-full">
		<Sheet.Header class="p-6 pb-4 flex-shrink-0">
			<Sheet.Title>Adicionar Itens</Sheet.Title>
			<Sheet.Description>
				Selecione os componentes para adicionar ao quadro Kanban
			</Sheet.Description>
		</Sheet.Header>

		<!-- Filter and Search Row -->
		<div class="px-6 space-y-3 border-b pb-4 flex-shrink-0">
			<div class="flex items-center gap-2">
				<!-- Component Type Filter -->
				<Select.Root
					type="single"
					bind:value={selectedTab}
				>
					<Select.Trigger class="w-[180px] h-9">
						{#if selectedTab === 'all'}
							All ({componentCounts.all})
						{:else if selectedTab === 'lwc'}
							LWC ({componentCounts.lwc})
						{:else if selectedTab === 'apex'}
							Apex ({componentCounts.apex})
						{:else if selectedTab === 'object'}
							Object ({componentCounts.object})
						{:else if selectedTab === 'trigger'}
							Trigger ({componentCounts.trigger})
						{:else if selectedTab === 'visualforce'}
							Visualforce ({componentCounts.visualforce})
						{:else if selectedTab === 'flow'}
							Flow ({componentCounts.flow})
						{:else if selectedTab === 'field'}
							Field ({componentCounts.field})
						{/if}
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">
							All ({componentCounts.all})
						</Select.Item>
						<Select.Item value="lwc">
							LWC ({componentCounts.lwc})
						</Select.Item>
						<Select.Item value="apex">
							Apex ({componentCounts.apex})
						</Select.Item>
						<Select.Item value="object">
							Object ({componentCounts.object})
						</Select.Item>
						<Select.Item value="field">
							Field ({componentCounts.field})
						</Select.Item>
						<Select.Item value="trigger">
							Trigger ({componentCounts.trigger})
						</Select.Item>
						<Select.Item value="visualforce">
							Visualforce ({componentCounts.visualforce})
						</Select.Item>
						<Select.Item value="flow">
							Flow ({componentCounts.flow})
						</Select.Item>
					</Select.Content>
				</Select.Root>

				<!-- Search -->
				<div class="relative flex-1">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						bind:value={searchQuery}
						placeholder="Search components..."
						class="pl-9 h-9"
					/>
				</div>

				<!-- Options Menu -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="sm" class="h-9 w-9 p-0">
								<Ellipsis class="h-4 w-4" />
								<span class="sr-only">Component options</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.CheckboxItem bind:checked={showSystemComponents}>
							Show System Components
						</DropdownMenu.CheckboxItem>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		<!-- Select All Checkbox and Selection Count -->
		<div class="px-6 pt-4 pb-2 flex-shrink-0">
			<button
				onclick={handleSelectAllToggle}
				class="flex items-start gap-2 p-2.5 cursor-pointer"
				type="button"
				aria-label="Select all components"
			>
				<Checkbox
					checked={allSelected()}
					indeterminate={someSelected()}
					class="mt-0.5"
				/>
				<span class="text-xs text-muted-foreground mt-0.5">
					{filteredComponents.filter(c => selectedComponentIds.has(c.id)).length} of {filteredComponents.length} selected
				</span>
			</button>
		</div>

		<!-- Component List with Virtual Scrolling -->
		<div class="flex-1 min-h-0 overflow-hidden">
			{#if filteredComponents.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					<p class="text-sm">No components found</p>
				</div>
			{:else}
				<div class="h-full overflow-y-auto scrollbar-white">
					{#each filteredComponents as component (component.id)}
						<div class="group w-full flex items-start gap-2 p-2.5 px-6 border-b transition-colors {selectedComponentIds.has(component.id) ? 'bg-accent/30' : ''}">
							<button
								onclick={() => toggleComponent(component.id)}
								class="flex-shrink-0 mt-0.5"
								type="button"
								aria-label="Select component"
							>
								<Checkbox
									checked={selectedComponentIds.has(component.id)}
								/>
							</button>

							<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
								<button
									onclick={() => toggleComponent(component.id)}
									class="flex-1 min-w-0 text-left"
									type="button"
								>
									<p class="font-medium text-sm truncate">{component.name}</p>
									{#if component.description}
										<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
									{/if}
								</button>
								<div class="flex items-center gap-1.5 flex-shrink-0">
									<Badge variant="outline" class="text-xs font-mono">
										{capitalizeFirst(component.type)}
									</Badge>
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Footer -->
		<Sheet.Footer class="border-t p-6 pt-4 flex-shrink-0 bg-background">
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
		</Sheet.Footer>
	</Sheet.Content>
</Sheet.Root>

