<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Search, Info } from '@lucide/svelte';
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
	}

	let {
		components,
		selectedIds,
		orgId,
		organization,
		role,
		onToggleComponent,
		onSelectAll,
		onDeselectAll,
		isSelected
	}: Props = $props();

	let searchQuery = $state('');
	let selectedTab = $state<ComponentType | 'all'>('all');

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

	const selectedCount = $derived(() => {
		return components.filter(c => selectedIds.has(c.id)).length;
	});

	// Track if any components are selected for this org
	const hasSelection = $derived(selectedCount() > 0);
</script>

<div class="space-y-4 h-full flex flex-col">
	<!-- Organization Card -->
	<OrganizationCard {organization} {role} />

	<!-- Panel Header -->
	<div class="space-y-3">
		<!-- Search -->
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				bind:value={searchQuery}
				placeholder="Search components..."
				class="pl-9 h-9"
			/>
		</div>

		<!-- Selection Summary and Actions (only shown when components are selected) -->
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
	</div>

	<!-- Component Tabs -->
	<Tabs.Root bind:value={selectedTab} class="flex-1 flex flex-col min-h-0">
		<Tabs.List class="grid w-full grid-cols-4 h-9">
			<Tabs.Trigger value="all" class="text-xs">
				All <span class="font-mono">({componentCounts.all})</span>
			</Tabs.Trigger>
			<Tabs.Trigger value="lwc" class="text-xs">
				LWC <span class="font-mono">({componentCounts.lwc})</span>
			</Tabs.Trigger>
			<Tabs.Trigger value="apex" class="text-xs">
				Apex <span class="font-mono">({componentCounts.apex})</span>
			</Tabs.Trigger>
			<Tabs.Trigger value="object" class="text-xs">
				Obj <span class="font-mono">({componentCounts.object})</span>
			</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value={selectedTab} class="mt-3 flex-1 min-h-0">
			{#if filteredComponents.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					<p class="text-sm">No components found</p>
				</div>
			{:else}
				<VirtualList
					items={filteredComponents}
					itemHeight={90}
					height={500}
				>
					{#snippet children(component: SalesforceComponent)}
						<button
							onclick={() => onToggleComponent(component.id)}
							class="group w-full flex items-start gap-2 p-2.5 mb-2 rounded-lg border hover:bg-accent transition-colors text-left {isSelected(component.id) ? 'bg-accent' : ''}"
						>
							<Checkbox checked={isSelected(component.id)} class="mt-0.5" />
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<Badge variant="outline" class="text-xs font-mono">
										{component.type.toUpperCase()}
									</Badge>
									<p class="font-medium text-sm truncate">{component.name}</p>
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
									<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
								{/if}
							</div>
						</button>
					{/snippet}
				</VirtualList>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

