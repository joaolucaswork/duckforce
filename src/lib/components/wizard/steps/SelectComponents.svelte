<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { mockComponents } from '$lib/data/mock-data';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import { Search, LoaderCircle, Info } from '@lucide/svelte';
	import type { ComponentType } from '$lib/types/salesforce';
	import { onMount } from 'svelte';

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all'>('all');

	const isLoading = $derived(wizardStore.state.componentSelection.isLoading);
	const availableComponents = $derived(wizardStore.state.componentSelection.availableComponents);
	const selectedIds = $derived(wizardStore.state.componentSelection.selectedIds);

	// Filter components based on search and tab
	const filteredComponents = $derived(() => {
		let components = availableComponents;

		// Filter by type
		if (selectedTab !== 'all') {
			components = components.filter(c => c.type === selectedTab);
		}

		// Filter by search query
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			components = components.filter(
				c =>
					c.name.toLowerCase().includes(query) ||
					c.apiName.toLowerCase().includes(query) ||
					c.description?.toLowerCase().includes(query)
			);
		}

		return components;
	});

	const componentCounts = $derived(() => {
		const counts: Record<ComponentType | 'all', number> = {
			all: availableComponents.length,
			lwc: 0,
			apex: 0,
			object: 0,
			field: 0,
			trigger: 0,
			visualforce: 0,
			flow: 0
		};

		availableComponents.forEach(c => {
			counts[c.type]++;
		});

		return counts;
	});

	const selectedCount = $derived(selectedIds.size);

	onMount(() => {
		// Load components from source org (mock data for now)
		wizardStore.setComponentsLoading(true);
		
		// Simulate API call
		setTimeout(() => {
			// Reset migration status for wizard flow
			const components = mockComponents.map(c => ({
				...c,
				migrationStatus: 'pending' as const,
				migrationDate: undefined
			}));
			wizardStore.setAvailableComponents(components);
		}, 1000);
	});

	function handleToggleComponent(componentId: string) {
		wizardStore.toggleComponentSelection(componentId);
	}

	function handleSelectAll() {
		wizardStore.selectAllComponents();
	}

	function handleDeselectAll() {
		wizardStore.deselectAllComponents();
	}

	function isSelected(componentId: string): boolean {
		return selectedIds.has(componentId);
	}
</script>

<div class="space-y-6">
	<!-- Info Alert -->
	<Alert.Root>
		<Info class="h-4 w-4" />
		<Alert.Title>Select Components to Migrate</Alert.Title>
		<Alert.Description>
			Choose the components you want to migrate from your source org. Dependencies will be
			automatically discovered in the next step.
		</Alert.Description>
	</Alert.Root>

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center space-y-4">
				<LoaderCircle class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Loading components from source org...</p>
			</div>
		</div>
	{:else}
		<!-- Search and Actions -->
		<div class="flex items-center gap-4">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					bind:value={searchQuery}
					placeholder="Search components..."
					class="pl-9"
				/>
			</div>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={handleSelectAll}>
					Select All
				</Button>
				<Button variant="outline" size="sm" onclick={handleDeselectAll}>
					Deselect All
				</Button>
			</div>
		</div>

		<!-- Selection Summary -->
		<div class="flex items-center justify-between p-3 bg-muted rounded-lg">
			<p class="text-sm font-medium">
				{selectedCount} component{selectedCount !== 1 ? 's' : ''} selected
			</p>
		</div>

		<!-- Component Tabs -->
		<Tabs.Root bind:value={selectedTab}>
			<Tabs.List class="grid w-full grid-cols-6">
				<Tabs.Trigger value="all">
					All ({componentCounts().all})
				</Tabs.Trigger>
				<Tabs.Trigger value="lwc">
					LWC ({componentCounts().lwc})
				</Tabs.Trigger>
				<Tabs.Trigger value="apex">
					Apex ({componentCounts().apex})
				</Tabs.Trigger>
				<Tabs.Trigger value="object">
					Objects ({componentCounts().object})
				</Tabs.Trigger>
				<Tabs.Trigger value="field">
					Fields ({componentCounts().field})
				</Tabs.Trigger>
				<Tabs.Trigger value="trigger">
					Triggers ({componentCounts().trigger})
				</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value={selectedTab} class="mt-4">
				<div class="space-y-2 max-h-[400px] overflow-y-auto">
					{#if filteredComponents().length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<p>No components found</p>
						</div>
					{:else}
						{#each filteredComponents() as component}
							<button
								onclick={() => handleToggleComponent(component.id)}
								class="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
							>
								<Checkbox checked={isSelected(component.id)} />
								<div class="flex-1">
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="text-xs">
											{component.type.toUpperCase()}
										</Badge>
										<p class="font-medium">{component.name}</p>
									</div>
									<p class="text-sm text-muted-foreground">{component.apiName}</p>
									{#if component.description}
										<p class="text-xs text-muted-foreground mt-1">{component.description}</p>
									{/if}
								</div>
								<div class="text-sm text-muted-foreground">
									{component.dependencies.length} dep{component.dependencies.length !== 1 ? 's' : ''}
								</div>
							</button>
						{/each}
					{/if}
				</div>
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>

