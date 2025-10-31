<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Alert from '$lib/components/ui/alert';
	import { Search, LoaderCircle, Info, TriangleAlert, RefreshCw } from '@lucide/svelte';
	import type { ComponentType, SalesforceComponent } from '$lib/types/salesforce';
	import { onMount } from 'svelte';

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all'>('all');
	let errorMessage = $state<string | null>(null);
	let lastLoadedOrgId = $state<string | null>(null);

	const isLoading = $derived(wizardStore.state.componentSelection.isLoading);
	const availableComponents = $derived(wizardStore.state.componentSelection.availableComponents);
	const selectedIds = $derived(wizardStore.state.componentSelection.selectedIds);
	const selectedSourceOrgId = $derived(wizardStore.state.selectedSourceOrgId);
	const currentStep = $derived(wizardStore.state.currentStep);

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

	/**
	 * Fetch real components from the selected source organization
	 */
	async function fetchComponents() {
		console.log('[fetchComponents] Starting...');
		console.log('[fetchComponents] selectedSourceOrgId:', selectedSourceOrgId);
		console.log('[fetchComponents] Current availableComponents count:', availableComponents.length);

		// Check if source org is selected
		if (!selectedSourceOrgId) {
			console.error('[fetchComponents] No source org selected!');
			wizardStore.setComponentsError('Please select a source organization first');
			errorMessage = 'Please select a source organization first';
			return;
		}

		wizardStore.setComponentsLoading(true);
		errorMessage = null;

		try {
			console.log('[fetchComponents] Looking for org in cachedOrgs...');
			console.log('[fetchComponents] cachedOrgs:', wizardStore.state.cachedOrgs);

			// Get the source org to find its org_id
			const sourceOrg = wizardStore.state.cachedOrgs.find(
				org => org.id === selectedSourceOrgId
			);

			console.log('[fetchComponents] Found sourceOrg:', sourceOrg);

			if (!sourceOrg) {
				throw new Error('Source organization not found');
			}

			console.log('[fetchComponents] Fetching from /api/orgs/' + sourceOrg.org_id + '/components');

			// Fetch components from API using org_id
			const response = await fetch(`/api/orgs/${sourceOrg.org_id}/components`);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || `Failed to fetch components: ${response.statusText}`);
			}

			const data = await response.json();
			console.log('[fetchComponents] Received', data.components?.length || 0, 'components from API');

			// Transform API response to SalesforceComponent format
			const components: SalesforceComponent[] = data.components.map((comp: any) => ({
				id: comp.id,
				name: comp.name,
				type: comp.type,
				apiName: comp.api_name,
				description: comp.description || undefined,
				namespace: comp.namespace || undefined,
				dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
				dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
				migrationStatus: 'pending' as const, // Reset to pending for wizard flow
				migrationDate: undefined,
				metadata: comp.metadata || {}
			}));

			console.log('[fetchComponents] Setting', components.length, 'components in store');
			wizardStore.setAvailableComponents(components);
			console.log('[fetchComponents] Components set successfully. New count:', wizardStore.state.componentSelection.availableComponents.length);
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load components';
			wizardStore.setComponentsError(message);
			errorMessage = message;
			console.error('[fetchComponents] Error:', error);
		}
	}

	onMount(async () => {
		console.log('[SelectComponents] onMount - Starting');
		console.log('[SelectComponents] selectedSourceOrgId:', selectedSourceOrgId);
		console.log('[SelectComponents] cachedOrgs count:', wizardStore.state.cachedOrgs.length);
		console.log('[SelectComponents] cachedOrgs:', wizardStore.state.cachedOrgs);

		// Ensure cached orgs are loaded before fetching components
		if (wizardStore.state.cachedOrgs.length === 0) {
			console.log('[SelectComponents] Loading cached orgs...');
			try {
				await wizardStore.loadCachedOrgs();
				console.log('[SelectComponents] Cached orgs loaded:', wizardStore.state.cachedOrgs.length);
			} catch (err) {
				console.error('[SelectComponents] Failed to load cached organizations:', err);
				errorMessage = 'Failed to load organizations. Please try again.';
				return;
			}
		}

		console.log('[SelectComponents] Calling fetchComponents...');
		// Load components from source org
		fetchComponents();
	});

	// Reactive effect: Reload components when returning to this step or when source org changes
	$effect(() => {
		// Track dependencies
		const step = currentStep;
		const sourceOrgId = selectedSourceOrgId;

		console.log('[SelectComponents] $effect triggered - step:', step, 'sourceOrgId:', sourceOrgId, 'lastLoadedOrgId:', lastLoadedOrgId);

		// Only reload if:
		// 1. We're on the select-components step
		// 2. We have a source org selected
		// 3. Either we haven't loaded yet OR the source org changed
		if (step === 'select-components' && sourceOrgId && sourceOrgId !== lastLoadedOrgId) {
			console.log('[SelectComponents] $effect - Reloading components for org:', sourceOrgId);
			lastLoadedOrgId = sourceOrgId;
			fetchComponents();
		}
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

	{#if errorMessage}
		<!-- Error Alert -->
		<Alert.Root variant="destructive">
			<TriangleAlert class="h-4 w-4" />
			<Alert.Title>Error Loading Components</Alert.Title>
			<Alert.Description class="flex items-center justify-between">
				<span>{errorMessage}</span>
				<Button variant="outline" size="sm" onclick={fetchComponents}>
					<RefreshCw class="h-4 w-4 mr-2" />
					Retry
				</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	{#if isLoading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center space-y-4">
				<LoaderCircle class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Loading components from source org...</p>
			</div>
		</div>
	{:else if !errorMessage}
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

