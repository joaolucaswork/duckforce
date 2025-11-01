<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Select from '$lib/components/ui/select';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Search, Info, RefreshCw } from '@lucide/svelte';
	import type { ComponentType, SalesforceComponent } from '$lib/types/salesforce';
	import type { CachedOrganization } from '$lib/types/wizard';
	import VirtualList from '$lib/components/ui/VirtualList.svelte';
	import OrganizationCard from './OrganizationCard.svelte';

	interface Props {
		components: SalesforceComponent[];
		selectedIds: Set<string>;
		orgId: string;
		organization: CachedOrganization;
		role: 'source' | 'target';
		onToggleComponent: (componentId: string) => void;
		onSelectAll: (orgId: string) => void;
		onDeselectAll: (orgId: string) => void;
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
		isSelected,
		onRefresh,
		isRefreshing = false,
		lastUpdated = null
	}: Props = $props();

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all'>('all');

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

	// Memoization: Store filtered results by cache key
	let filteredComponentsCache = $state<{
		key: string;
		result: SalesforceComponent[];
	} | null>(null);

	// Filter components based on search and tab with memoization
	const filteredComponents = $derived.by(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${components.length}`;

		// Check if we can use cached result
		if (filteredComponentsCache && filteredComponentsCache.key === cacheKey) {
			return filteredComponentsCache.result;
		}

		let filtered = components;

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

	// Update cache after filteredComponents is computed
	$effect(() => {
		const cacheKey = `${selectedTab}-${searchQuery}-${components.length}`;
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
		const cacheKey = components.length;

		// Return cached counts if components haven't changed
		if (componentCountsCache && componentCountsCache.key === cacheKey) {
			return componentCountsCache.result;
		}

		const counts: Record<ComponentType | 'all', number> = {
			all: components.length,
			lwc: 0,
			apex: 0,
			object: 0,
			field: 0,
			trigger: 0,
			visualforce: 0,
			flow: 0
		};

		components.forEach(c => {
			counts[c.type]++;
		});

		return counts;
	});

	// Update counts cache after componentCounts is computed
	$effect(() => {
		componentCountsCache = {
			key: components.length,
			result: componentCounts
		};
	});

	// Get components for the current tab (filtered by type)
	const currentTabComponents = $derived(() => {
		if (selectedTab === 'all') {
			return components;
		}
		return components.filter(c => c.type === selectedTab);
	});

	// Count selected components in current tab
	const currentTabSelectedCount = $derived(() => {
		return currentTabComponents().filter(c => selectedIds.has(c.id)).length;
	});

	// Count selected components in current filter (respects both type filter and search)
	const currentFilterSelectedCount = $derived(() => {
		return filteredComponents.filter(c => selectedIds.has(c.id)).length;
	});

	// Calculate checkbox state for select all (based on current tab)
	const allSelected = $derived(() => {
		const tabComponents = currentTabComponents();
		return tabComponents.length > 0 && currentTabSelectedCount() === tabComponents.length;
	});

	const someSelected = $derived(() => {
		const count = currentTabSelectedCount();
		const total = currentTabComponents().length;
		return count > 0 && count < total;
	});

	// Handle select all checkbox toggle (only for current tab)
	function handleSelectAllToggle() {
		const tabComponents = currentTabComponents();

		if (allSelected()) {
			// Deselect all components in current tab
			tabComponents.forEach(component => {
				if (selectedIds.has(component.id)) {
					onToggleComponent(component.id);
				}
			});
		} else {
			// Select all components in current tab
			tabComponents.forEach(component => {
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
						All
					{:else if selectedTab === 'lwc'}
						LWC
					{:else if selectedTab === 'apex'}
						Apex
					{:else if selectedTab === 'object'}
						Object
					{/if}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">
						All
					</Select.Item>
					<Select.Item value="lwc">
						LWC
					</Select.Item>
					<Select.Item value="apex">
						Apex
					</Select.Item>
					<Select.Item value="object">
						Object
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
					{currentFilterSelectedCount()} of {filteredComponents.length} selected
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
			<VirtualList
				items={filteredComponents}
				itemHeight={90}
				height={0}
				scrollbarClass="scrollbar-white"
			>
				{#snippet children(component: SalesforceComponent)}
						<button
							onclick={() => onToggleComponent(component.id)}
							class="group w-full flex items-start gap-2 p-2.5 mb-2 rounded-lg border hover:bg-accent transition-colors text-left {isSelected(component.id) ? 'bg-accent' : ''}"
						>
							<Checkbox checked={isSelected(component.id)} class="mt-0.5" />
							<div class="flex-1 min-w-0 flex items-start justify-between gap-3">
								<div class="flex-1 min-w-0">
									<p class="font-medium text-sm truncate">{component.name}</p>
									{#if component.description}
										<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
									{/if}
								</div>
								<div class="flex items-center gap-1.5 flex-shrink-0">
									<Badge variant="outline" class="text-xs font-mono">
										{component.type.toUpperCase()}
									</Badge>
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
							</div>
						</button>
					{/snippet}
				</VirtualList>
		{/if}
	</div>
</div>

