<script lang="ts">
	import type { CachedOrganization } from '$lib/types/wizard';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card } from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Icons from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';

	interface Props {
		org: CachedOrganization;
		onRefresh?: (orgId: string) => void;
		onDelete?: (orgId: string) => void;
		onActivate?: (orgId: string) => void;
		isRefreshing?: boolean;
	}

	let { org, onRefresh, onDelete, onActivate, isRefreshing = false }: Props = $props();

	// Get the icon component
	const IconComponent = org.icon && org.icon in Icons ? Icons[org.icon as keyof typeof Icons] : Icons.Cloud;

	// Format last synced time
	const lastSyncedText = $derived(() => {
		if (!org.last_synced_at) return 'Never synced';
		try {
			return formatDistanceToNow(new Date(org.last_synced_at), { addSuffix: true });
		} catch {
			return 'Unknown';
		}
	});

	// Calculate total components
	const totalComponents = $derived(() => {
		if (!org.component_counts) return 0;
		return Object.values(org.component_counts).reduce((sum, count) => sum + (count || 0), 0);
	});

	// Get org type badge variant
	const orgTypeBadgeVariant = $derived(() => {
		switch (org.org_type) {
			case 'production':
				return 'destructive';
			case 'sandbox':
				return 'default';
			case 'developer':
				return 'secondary';
			case 'scratch':
				return 'outline';
			default:
				return 'default';
		}
	});
</script>

<Card.Root class="relative overflow-hidden">
	<!-- Color accent bar -->
	<div class="absolute left-0 top-0 bottom-0 w-1" style="background-color: {org.color || '#6366f1'}"></div>
	
	<Card.Header class="pl-6">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-3">
				<!-- Icon -->
				<div 
					class="flex h-12 w-12 items-center justify-center rounded-lg"
					style="background-color: {org.color || '#6366f1'}20"
				>
					<svelte:component 
						this={IconComponent} 
						class="h-6 w-6" 
						style="color: {org.color || '#6366f1'}"
					/>
				</div>
				
				<!-- Org info -->
				<div>
					<div class="flex items-center gap-2">
						<h3 class="font-semibold text-lg">{org.org_name}</h3>
						{#if org.is_active}
							<Badge variant="default" class="text-xs">Active</Badge>
						{/if}
					</div>
					<p class="text-sm text-muted-foreground">{org.instance_url}</p>
				</div>
			</div>

			<!-- Actions menu -->
			<DropdownMenu.Root>
				<DropdownMenu.Trigger asChild let:builder>
					<Button builders={[builder]} variant="ghost" size="icon">
						<Icons.MoreVertical class="h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end">
					{#if !org.is_active && onActivate}
						<DropdownMenu.Item on:click={() => onActivate?.(org.id)}>
							<Icons.CheckCircle class="mr-2 h-4 w-4" />
							Set as Active
						</DropdownMenu.Item>
					{/if}
					{#if onRefresh}
						<DropdownMenu.Item on:click={() => onRefresh?.(org.id)} disabled={isRefreshing}>
							<Icons.RefreshCw class="mr-2 h-4 w-4" class:animate-spin={isRefreshing} />
							Refresh Data
						</DropdownMenu.Item>
					{/if}
					{#if onDelete}
						<DropdownMenu.Separator />
						<DropdownMenu.Item 
							on:click={() => onDelete?.(org.id)}
							class="text-destructive focus:text-destructive"
						>
							<Icons.Trash2 class="mr-2 h-4 w-4" />
							Delete
						</DropdownMenu.Item>
					{/if}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</Card.Header>

	<Card.Content class="pl-6">
		<div class="space-y-3">
			<!-- Badges -->
			<div class="flex flex-wrap gap-2">
				<Badge variant={orgTypeBadgeVariant()}>
					{org.org_type.charAt(0).toUpperCase() + org.org_type.slice(1)}
				</Badge>
				<Badge variant="outline">
					<Icons.Package class="mr-1 h-3 w-3" />
					{totalComponents()} components
				</Badge>
			</div>

			<!-- Last synced -->
			<div class="flex items-center gap-2 text-sm text-muted-foreground">
				<Icons.Clock class="h-3 w-3" />
				<span>Last synced: {lastSyncedText()}</span>
			</div>

			<!-- Component counts (if available) -->
			{#if org.component_counts && totalComponents() > 0}
				<div class="grid grid-cols-2 gap-2 text-xs">
					{#if org.component_counts.lwc}
						<div class="flex items-center gap-1">
							<Icons.Zap class="h-3 w-3 text-yellow-500" />
							<span>{org.component_counts.lwc} LWC</span>
						</div>
					{/if}
					{#if org.component_counts.apex}
						<div class="flex items-center gap-1">
							<Icons.Code class="h-3 w-3 text-blue-500" />
							<span>{org.component_counts.apex} Apex</span>
						</div>
					{/if}
					{#if org.component_counts.objects}
						<div class="flex items-center gap-1">
							<Icons.Database class="h-3 w-3 text-green-500" />
							<span>{org.component_counts.objects} Objects</span>
						</div>
					{/if}
					{#if org.component_counts.triggers}
						<div class="flex items-center gap-1">
							<Icons.Workflow class="h-3 w-3 text-purple-500" />
							<span>{org.component_counts.triggers} Triggers</span>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>

