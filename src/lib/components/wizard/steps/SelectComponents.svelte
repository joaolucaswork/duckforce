<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { LoaderCircle, TriangleAlert, RefreshCw, X } from '@lucide/svelte';
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import { onMount } from 'svelte';
	import ComponentListPanel from '$lib/components/wizard/ComponentListPanel.svelte';

	// COMMENTED OUT: Unused imports for unified view
	// import { Badge } from '$lib/components/ui/badge';
	// import { Checkbox } from '$lib/components/ui/checkbox';
	// import * as Tabs from '$lib/components/ui/tabs';
	// import * as Tooltip from '$lib/components/ui/tooltip';
	// import { LayoutGrid, Columns2, Info } from '@lucide/svelte';
	// import type { ComponentType } from '$lib/types/salesforce';
	// import VirtualList from '$lib/components/ui/VirtualList.svelte';

	let errorMessage = $state<string | null>(null);
	let lastLoadedSourceOrgId = $state<string | null>(null);
	let lastLoadedTargetOrgId = $state<string | null>(null);
	let showBanner = $state(true);
	let sourceRefreshing = $state(false);
	let targetRefreshing = $state(false);
	let lastUpdatedSource = $state<Date | null>(null);
	let lastUpdatedTarget = $state<Date | null>(null);

	// COMMENTED OUT: Unused state variables for unified view
	// let searchQuery = $state('');
	// let selectedTab = $state<ComponentType | 'all'>('all');
	// let viewMode = $state<'unified' | 'side-by-side'>('side-by-side');

	const isLoading = $derived(wizardStore.state.componentSelection.isLoading);
	const availableComponents = $derived(wizardStore.state.componentSelection.availableComponents);
	const selectedIds = $derived(wizardStore.state.componentSelection.selectedIds);
	const selectedSourceOrgId = $derived(wizardStore.state.selectedSourceOrgId);
	const selectedTargetOrgId = $derived(wizardStore.state.selectedTargetOrgId);
	const cachedOrgs = $derived(wizardStore.state.cachedOrgs);
	const currentStep = $derived(wizardStore.state.currentStep);

	// Get source and target orgs
	const sourceOrg = $derived(() =>
		selectedSourceOrgId ? cachedOrgs.find(org => org.id === selectedSourceOrgId) : null
	);
	const targetOrg = $derived(() =>
		selectedTargetOrgId ? cachedOrgs.find(org => org.id === selectedTargetOrgId) : null
	);

	// Separate components by org
	const sourceComponents = $derived(() =>
		availableComponents.filter(c => c.sourceOrgId === selectedSourceOrgId)
	);
	const targetComponents = $derived(() =>
		availableComponents.filter(c => c.sourceOrgId === selectedTargetOrgId)
	);

	// COMMENTED OUT: Memoization and filtering for unified view
	/*
	// Memoization: Store filtered results by cache key
	let filteredComponentsCache = $state<{
		key: string;
		result: SalesforceComponent[];
	} | null>(null);

	// Filter components based on search and tab with memoization
	const filteredComponents = $derived.by(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${availableComponents.length}`;

		// Check if we can use cached result
		if (filteredComponentsCache && filteredComponentsCache.key === cacheKey) {
			return filteredComponentsCache.result;
		}

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

	// Update cache after filteredComponents is computed
	$effect(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${availableComponents.length}`;
		filteredComponentsCache = {
			key: cacheKey,
			result: filteredComponents
		};
	});

	// Memoize component counts
	let componentCountsCache = $state<{
		key: number;
		result: Record<ComponentType | 'all', number>;
	} | null>(null);

	const componentCounts = $derived.by(() => {
		const cacheKey = availableComponents.length;

		// Return cached counts if components haven't changed
		if (componentCountsCache && componentCountsCache.key === cacheKey) {
			return componentCountsCache.result;
		}

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

	// Update counts cache after componentCounts is computed
	$effect(() => {
		componentCountsCache = {
			key: availableComponents.length,
			result: componentCounts
		};
	});
	*/

	/**
	 * Fetch components from both source and target organizations
	 */
	async function fetchComponents(updateTimestamps: boolean = true) {
		console.log('[fetchComponents] Starting...');
		console.log('[fetchComponents] selectedSourceOrgId:', selectedSourceOrgId);
		console.log('[fetchComponents] selectedTargetOrgId:', selectedTargetOrgId);

		// Check if at least source org is selected
		if (!selectedSourceOrgId) {
			console.error('[fetchComponents] No source org selected!');
			wizardStore.setComponentsError('Please select a source organization first');
			errorMessage = 'Please select a source organization first';
			return;
		}

		wizardStore.setComponentsLoading(true);
		errorMessage = null;

		try {
			console.log('[fetchComponents] Looking for orgs in cachedOrgs...');
			console.log('[fetchComponents] cachedOrgs:', wizardStore.state.cachedOrgs);

			// Get the source org
			const sourceOrg = wizardStore.state.cachedOrgs.find(
				org => org.id === selectedSourceOrgId
			);

			if (!sourceOrg) {
				throw new Error('Source organization not found');
			}

			// Get the target org (if selected)
			const targetOrg = selectedTargetOrgId
				? wizardStore.state.cachedOrgs.find(org => org.id === selectedTargetOrgId)
				: null;

			console.log('[fetchComponents] Found sourceOrg:', sourceOrg);
			console.log('[fetchComponents] Found targetOrg:', targetOrg);

			// Fetch components from both orgs in parallel
			const fetchPromises = [];
			const orgData: Array<{ orgId: string; orgName: string; components: SalesforceComponent[] }> = [];

			// Fetch from source org
			console.log('[fetchComponents] Fetching from source org:', sourceOrg.org_id);
			fetchPromises.push(
				fetch(`/api/orgs/${sourceOrg.org_id}/components`)
					.then(async (response) => {
						if (!response.ok) {
							const errorData = await response.json().catch(() => ({}));
							throw new Error(errorData.message || `Failed to fetch components from source org: ${response.statusText}`);
						}
						const data = await response.json();
						const components: SalesforceComponent[] = data.components.map((comp: any) => ({
							id: comp.id,
							name: comp.name,
							type: comp.type,
							apiName: comp.api_name,
							description: comp.description || undefined,
							namespace: comp.namespace || undefined,
							dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
							dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
							migrationStatus: 'pending' as const,
							migrationDate: undefined,
							metadata: comp.metadata || {}
						}));
						orgData.push({
							orgId: sourceOrg.id,
							orgName: sourceOrg.org_name,
							components
						});
						console.log('[fetchComponents] Received', components.length, 'components from source org');
					})
			);

			// Fetch from target org if selected
			if (targetOrg) {
				console.log('[fetchComponents] Fetching from target org:', targetOrg.org_id);
				fetchPromises.push(
					fetch(`/api/orgs/${targetOrg.org_id}/components`)
						.then(async (response) => {
							if (!response.ok) {
								const errorData = await response.json().catch(() => ({}));
								throw new Error(errorData.message || `Failed to fetch components from target org: ${response.statusText}`);
							}
							const data = await response.json();
							const components: SalesforceComponent[] = data.components.map((comp: any) => ({
								id: comp.id,
								name: comp.name,
								type: comp.type,
								apiName: comp.api_name,
								description: comp.description || undefined,
								namespace: comp.namespace || undefined,
								dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
								dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
								migrationStatus: 'pending' as const,
								migrationDate: undefined,
								metadata: comp.metadata || {}
							}));
							orgData.push({
								orgId: targetOrg.id,
								orgName: targetOrg.org_name,
								components
							});
							console.log('[fetchComponents] Received', components.length, 'components from target org');
						})
				);
			}

			// Wait for all fetches to complete
			await Promise.all(fetchPromises);

			// Set components from all orgs
			console.log('[fetchComponents] Setting components from', orgData.length, 'org(s)');
			wizardStore.setComponentsFromMultipleOrgs(orgData);
			console.log('[fetchComponents] Components set successfully. Total count:', wizardStore.state.componentSelection.availableComponents.length);

			// Update timestamps for both orgs (only on initial load, not on individual refresh)
			if (updateTimestamps) {
				const now = new Date();
				lastUpdatedSource = now;
				lastUpdatedTarget = now;
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to load components';
			wizardStore.setComponentsError(message);
			errorMessage = message;
			console.error('[fetchComponents] Error:', error);
		}
	}

	async function handleRefreshSourceComponents() {
		const selectedOrgId = wizardStore.state.selectedSourceOrgId;

		if (!selectedOrgId) {
			console.error('[RefreshComponents] No source org selected');
			return;
		}

		const sourceOrg = wizardStore.state.cachedOrgs.find(org => org.id === selectedOrgId);

		if (!sourceOrg) {
			console.error('[RefreshComponents] Source org not found in cached orgs');
			return;
		}

		try {
			sourceRefreshing = true;
			console.log('[RefreshComponents] Refreshing source components for org:', sourceOrg.org_id);

			// Step 1: Sync the org to refresh components in the database
			const syncResponse = await fetch(`/api/orgs/${sourceOrg.org_id}/sync?refreshComponents=true`, {
				method: 'POST'
			});

			if (!syncResponse.ok) {
				throw new Error('Failed to refresh components');
			}

			const syncData = await syncResponse.json();
			console.log('[RefreshComponents] Source components refreshed:', syncData);

			// Step 2: Fetch the updated components for this org only
			const componentsResponse = await fetch(`/api/orgs/${sourceOrg.org_id}/components`);

			if (!componentsResponse.ok) {
				const errorData = await componentsResponse.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to fetch updated components');
			}

			const componentsData = await componentsResponse.json();
			const updatedComponents: SalesforceComponent[] = componentsData.components.map((comp: any) => ({
				id: comp.id,
				name: comp.name,
				type: comp.type,
				apiName: comp.api_name,
				description: comp.description || undefined,
				namespace: comp.namespace || undefined,
				dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
				dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
				migrationStatus: 'pending' as const,
				migrationDate: undefined,
				metadata: comp.metadata || {}
			}));

			console.log('[RefreshComponents] Fetched', updatedComponents.length, 'updated components from source org');

			// Step 3: Update only the source org's components in the store
			const currentComponents = wizardStore.state.componentSelection.availableComponents;
			const otherOrgComponents = currentComponents.filter(c => c.sourceOrgId !== sourceOrg.id);
			const newComponents = updatedComponents.map(comp => ({
				...comp,
				sourceOrgId: sourceOrg.id,
				sourceOrgName: sourceOrg.org_name
			}));

			wizardStore.state.componentSelection.availableComponents = [...otherOrgComponents, ...newComponents];

			// Update timestamp for source org only
			lastUpdatedSource = new Date();
		} catch (err) {
			console.error('[RefreshComponents] Error:', err);
			errorMessage = 'Failed to refresh source components';
		} finally {
			sourceRefreshing = false;
		}
	}

	async function handleRefreshTargetComponents() {
		const selectedOrgId = wizardStore.state.selectedTargetOrgId;

		if (!selectedOrgId) {
			console.error('[RefreshComponents] No target org selected');
			return;
		}

		const targetOrg = wizardStore.state.cachedOrgs.find(org => org.id === selectedOrgId);

		if (!targetOrg) {
			console.error('[RefreshComponents] Target org not found in cached orgs');
			return;
		}

		try {
			targetRefreshing = true;
			console.log('[RefreshComponents] Refreshing target components for org:', targetOrg.org_id);

			// Step 1: Sync the org to refresh components in the database
			const syncResponse = await fetch(`/api/orgs/${targetOrg.org_id}/sync?refreshComponents=true`, {
				method: 'POST'
			});

			if (!syncResponse.ok) {
				throw new Error('Failed to refresh components');
			}

			const syncData = await syncResponse.json();
			console.log('[RefreshComponents] Target components refreshed:', syncData);

			// Step 2: Fetch the updated components for this org only
			const componentsResponse = await fetch(`/api/orgs/${targetOrg.org_id}/components`);

			if (!componentsResponse.ok) {
				const errorData = await componentsResponse.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to fetch updated components');
			}

			const componentsData = await componentsResponse.json();
			const updatedComponents: SalesforceComponent[] = componentsData.components.map((comp: any) => ({
				id: comp.id,
				name: comp.name,
				type: comp.type,
				apiName: comp.api_name,
				description: comp.description || undefined,
				namespace: comp.namespace || undefined,
				dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
				dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
				migrationStatus: 'pending' as const,
				migrationDate: undefined,
				metadata: comp.metadata || {}
			}));

			console.log('[RefreshComponents] Fetched', updatedComponents.length, 'updated components from target org');

			// Step 3: Update only the target org's components in the store
			const currentComponents = wizardStore.state.componentSelection.availableComponents;
			const otherOrgComponents = currentComponents.filter(c => c.sourceOrgId !== targetOrg.id);
			const newComponents = updatedComponents.map(comp => ({
				...comp,
				sourceOrgId: targetOrg.id,
				sourceOrgName: targetOrg.org_name
			}));

			wizardStore.state.componentSelection.availableComponents = [...otherOrgComponents, ...newComponents];

			// Update timestamp for target org only
			lastUpdatedTarget = new Date();
		} catch (err) {
			console.error('[RefreshComponents] Error:', err);
			errorMessage = 'Failed to refresh target components';
		} finally {
			targetRefreshing = false;
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

	// Reactive effect: Reload components when returning to this step or when orgs change
	$effect(() => {
		// Track dependencies
		const step = currentStep;
		const sourceOrgId = selectedSourceOrgId;
		const targetOrgId = selectedTargetOrgId;

		console.log('[SelectComponents] $effect triggered - step:', step, 'sourceOrgId:', sourceOrgId, 'targetOrgId:', targetOrgId);
		console.log('[SelectComponents] Last loaded - source:', lastLoadedSourceOrgId, 'target:', lastLoadedTargetOrgId);

		// Only reload if:
		// 1. We're on the select-components step
		// 2. We have a source org selected
		// 3. Either we haven't loaded yet OR one of the orgs changed
		const sourceChanged = sourceOrgId && sourceOrgId !== lastLoadedSourceOrgId;
		const targetChanged = targetOrgId !== lastLoadedTargetOrgId;

		if (step === 'select-components' && sourceOrgId && (sourceChanged || targetChanged)) {
			console.log('[SelectComponents] $effect - Reloading components. Source changed:', sourceChanged, 'Target changed:', targetChanged);
			lastLoadedSourceOrgId = sourceOrgId;
			lastLoadedTargetOrgId = targetOrgId;
			fetchComponents();
		}
	});

	function handleToggleComponent(componentId: string) {
		wizardStore.toggleComponentSelection(componentId);
	}

	function handleSelectAllFromOrg(orgId: string) {
		wizardStore.selectAllComponentsFromOrg(orgId);
	}

	function handleDeselectAllFromOrg(orgId: string) {
		wizardStore.deselectAllComponentsFromOrg(orgId);
	}

	function isSelected(componentId: string): boolean {
		return selectedIds.has(componentId);
	}
</script>

<div class="flex flex-col gap-6 flex-1 min-h-0">
	<!-- Info Alert -->
	{#if showBanner}
		<Alert.Root class="relative flex-shrink-0">
			<Alert.Title>Select Components to Migrate</Alert.Title>
			<Alert.Description class="text-sm pr-8">
				Select components from either organization to include in the migration. Dependencies will be automatically discovered in the next step.
			</Alert.Description>
			<button
				onclick={() => showBanner = false}
				class="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
				aria-label="Close banner"
			>
				<X class="h-4 w-4" />
			</button>
		</Alert.Root>
	{/if}



	{#if errorMessage}
		<!-- Error Alert -->
		<Alert.Root variant="destructive">
			<TriangleAlert class="h-4 w-4" />
			<Alert.Title>Error Loading Components</Alert.Title>
			<Alert.Description class="flex items-center justify-between">
				<span>{errorMessage}</span>
				<Button variant="outline" size="sm" onclick={() => fetchComponents()}>
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
				<p class="text-sm text-muted-foreground">Loading components...</p>
			</div>
		</div>
	{:else if !errorMessage}
		<!-- COMMENTED OUT: View Mode Toggle - Keeping only side-by-side view
		{#if sourceComponents().length > 0 && targetComponents().length > 0}
			<div class="flex items-center gap-2">
				<Button
					variant={viewMode === 'unified' ? 'default' : 'outline'}
					size="sm"
					onclick={() => viewMode = 'unified'}
				>
					<LayoutGrid class="h-4 w-4 mr-2" />
					Unified
				</Button>
				<Button
					variant={viewMode === 'side-by-side' ? 'default' : 'outline'}
					size="sm"
					onclick={() => viewMode = 'side-by-side'}
				>
					<Columns2 class="h-4 w-4 mr-2" />
					Side-by-Side
				</Button>
			</div>
		{/if}
		-->

		<!-- Component View -->
		{#if sourceComponents().length > 0 && targetComponents().length > 0 && sourceOrg() && targetOrg()}
			<!-- Side-by-Side View -->
			<div class="grid grid-cols-2 gap-4 flex-1 min-h-0">
				<!-- Source Org Panel -->
				<div class="border rounded-lg p-4 flex flex-col min-h-0">
					<ComponentListPanel
						components={sourceComponents()}
						selectedIds={selectedIds}
						orgId={selectedSourceOrgId || ''}
						organization={sourceOrg()!}
						role="source"
						onToggleComponent={handleToggleComponent}
						onSelectAll={handleSelectAllFromOrg}
						onDeselectAll={handleDeselectAllFromOrg}
						isSelected={isSelected}
						onRefresh={handleRefreshSourceComponents}
						isRefreshing={sourceRefreshing}
						lastUpdated={lastUpdatedSource}
					/>
				</div>

				<!-- Target Org Panel -->
				<div class="border rounded-lg p-4 flex flex-col min-h-0">
					<ComponentListPanel
						components={targetComponents()}
						selectedIds={selectedIds}
						orgId={selectedTargetOrgId || ''}
						organization={targetOrg()!}
						role="target"
						onToggleComponent={handleToggleComponent}
						onSelectAll={handleSelectAllFromOrg}
						onDeselectAll={handleDeselectAllFromOrg}
						isSelected={isSelected}
						onRefresh={handleRefreshTargetComponents}
						isRefreshing={targetRefreshing}
						lastUpdated={lastUpdatedTarget}
					/>
				</div>
			</div>
		<!-- COMMENTED OUT: Unified View - Keeping only side-by-side view
		{:else}
			<Tabs.Root bind:value={selectedTab}>
				<Tabs.List class="grid w-full grid-cols-6">
					<Tabs.Trigger value="all">
						All <span class="font-mono">({componentCounts.all})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="lwc">
						LWC <span class="font-mono">({componentCounts.lwc})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="apex">
						Apex <span class="font-mono">({componentCounts.apex})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="object">
						Objects <span class="font-mono">({componentCounts.object})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="field">
						Fields <span class="font-mono">({componentCounts.field})</span>
					</Tabs.Trigger>
					<Tabs.Trigger value="trigger">
						Triggers <span class="font-mono">({componentCounts.trigger})</span>
					</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value={selectedTab} class="mt-4">
					{#if filteredComponents.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<p>No components found</p>
						</div>
					{:else}
						<VirtualList
							items={filteredComponents}
							itemHeight={100}
							height={400}
						>
							{#snippet children(component: SalesforceComponent)}
								<button
									onclick={() => handleToggleComponent(component.id)}
									class="group w-full flex items-center gap-3 p-3 mb-2 rounded-lg border hover:bg-accent transition-colors text-left {isSelected(component.id) ? 'bg-accent' : ''}"
								>
									<Checkbox checked={isSelected(component.id)} />
									<div class="flex-1">
										<div class="flex items-center gap-2 flex-wrap">
											<Badge variant="outline" class="text-xs font-mono">
												{component.type.toUpperCase()}
											</Badge>
											{#if component.sourceOrgName}
												<Badge
													variant="secondary"
													class="text-xs"
													style="background-color: {wizardStore.state.cachedOrgs.find(o => o.id === component.sourceOrgId)?.color || '#6b7280'}20; color: {wizardStore.state.cachedOrgs.find(o => o.id === component.sourceOrgId)?.color || '#6b7280'};"
												>
													{component.sourceOrgName}
												</Badge>
											{/if}
											<p class="font-medium">{component.name}</p>
											<Tooltip.Root>
												<Tooltip.Trigger>
													{#snippet child({ props })}
														<button {...props} class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100" type="button">
															<Info class="h-3.5 w-3.5" />
														</button>
													{/snippet}
												</Tooltip.Trigger>
												<Tooltip.Content side="top">
													<span class="font-mono">{component.apiName}</span>
												</Tooltip.Content>
											</Tooltip.Root>
										</div>
										{#if component.description}
											<p class="text-xs text-muted-foreground mt-1">{component.description}</p>
										{/if}
									</div>
								</button>
							{/snippet}
						</VirtualList>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		-->
		{/if}
	{/if}
</div>

