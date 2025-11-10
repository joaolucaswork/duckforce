<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Search, RefreshCw, Ellipsis, ChevronRight, Plus, Minus, Maximize2 } from '@lucide/svelte';
	import type { ComponentType, SalesforceComponent } from '$lib/types/salesforce';
	import type { CachedOrganization } from '$lib/types/wizard';
	import OrganizationCard from './OrganizationCard.svelte';
	import ComponentDetailsModal from './ComponentDetailsModal.svelte';

	interface Props {
		components: SalesforceComponent[];
		selectedIds: Set<string>;
		orgId: string;
		organization: CachedOrganization;
		role: 'source' | 'target';
		onToggleComponent: (componentId: string) => void;
		onSelectAll: (orgId: string) => void;
		onDeselectAll: (orgId: string) => void;
		onSelectBatch?: (componentIds: string[]) => void; // NEW: Batch selection for performance
		isSelected: (componentId: string) => boolean;
		onRefresh?: () => void | Promise<void>;
		isRefreshing?: boolean;
		lastUpdated?: Date | null;
	}

	let {
		components,
		selectedIds,
		// orgId, // Not used anymore - kept in Props for compatibility
		organization,
		role,
		onToggleComponent,
		// onSelectAll, // Not used anymore - using onToggleComponent instead
		// onDeselectAll, // Not used anymore - using onToggleComponent instead
		onSelectBatch, // NEW: Batch selection for performance
		isSelected,
		onRefresh,
		isRefreshing = false,
		lastUpdated = null
	}: Props = $props();

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all' | 'customFields'>('all');
	let showSystemComponents = $state(false);
	let hideExistingComponents = $state(false); // Show components that exist in both orgs by default
	let existingComponentsOpen = $state(false); // Collapsible state for existing components - collapsed by default
	let expandedObjects = $state<Set<string>>(new Set()); // Track which custom objects are expanded
	let autoSelectedIds = $state<Set<string>>(new Set()); // Track auto-selected "exists in both" components
	let detailsModalOpen = $state(false); // Track modal open state
	let selectedComponentForDetails = $state<SalesforceComponent | null>(null); // Track selected component for details modal

	// Track components that exist in both orgs for visual indication only
	// CRITICAL FIX: Do NOT auto-select these components - only track them for UI display
	// BOTH panels: Show components that exist in both orgs as checked/disabled
	$effect(() => {
		// Filter to only custom components that exist in both orgs
		const existsInBothComponents = components.filter(c => c.existsInBoth && isCustomComponent(c));
		const newAutoSelectedIds = new Set(existsInBothComponents.map(c => c.id));

		// Store the IDs for visual indication only (checked/disabled checkboxes)
		// DO NOT add them to the actual selectedIds Set
		autoSelectedIds = newAutoSelectedIds;
	});



	// Format timestamp for display
	function formatTimestamp(date: Date | null): string {
		if (!date) return '';

		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		// If less than 1 minute ago, show "Just now"
		if (diffMins < 1) return 'Just now';

		// If less than 60 minutes ago, show "X min ago"
		if (diffMins < 60) return `${diffMins} min ago`;

		// Otherwise show full date and time
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		});
	}



	// Toggle expand/collapse state for a custom object
	function toggleObjectExpansion(objectApiName: string) {
		const newExpanded = new Set(expandedObjects);
		if (newExpanded.has(objectApiName)) {
			newExpanded.delete(objectApiName);
		} else {
			newExpanded.add(objectApiName);
		}
		expandedObjects = newExpanded;
	}

	// Check if an object is expanded
	function isObjectExpanded(objectApiName: string): boolean {
		return expandedObjects.has(objectApiName);
	}

	// Get custom fields for a specific custom object
	function getCustomFieldsForObject(objectApiName: string): SalesforceComponent[] {
		const fields = components.filter(c => {
			if (c.type !== 'field') return false;

			// For custom objects, the field's apiName is in format: "ObjectName__c.FieldName__c"
			// For standard objects, it's: "ObjectName.FieldName__c"
			// So we can extract the object name from the apiName

			const fieldApiName = c.apiName;
			if (!fieldApiName) return false;

			// Extract object name from field API name (everything before the first dot)
			const dotIndex = fieldApiName.indexOf('.');
			if (dotIndex === -1) return false;

			const objectNameFromApiName = fieldApiName.substring(0, dotIndex);

			// Match against the object API name
			return objectNameFromApiName === objectApiName;
		});

		return fields;
	}

	// Check if a component is a custom object (not a standard object)
	function isCustomObject(component: SalesforceComponent): boolean {
		return component.type === 'object' && component.apiName.endsWith('__c');
	}

	// Capitalize first letter of a string
	function capitalizeFirst(str: string): string {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	// Open details modal for a component
	function openDetailsModal(component: SalesforceComponent) {
		selectedComponentForDetails = component;
		detailsModalOpen = true;
	}

	// Handle modal open change
	function handleModalOpenChange(open: boolean) {
		detailsModalOpen = open;
		if (!open) {
			selectedComponentForDetails = null;
		}
	}

	// Extract parent object name from a field component
	// Uses the field's apiName to extract the object name
	function getParentObjectName(field: SalesforceComponent): string {
		if (field.type !== 'field') return 'Unknown';

		// Field apiName format: "ObjectName__c.FieldName__c" or "ObjectName.FieldName__c"
		const fieldApiName = field.apiName;
		if (!fieldApiName) return 'Unknown';

		// Extract object API name (everything before the first dot)
		const dotIndex = fieldApiName.indexOf('.');
		if (dotIndex === -1) return 'Unknown';

		const objectApiName = fieldApiName.substring(0, dotIndex);

		// DEBUG: Compare fields from both lists
		if (field.name === 'PrecoFormatado') {
			console.log('🔍 DEBUG PrecoFormatado:', {
				fieldName: field.name,
				fieldApiName: field.apiName,
				extractedObjectApiName: objectApiName,
				existsInBoth: field.existsInBoth,
				allObjectsInComponents: components.filter(c => c.type === 'object').map(c => ({
					apiName: c.apiName,
					name: c.name
				}))
			});
		}

		// Try to find the parent object by API name to get its display name
		const parentObject = components.find(c =>
			c.type === 'object' && c.apiName === objectApiName
		);

		if (parentObject) {
			return parentObject.name;
		}

		// If object not found in components array, return the API name itself
		// This handles cases where the object might not be in the filtered list
		return objectApiName;
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

	// Memoization: Store filtered results by cache key
	let filteredComponentsCache = $state<{
		key: string;
		result: SalesforceComponent[];
	} | null>(null);

	// Filter components based on search and tab with memoization
	const filteredComponents = $derived.by(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${showSystemComponents}-${hideExistingComponents}-${components.length}`;

		// Check if we can use cached result
		if (filteredComponentsCache && filteredComponentsCache.key === cacheKey) {
			return filteredComponentsCache.result;
		}

		let filtered = components;

		// Filter by custom/system components
		if (!showSystemComponents) {
			filtered = filtered.filter(c => isCustomComponent(c));
		}

		// Filter by existsInBoth
		if (hideExistingComponents) {
			filtered = filtered.filter(c => !c.existsInBoth);
		}

		// Filter by type
		if (selectedTab !== 'all') {
			if (selectedTab === 'customFields') {
				// Show only custom fields (fields with __c in apiName)
				filtered = filtered.filter(c => c.type === 'field' && c.apiName.includes('__c'));
			} else {
				filtered = filtered.filter(c => c.type === selectedTab);
			}
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

	// Update cache after filteredComponents is computed
	$effect(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${showSystemComponents}-${hideExistingComponents}-${components.length}`;
		filteredComponentsCache = {
			key: cacheKey,
			result: filteredComponents
		};
	});

	// Memoize component counts
	let componentCountsCache = $state<{
		key: string;
		result: Record<ComponentType | 'all' | 'customFields', number>;
	} | null>(null);

	const componentCounts = $derived.by(() => {
		const cacheKey = `${components.length}-${showSystemComponents}-${hideExistingComponents}`;

		// Return cached counts if components haven't changed
		if (componentCountsCache && componentCountsCache.key === cacheKey) {
			return componentCountsCache.result;
		}

		// Filter components based on custom/system setting and existsInBoth
		let componentsToCount = showSystemComponents
			? components
			: components.filter(c => isCustomComponent(c));

		// Filter by existsInBoth
		if (hideExistingComponents) {
			componentsToCount = componentsToCount.filter(c => !c.existsInBoth);
		}

		const counts: Record<ComponentType | 'all' | 'customFields', number> = {
			all: componentsToCount.length,
			lwc: 0,
			apex: 0,
			object: 0,
			field: 0,
			trigger: 0,
			visualforce: 0,
			flow: 0,
			customFields: 0
		};

		componentsToCount.forEach(c => {
			counts[c.type]++;
			// Count custom fields separately (fields ending with __c)
			if (c.type === 'field' && c.apiName.includes('__c')) {
				counts.customFields++;
			}
		});

		return counts;
	});

	// Update counts cache after componentCounts is computed
	$effect(() => {
		componentCountsCache = {
			key: `${components.length}-${showSystemComponents}-${hideExistingComponents}`,
			result: componentCounts
		};
	});

	// Get components for the current tab (filtered by type and custom/system)
	const currentTabComponents = $derived(() => {
		let filtered = components;

		// Filter by custom/system components
		if (!showSystemComponents) {
			filtered = filtered.filter(c => isCustomComponent(c));
		}

		// Filter by type
		if (selectedTab !== 'all') {
			if (selectedTab === 'customFields') {
				// Show only custom fields (fields with __c in apiName)
				filtered = filtered.filter(c => c.type === 'field' && c.apiName.includes('__c'));
			} else {
				filtered = filtered.filter(c => c.type === selectedTab);
			}
		}

		return filtered;
	});

	// Separate components that exist in both orgs from those that don't
	// PERFORMANCE: Simple derived without cache mutation
	const componentsExistingInBoth = $derived.by(() => {
		const existsInBoth = filteredComponents.filter(c => c.existsInBoth);

		// DEBUG: Log a sample field from exists in both
		const sampleField = existsInBoth.find(c => c.type === 'field' && c.name === 'PrecoFormatado');
		if (sampleField) {
			console.log('📋 SAMPLE from EXISTS IN BOTH:', {
				name: sampleField.name,
				apiName: sampleField.apiName,
				role: role
			});
		}

		return existsInBoth;
	});

	const componentsToMigrate = $derived.by(() => {
		const toMigrate = filteredComponents.filter(c => !c.existsInBoth);

		// DEBUG: Log a sample field from to migrate
		const sampleField = toMigrate.find(c => c.type === 'field' && c.name === 'PrecoFormatado');
		if (sampleField) {
			console.log('📋 SAMPLE from TO MIGRATE:', {
				name: sampleField.name,
				apiName: sampleField.apiName,
				role: role
			});
		}

		return toMigrate;
	});

	// Get selectable components (now includes components that exist in both orgs)
	const selectableTabComponents = $derived(() => {
		return currentTabComponents();
	});

	// Count selected components in current tab (includes all components)
	// PERFORMANCE: Simple derived without cache mutation
	const currentTabSelectedCount = $derived.by(() => {
		const selectable = selectableTabComponents();
		return selectable.filter(c => selectedIds.has(c.id)).length;
	});

	// Count selected components in current filter (respects both type filter and search, only selectable)
	// PERFORMANCE: Simple derived without cache mutation
	const currentFilterSelectedCount = $derived.by(() => {
		return filteredComponents.filter(c => !c.existsInBoth && selectedIds.has(c.id)).length;
	});

	// Calculate checkbox state for select all (based on current tab, only selectable components)
	const allSelected = $derived(() => {
		const selectable = selectableTabComponents();
		return selectable.length > 0 && currentTabSelectedCount === selectable.length;
	});

	const someSelected = $derived(() => {
		const count = currentTabSelectedCount;
		const total = selectableTabComponents().length;
		return count > 0 && count < total;
	});

	// Handle select all checkbox toggle (only for current tab, only selectable components)
	function handleSelectAllToggle() {
		const selectable = selectableTabComponents();

		if (allSelected()) {
			// Deselect all selectable components in current tab
			selectable.forEach(component => {
				if (selectedIds.has(component.id)) {
					onToggleComponent(component.id);
				}
			});
		} else {
			// Select all selectable components in current tab
			selectable.forEach(component => {
				if (!selectedIds.has(component.id)) {
					onToggleComponent(component.id);
				}
			});
		}
	}
</script>

<div class="space-y-4 h-full flex flex-col">
	<!-- Organization Card -->
	<OrganizationCard {organization} {role} />

	<!-- Panel Header -->
	<div class="space-y-3">
		<!-- Filter and Search Row -->
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
					{:else if selectedTab === 'customFields'}
						Custom Fields ({componentCounts.customFields})
					{:else if selectedTab === 'trigger'}
						Trigger ({componentCounts.trigger})
					{:else if selectedTab === 'visualforce'}
						Visualforce ({componentCounts.visualforce})
					{:else if selectedTab === 'flow'}
						Flow ({componentCounts.flow})
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
					<Select.Item value="customFields">
						Custom Fields ({componentCounts.customFields})
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
					placeholder="Search your created components"
					class="pl-9 h-9"
				/>
			</div>
		</div>

		<!-- Selection Summary and Actions (only shown when components are selected) -->
		<!-- COMMENTED OUT: Replaced with checkbox-based select all control
		{#if hasSelection}
			<div class="flex items-center justify-between p-2 bg-muted rounded-lg">
				<div class="flex items-center gap-3">
					<p class="text-xs font-medium">
						{selectedCount()} of {componentCounts.all} selected
					</p>
				</div>
				<div class="flex gap-1.5">
					<Button
						variant="ghost"
						size="sm"
						class="h-7 text-xs px-2"
						onclick={() => onSelectAll(orgId)}
					>
						Select All
					</Button>
					<Button
						variant="ghost"
						size="sm"
						class="h-7 text-xs px-2"
						onclick={() => onDeselectAll(orgId)}
					>
						Deselect All
					</Button>
				</div>
			</div>
		{/if}
		-->
	</div>

	<!-- Select All Checkbox and Component List -->
	<div class="flex-1 flex flex-col min-h-0">
		<!-- Select All Checkbox, Selection Count, Timestamp, and Refresh Button -->
		<div class="flex items-start justify-between mb-2">
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
					{currentFilterSelectedCount} of {filteredComponents.length} selected
				</span>
			</button>

			<div class="flex items-center gap-2">
				{#if lastUpdated}
					<span class="text-xs text-muted-foreground">
						Updated: {formatTimestamp(lastUpdated)}
					</span>
				{/if}

				{#if onRefresh}
					<Button
						variant="ghost"
						size="sm"
						onclick={onRefresh}
						disabled={isRefreshing}
						class="h-8"
					>
						<RefreshCw class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}" />
					</Button>
				{/if}

				<!-- Options Menu -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="sm" class="h-8 w-8 p-0">
								<Ellipsis class="h-4 w-4" />
								<span class="sr-only">Component options</span>
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="end" class="w-56">
						<DropdownMenu.CheckboxItem bind:checked={showSystemComponents}>
							Show System Components
						</DropdownMenu.CheckboxItem>
						<DropdownMenu.CheckboxItem bind:checked={hideExistingComponents}>
							Hide Existing Components
						</DropdownMenu.CheckboxItem>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</div>

		<!-- Component List -->
		{#if isRefreshing}
			<!-- Skeleton Loading State -->
			<div class="space-y-2">
				{#each Array(8) as _}
					<div class="flex items-start gap-2 p-2.5 rounded-lg border">
						<Skeleton class="size-4 rounded mt-0.5 flex-shrink-0" />
						<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
							<div class="flex-1 min-w-0 space-y-2">
								<Skeleton class="h-4 w-3/4" />
								<Skeleton class="h-3 w-full" />
							</div>
							<Skeleton class="h-5 w-16 flex-shrink-0" />
						</div>
					</div>
				{/each}
			</div>
		{:else if filteredComponents.length === 0}
			<div class="text-center py-8 text-muted-foreground">
				<p class="text-sm">No components found</p>
			</div>
		{:else}
			<!-- Scrollable container for both accordion and main list -->
			<div class="flex-1 min-h-0 overflow-y-scroll scrollbar-white">
				<!-- Accordion for components that exist in both orgs -->
				{#if !hideExistingComponents && componentsExistingInBoth.length > 0}
					<!-- Full-width wrapper with bottom border -->
					<div class="mb-3 -mx-4 bg-muted/30 border-b">
						<Collapsible.Root bind:open={existingComponentsOpen}>
							<Collapsible.Trigger class="w-full">
								<div class="flex items-center gap-2 p-2.5 bg-muted/30 transition-colors" style="padding-left: 2.5rem; padding-right: 1rem;">
									<div class="flex-1 min-w-0 flex items-center justify-between gap-3">
										<span class="text-sm font-medium opacity-70">
											{componentsExistingInBoth.length} already in both orgs
										</span>
										<div class="flex items-center gap-1.5 flex-shrink-0">
											{#if existingComponentsOpen}
												<Minus class="h-4 w-4 opacity-70" />
											{:else}
												<Plus class="h-4 w-4 opacity-70" />
											{/if}
										</div>
									</div>
								</div>
							</Collapsible.Trigger>
							<Collapsible.Content>
								<div class="pb-3">
									{#each componentsExistingInBoth as component}
										<div>
											<!-- Main component item -->
											<div class="group w-full flex items-start gap-2 p-2.5 border-b transition-colors {isSelected(component.id) ? 'bg-accent/30' : ''}" style="padding-left: 2.5rem; padding-right: 1rem;">
												<button
													onclick={() => {
														// Components that exist in both orgs cannot be toggled
														// They are shown as checked/disabled for visual indication only
														if (!autoSelectedIds.has(component.id)) {
															onToggleComponent(component.id);
														}
													}}
													class="flex-shrink-0 mt-0.5 {autoSelectedIds.has(component.id) ? 'cursor-not-allowed' : ''}"
													type="button"
													aria-label="Select component"
													disabled={autoSelectedIds.has(component.id)}
												>
													<Checkbox
														checked={autoSelectedIds.has(component.id) || isSelected(component.id)}
														disabled={autoSelectedIds.has(component.id)}
														class={autoSelectedIds.has(component.id) ? 'opacity-60' : ''}
													/>
												</button>

												<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
													<button
														onclick={() => {
															// Prevent deselection of auto-selected components
															if (!autoSelectedIds.has(component.id)) {
																onToggleComponent(component.id);
															}
														}}
														class="flex-1 min-w-0 text-left"
														type="button"
													>
														<p class="font-medium text-sm truncate">{component.name}</p>
														{#if component.description}
															<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
														{/if}
													</button>
													<div class="flex items-center gap-1.5 flex-shrink-0">
														<!-- Show parent object name for fields when in Custom Fields tab -->
														{#if selectedTab === 'customFields' && component.type === 'field'}
															<Badge variant="secondary" class="text-xs font-mono">
																{getParentObjectName(component)}
															</Badge>
														{:else}
															<Badge variant="outline" class="text-xs font-mono">
																{capitalizeFirst(component.type)}
															</Badge>
														{/if}
														<Tooltip.Root>
															<Tooltip.Trigger>
																{#snippet child({ props })}
																	<button
																		{...props}
																		onclick={(e) => {
																			e.stopPropagation();
																			openDetailsModal(component);
																		}}
																		class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 p-1 -m-1"
																		type="button"
																	>
																		<Maximize2 class="h-3.5 w-3.5" />
																	</button>
																{/snippet}
															</Tooltip.Trigger>
															<Tooltip.Content side="top">
																<span class="text-xs">View details</span>
															</Tooltip.Content>
														</Tooltip.Root>
													</div>
												</div>
											</div>

											<!-- Nested custom fields (if object is expanded) -->
											{#if isCustomObject(component) && isObjectExpanded(component.apiName)}
												{@const customFields = getCustomFieldsForObject(component.apiName)}
												{#if customFields.length > 0}
													<div class="ml-10 border-l-2 border-muted pl-3">
														{#each customFields as field}
															<div class="group w-full flex items-start gap-2 p-2 border-b border-dashed transition-colors {isSelected(field.id) ? 'bg-accent/20' : ''}">
																<button
																	onclick={() => {
																		// Components that exist in both orgs cannot be toggled
																		// They are shown as checked/disabled for visual indication only
																		if (!autoSelectedIds.has(field.id)) {
																			onToggleComponent(field.id);
																		}
																	}}
																	class="flex-shrink-0 mt-0.5 {autoSelectedIds.has(field.id) ? 'cursor-not-allowed' : ''}"
																	type="button"
																	aria-label="Select field"
																	disabled={autoSelectedIds.has(field.id)}
																>
																	<Checkbox
																		checked={autoSelectedIds.has(field.id) || isSelected(field.id)}
																		disabled={autoSelectedIds.has(field.id)}
																		class={autoSelectedIds.has(field.id) ? 'opacity-60' : ''}
																	/>
																</button>
																<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
																	<button
																		onclick={() => {
																			// Prevent deselection of auto-selected components
																			if (!autoSelectedIds.has(field.id)) {
																				onToggleComponent(field.id);
																			}
																		}}
																		class="flex-1 min-w-0 text-left"
																		type="button"
																	>
																		<p class="font-medium text-xs truncate">{field.name}</p>
																		{#if field.description}
																			<p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{field.description}</p>
																		{/if}
																	</button>
																	<div class="flex items-center gap-1.5 flex-shrink-0">
																		<Badge variant="outline" class="text-xs font-mono">
																			Field
																		</Badge>
																		<Tooltip.Root>
																			<Tooltip.Trigger>
																				{#snippet child({ props })}
																					<button
																						{...props}
																						onclick={(e) => {
																							e.stopPropagation();
																							openDetailsModal(field);
																						}}
																						class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 p-1 -m-1"
																						type="button"
																					>
																						<Maximize2 class="h-3.5 w-3.5" />
																					</button>
																				{/snippet}
																			</Tooltip.Trigger>
																			<Tooltip.Content side="top">
																				<span class="text-xs">View details</span>
																			</Tooltip.Content>
																		</Tooltip.Root>
																	</div>
																</div>
															</div>
														{/each}
													</div>
												{/if}
											{/if}
										</div>
									{/each}
								</div>
							</Collapsible.Content>
						</Collapsible.Root>
					</div>
				{/if}

				<!-- Main component list (components to migrate) -->
				<div class="-mx-4">
					{#each componentsToMigrate as component}
						<div>
							<!-- Main component item -->
							<div class="group w-full flex items-start gap-2 p-2.5 px-4 border-b transition-colors {isSelected(component.id) ? 'bg-accent/30' : ''}">
								<!-- Expand/collapse button for custom objects -->
								{#if isCustomObject(component)}
									<button
										onclick={(e) => {
											e.stopPropagation();
											toggleObjectExpansion(component.apiName);
										}}
										class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-all mt-0.5"
										type="button"
										aria-label="Toggle fields"
									>
										<ChevronRight class="h-4 w-4 transition-transform {isObjectExpanded(component.apiName) ? 'rotate-90' : ''}" />
									</button>
								{:else}
									<div class="w-4 flex-shrink-0"></div>
								{/if}

								<button
									onclick={() => {
										// Components that exist in both orgs cannot be toggled
										// They are shown as checked/disabled for visual indication only
										if (!autoSelectedIds.has(component.id)) {
											onToggleComponent(component.id);
										}
									}}
									class="flex-shrink-0 mt-0.5 {autoSelectedIds.has(component.id) ? 'cursor-not-allowed' : ''}"
									type="button"
									aria-label="Select component"
									disabled={autoSelectedIds.has(component.id)}
								>
									<Checkbox
										checked={autoSelectedIds.has(component.id) || isSelected(component.id)}
										disabled={autoSelectedIds.has(component.id)}
										class={autoSelectedIds.has(component.id) ? 'opacity-60' : ''}
									/>
								</button>

								<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
									<button
										onclick={() => {
											// Prevent deselection of auto-selected components
											if (!autoSelectedIds.has(component.id)) {
												onToggleComponent(component.id);
											}
										}}
										class="flex-1 min-w-0 text-left"
										type="button"
									>
										<p class="font-medium text-sm truncate">{component.name}</p>
										{#if component.description}
											<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
										{/if}
									</button>
									<div class="flex items-center gap-1.5 flex-shrink-0">
										<!-- Show parent object name for fields when in Custom Fields tab -->
										{#if selectedTab === 'customFields' && component.type === 'field'}
											<Badge variant="secondary" class="text-xs font-mono">
												{getParentObjectName(component)}
											</Badge>
										{:else}
											<Badge variant="outline" class="text-xs font-mono">
												{capitalizeFirst(component.type)}
											</Badge>
										{/if}
										<Tooltip.Root>
											<Tooltip.Trigger>
												{#snippet child({ props })}
													<button
														{...props}
														onclick={(e) => {
															e.stopPropagation();
															openDetailsModal(component);
														}}
														class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 p-1 -m-1"
														type="button"
													>
														<Maximize2 class="h-3.5 w-3.5" />
													</button>
												{/snippet}
											</Tooltip.Trigger>
											<Tooltip.Content side="top">
												<span class="text-xs">View details</span>
											</Tooltip.Content>
										</Tooltip.Root>
									</div>
								</div>
							</div>

							<!-- Nested custom fields (if object is expanded) -->
							{#if isCustomObject(component) && isObjectExpanded(component.apiName)}
								{@const customFields = getCustomFieldsForObject(component.apiName)}
								{#if customFields.length > 0}
									<div class="ml-10 border-l-2 border-muted pl-3">
										{#each customFields as field}
											<div class="group w-full flex items-start gap-2 p-2 border-b border-dashed transition-colors {isSelected(field.id) ? 'bg-accent/20' : ''}">
												<button
													onclick={() => {
														// Components that exist in both orgs cannot be toggled
														// They are shown as checked/disabled for visual indication only
														if (!autoSelectedIds.has(field.id)) {
															onToggleComponent(field.id);
														}
													}}
													class="flex-shrink-0 mt-0.5 {autoSelectedIds.has(field.id) ? 'cursor-not-allowed' : ''}"
													type="button"
													aria-label="Select field"
													disabled={autoSelectedIds.has(field.id)}
												>
													<Checkbox
														checked={autoSelectedIds.has(field.id) || isSelected(field.id)}
														disabled={autoSelectedIds.has(field.id)}
														class={autoSelectedIds.has(field.id) ? 'opacity-60' : ''}
													/>
												</button>
												<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
													<button
														onclick={() => {
															// Prevent deselection of auto-selected components
															if (!autoSelectedIds.has(field.id)) {
																onToggleComponent(field.id);
															}
														}}
														class="flex-1 min-w-0 text-left"
														type="button"
													>
														<p class="font-medium text-xs truncate">{field.name}</p>
														{#if field.description}
															<p class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{field.description}</p>
														{/if}
													</button>
													<div class="flex items-center gap-1.5 flex-shrink-0">
														<Badge variant="outline" class="text-xs font-mono">
															Field
														</Badge>
														<Tooltip.Root>
															<Tooltip.Trigger>
																{#snippet child({ props })}
																	<button
																		{...props}
																		onclick={(e) => {
																			e.stopPropagation();
																			openDetailsModal(field);
																		}}
																		class="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 p-1 -m-1"
																		type="button"
																	>
																		<Maximize2 class="h-3.5 w-3.5" />
																	</button>
																{/snippet}
															</Tooltip.Trigger>
															<Tooltip.Content side="top">
																<span class="text-xs">View details</span>
															</Tooltip.Content>
														</Tooltip.Root>
													</div>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Component Details Modal -->
<ComponentDetailsModal
	component={selectedComponentForDetails}
	open={detailsModalOpen}
	onOpenChange={handleModalOpenChange}
/>
