<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Search } from '@lucide/svelte';
	import type { ComponentType, SalesforceComponent } from '$lib/types/salesforce';
	import VirtualList from '$lib/components/ui/VirtualList.svelte';

	interface Props {
		components: SalesforceComponent[];
		selectedIds: Set<string>;
		orgName: string;
		orgColor?: string;
		onToggleComponent: (componentId: string) => void;
		isSelected: (componentId: string) => boolean;
	}

	let { 
		components, 
		selectedIds, 
		orgName, 
		orgColor,
		onToggleComponent, 
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
</script>

<div class="space-y-4 h-full flex flex-col">
	<!-- Panel Header -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div 
					class="w-3 h-3 rounded-full"
					style="background-color: {orgColor || '#6b7280'};"
				></div>
				<h3 class="font-medium text-sm">{orgName}</h3>
			</div>
			<Badge variant="outline" class="text-xs">
				{componentCounts.all} total
			</Badge>
		</div>

		<!-- Search -->
		<div class="relative">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input
				bind:value={searchQuery}
				placeholder="Search components..."
				class="pl-9 h-9"
			/>
		</div>

		<!-- Selection Summary -->
		<div class="flex items-center justify-between p-2 bg-muted rounded-lg">
			<p class="text-xs font-medium">
				{selectedCount()} selected
			</p>
		</div>
	</div>

	<!-- Component Tabs -->
	<Tabs.Root bind:value={selectedTab} class="flex-1 flex flex-col min-h-0">
		<Tabs.List class="grid w-full grid-cols-4 h-9">
			<Tabs.Trigger value="all" class="text-xs">
				All ({componentCounts.all})
			</Tabs.Trigger>
			<Tabs.Trigger value="lwc" class="text-xs">
				LWC ({componentCounts.lwc})
			</Tabs.Trigger>
			<Tabs.Trigger value="apex" class="text-xs">
				Apex ({componentCounts.apex})
			</Tabs.Trigger>
			<Tabs.Trigger value="object" class="text-xs">
				Obj ({componentCounts.object})
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
							class="w-full flex items-start gap-2 p-2.5 mb-2 rounded-lg border hover:bg-accent transition-colors text-left"
						>
							<Checkbox checked={isSelected(component.id)} class="mt-0.5" />
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<Badge variant="outline" class="text-xs">
										{component.type.toUpperCase()}
									</Badge>
									<p class="font-medium text-sm truncate">{component.name}</p>
								</div>
								<p class="text-xs text-muted-foreground truncate">{component.apiName}</p>
								{#if component.description}
									<p class="text-xs text-muted-foreground mt-1 line-clamp-2">{component.description}</p>
								{/if}
								<div class="flex items-center gap-2 mt-1">
									<span class="text-xs text-muted-foreground">
										{component.dependencies.length} dep{component.dependencies.length !== 1 ? 's' : ''}
									</span>
								</div>
							</div>
						</button>
					{/snippet}
				</VirtualList>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

