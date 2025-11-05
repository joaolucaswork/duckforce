<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import { LoaderCircle, TriangleAlert, RefreshCw, X, Columns2, Rows3 } from '@lucide/svelte';
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import { onMount } from 'svelte';
	import ComponentListPanel from '$lib/components/wizard/ComponentListPanel.svelte';

	// COMMENTED OUT: Unused imports for unified view
	// import { Badge } from '$lib/components/ui/badge';
	// import { Checkbox } from '$lib/components/ui/checkbox';
	// import * as Tabs from '$lib/components/ui/tabs';
	// import * as Tooltip from '$lib/components/ui/tooltip';
	// import { LayoutGrid, Info } from '@lucide/svelte';
	// import type { ComponentType } from '$lib/types/salesforce';
	// import VirtualList from '$lib/components/ui/VirtualList.svelte';

	// Skeleton loading pattern: Single boolean for initial load state
	let isInitialLoad = $state(true);
	let errorMessage = $state<string | null>(null);
	let lastLoadedSourceOrgId = $state<string | null>(null);
	let lastLoadedTargetOrgId = $state<string | null>(null);
	let showBanner = $state(true);
	let sourceRefreshing = $state(false);
	let targetRefreshing = $state(false);
	let lastUpdatedSource = $state<Date | null>(null);
	let lastUpdatedTarget = $state<Date | null>(null);
	// Guard flag to prevent infinite loop in $effect
	let isFetching = $state(false);

	// View mode state: 'side-by-side' or 'stacked'
	let viewMode = $state<'side-by-side' | 'stacked'>('side-by-side');

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

	// Create a map of target components for quick lookup by apiName and type
	// PERFORMANCE: Use lazy evaluation - only compute when actually needed
	const targetComponentsMap = $derived.by(() => {
		// Early return if no target components
		if (targetComponents().length === 0) {
			return new Map<string, SalesforceComponent>();
		}

		const map = new Map<string, SalesforceComponent>();
		targetComponents().forEach(comp => {
			const key = `${comp.apiName}|${comp.type}`;
			map.set(key, comp);
		});
		return map;
	});

	// Mark source components that exist in both orgs
	// PERFORMANCE: Defer this computation to avoid blocking on initial render
	let sourceComponentsWithExistsFlag = $state<Array<SalesforceComponent & { existsInBoth: boolean }>>([]);
	let targetComponentsWithExistsFlag = $state<Array<SalesforceComponent & { existsInBoth: boolean }>>([]);
	let isProcessingSourceComponents = $state(false);
	let isProcessingTargetComponents = $state(false);

	// CRITICAL: Process components in chunks to prevent UI blocking
	// Use $effect to compute existsInBoth flags asynchronously in chunks
	$effect(() => {
		const sourceComps = sourceComponents();
		const targetMap = targetComponentsMap;

		// Start with empty array - skeleton will show
		sourceComponentsWithExistsFlag = [];
		isProcessingSourceComponents = true;

		// Process in chunks of 100 components at a time (increased from 50)
		const CHUNK_SIZE = 100;
		let currentIndex = 0;

		function processChunk() {
			const chunk = sourceComps.slice(currentIndex, currentIndex + CHUNK_SIZE);
			
			const processedChunk = chunk.map(comp => {
				const key = `${comp.apiName}|${comp.type}`;
				const existsInTarget = targetMap.has(key);
				return {
					...comp,
					existsInBoth: existsInTarget
				};
			});

			// Append processed chunk to results
			sourceComponentsWithExistsFlag = [...sourceComponentsWithExistsFlag, ...processedChunk];

			currentIndex += CHUNK_SIZE;

			// Continue processing if there are more components
			if (currentIndex < sourceComps.length) {
				// Use setTimeout with 0 delay to yield to browser
				setTimeout(processChunk, 0);
			} else {
				isProcessingSourceComponents = false;
			}
		}

		// Start processing immediately (no delay) but in chunks
		if (sourceComps.length > 0) {
			setTimeout(processChunk, 0);
		} else {
			isProcessingSourceComponents = false;
		}
	});

	$effect(() => {
		const targetComps = targetComponents();
		const sourceComps = sourceComponents();

		// Start with empty array - skeleton will show
		targetComponentsWithExistsFlag = [];
		isProcessingTargetComponents = true;

		// Build source map first
		const sourceMap = new Map<string, SalesforceComponent>();
		sourceComps.forEach(comp => {
			const key = `${comp.apiName}|${comp.type}`;
			sourceMap.set(key, comp);
		});

		// Process in chunks of 100 components at a time (increased from 50)
		const CHUNK_SIZE = 100;
		let currentIndex = 0;

		function processChunk() {
			const chunk = targetComps.slice(currentIndex, currentIndex + CHUNK_SIZE);
			
			const processedChunk = chunk.map(comp => {
				const key = `${comp.apiName}|${comp.type}`;
				const existsInSource = sourceMap.has(key);
				return {
					...comp,
					existsInBoth: existsInSource
				};
			});

			// Append processed chunk to results
			targetComponentsWithExistsFlag = [...targetComponentsWithExistsFlag, ...processedChunk];

			currentIndex += CHUNK_SIZE;

			// Continue processing if there are more components
			if (currentIndex < targetComps.length) {
				// Use setTimeout with 0 delay to yield to browser
				setTimeout(processChunk, 0);
			} else {
				isProcessingTargetComponents = false;
			}
		}

		// Start processing immediately (no delay) but in chunks
		if (targetComps.length > 0) {
			setTimeout(processChunk, 0);
		} else {
			isProcessingTargetComponents = false;
		}
	});

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
	 * Fetch with timeout to prevent indefinite hangs
	 */
	async function fetchWithTimeout(url: string, timeoutMs: number = 30000, options?: RequestInit): Promise<Response> {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

		try {
			const response = await fetch(url, {
				...options,
				signal: controller.signal
			});
			clearTimeout(timeoutId);
			return response;
		} catch (error) {
			clearTimeout(timeoutId);
			if (error instanceof Error && error.name === 'AbortError') {
				throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
			}
			throw error;
		}
	}

	/**
	 * Fetch components from both source and target organizations
	 */
	async function fetchComponents(updateTimestamps: boolean = true) {
		// Prevent concurrent fetches (infinite loop protection)
		if (isFetching) {
			return;
		}

		// Check if at least source org is selected
		if (!selectedSourceOrgId) {
			console.error('[fetchComponents] No source org selected!');
			wizardStore.setComponentsError('Please select a source organization first');
			errorMessage = 'Please select a source organization first';
			return;
		}

		isFetching = true;
		wizardStore.setComponentsLoading(true);
		errorMessage = null;

		try {
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

			// Fetch components from both orgs in parallel
			const fetchPromises = [];
			const orgData: Array<{ orgId: string; orgName: string; components: SalesforceComponent[] }> = [];

			// Fetch from source org
			fetchPromises.push(
				fetchWithTimeout(`/api/orgs/${sourceOrg.org_id}/components`)
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
					})
			);

			// Fetch from target org if selected
			if (targetOrg) {
				fetchPromises.push(
					fetchWithTimeout(`/api/orgs/${targetOrg.org_id}/components`)
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
						})
				);
			}

			// Wait for all fetches to complete
			await Promise.all(fetchPromises);

			// Set components from all orgs
			wizardStore.setComponentsFromMultipleOrgs(orgData);

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
		} finally {
			// CRITICAL: Always reset fetching flag to prevent infinite hang
			isFetching = false;
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

			// Step 1: Sync the org to refresh components in the database
			const syncResponse = await fetchWithTimeout(
				`/api/orgs/${sourceOrg.org_id}/sync?refreshComponents=true`,
				60000,
				{ method: 'POST' }
			);

			if (!syncResponse.ok) {
				throw new Error('Failed to refresh components');
			}

			await syncResponse.json();

			// Step 2: Fetch the updated components for this org only
			const componentsResponse = await fetchWithTimeout(`/api/orgs/${sourceOrg.org_id}/components`);

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
				metadata: {
					...(comp.metadata || {}),
					component_id: comp.component_id // Store Salesforce component_id in metadata
				}
			}));

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

			// Step 1: Sync the org to refresh components in the database
			const syncResponse = await fetchWithTimeout(
				`/api/orgs/${targetOrg.org_id}/sync?refreshComponents=true`,
				60000,
				{ method: 'POST' }
			);

			if (!syncResponse.ok) {
				throw new Error('Failed to refresh components');
			}

			await syncResponse.json();

			// Step 2: Fetch the updated components for this org only
			const componentsResponse = await fetchWithTimeout(`/api/orgs/${targetOrg.org_id}/components`);

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
				metadata: {
					...(comp.metadata || {}),
					component_id: comp.component_id // Store Salesforce component_id in metadata
				}
			}));

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
		try {
			// Ensure cached orgs are loaded before fetching components
			if (wizardStore.state.cachedOrgs.length === 0) {
				await wizardStore.loadCachedOrgs();
			}

			// CRITICAL: Await fetchComponents to prevent race condition with $effect
			await fetchComponents();

			// Small delay for smooth transition
			await new Promise(resolve => setTimeout(resolve, 100));
		} catch (err) {
			console.error('[SelectComponents] Error in onMount:', err);
			errorMessage = err instanceof Error ? err.message : 'Failed to load organizations. Please try again.';
		} finally {
			// CRITICAL: Set isInitialLoad to false at the very end (skeleton loading pattern)
			isInitialLoad = false;
		}
	});

	// Reactive effect: Reload components when returning to this step or when orgs change
	$effect(() => {
		// Track dependencies
		const step = currentStep;
		const sourceOrgId = selectedSourceOrgId;
		const targetOrgId = selectedTargetOrgId;

		// Only reload if:
		// 1. We're on the select-components step
		// 2. We have a source org selected
		// 3. Either we haven't loaded yet OR one of the orgs changed
		const sourceChanged = sourceOrgId && sourceOrgId !== lastLoadedSourceOrgId;
		const targetChanged = targetOrgId !== lastLoadedTargetOrgId;

		if (step === 'select-components' && sourceOrgId && (sourceChanged || targetChanged)) {
			lastLoadedSourceOrgId = sourceOrgId;
			lastLoadedTargetOrgId = targetOrgId;
			fetchComponents();
		}
	});

	function handleToggleComponent(componentId: string) {
		wizardStore.toggleComponentSelection(componentId);
	}

	function handleSelectBatch(componentIds: string[]) {
		wizardStore.selectComponentsBatch(componentIds);
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

<div class="flex flex-col gap-6 flex-1 min-h-0 overflow-hidden">
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

	{#if isInitialLoad}
		<!-- Skeleton Loading State (Initial Load Only) -->
		<div class="flex items-center justify-center py-12 animate-in fade-in duration-300">
			<div class="text-center space-y-4">
				<LoaderCircle class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Loading components...</p>
			</div>
		</div>
	{:else if isLoading}
		<!-- Subsequent Loading State (After Initial Load) -->
		<div class="flex items-center justify-center py-12 animate-in fade-in duration-300">
			<div class="text-center space-y-4">
				<LoaderCircle class="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
				<p class="text-sm text-muted-foreground">Loading components...</p>
			</div>
		</div>
	{:else if !errorMessage}
		<!-- Component View -->
		{#if sourceComponents().length > 0 && targetComponents().length > 0 && sourceOrg() && targetOrg()}
			<!-- Control Bar -->
			<div class="flex items-center justify-between gap-4 px-1 py-2 border-b bg-muted/30 flex-shrink-0">
				<div class="flex items-center gap-2">
					<span class="text-sm font-medium text-muted-foreground">View Mode:</span>
					<div class="flex items-center gap-1 border rounded-md p-0.5 bg-background">
						<Button
							variant={viewMode === 'side-by-side' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => viewMode = 'side-by-side'}
							class="h-7 px-2"
						>
							<Columns2 class="h-3.5 w-3.5 mr-1.5" />
							Side-by-Side
						</Button>
						<Button
							variant={viewMode === 'stacked' ? 'default' : 'ghost'}
							size="sm"
							onclick={() => viewMode = 'stacked'}
							class="h-7 px-2"
						>
							<Rows3 class="h-3.5 w-3.5 mr-1.5" />
							Stacked
						</Button>
					</div>
				</div>
				<!-- Placeholder for future controls -->
				<div class="flex items-center gap-2">
					<!-- Future controls can be added here -->
				</div>
			</div>

			<!-- Organization Panels -->
			<div class="{viewMode === 'side-by-side' ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'} flex-1 min-h-0 {viewMode === 'stacked' ? 'overflow-y-auto' : 'overflow-hidden'} animate-in fade-in duration-300">
				<!-- Source Org Panel -->
				<div class="border rounded-lg p-4 flex flex-col {viewMode === 'stacked' ? 'flex-shrink-0' : 'min-h-0 overflow-hidden'}">
					<ComponentListPanel
						components={sourceComponentsWithExistsFlag}
						selectedIds={selectedIds}
						orgId={selectedSourceOrgId || ''}
						organization={sourceOrg()!}
						role="source"
						onToggleComponent={handleToggleComponent}
						onSelectBatch={handleSelectBatch}
						onSelectAll={handleSelectAllFromOrg}
						onDeselectAll={handleDeselectAllFromOrg}
						isSelected={isSelected}
						onRefresh={handleRefreshSourceComponents}
						isRefreshing={sourceRefreshing || isProcessingSourceComponents}
						lastUpdated={lastUpdatedSource}
					/>
				</div>

				<!-- Target Org Panel -->
				<div class="border rounded-lg p-4 flex flex-col {viewMode === 'stacked' ? 'flex-shrink-0' : 'min-h-0 overflow-hidden'}">
					<ComponentListPanel
						components={targetComponentsWithExistsFlag}
						selectedIds={selectedIds}
						orgId={selectedTargetOrgId || ''}
						organization={targetOrg()!}
						role="target"
						onToggleComponent={handleToggleComponent}
						onSelectBatch={handleSelectBatch}
						onSelectAll={handleSelectAllFromOrg}
						onDeselectAll={handleDeselectAllFromOrg}
						isSelected={isSelected}
						onRefresh={handleRefreshTargetComponents}
						isRefreshing={targetRefreshing || isProcessingTargetComponents}
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

