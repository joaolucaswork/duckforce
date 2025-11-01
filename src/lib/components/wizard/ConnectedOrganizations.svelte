<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { CircleCheck, Circle, Database, Cloud, Code, Zap } from '@lucide/svelte';
	import type { CachedOrganization } from '$lib/types/wizard';

	interface Props {
		organizations: CachedOrganization[];
		sourceOrgId: string | null;
		targetOrgId: string | null;
	}

	let { organizations, sourceOrgId, targetOrgId }: Props = $props();

	function getOrgIcon(orgType: string) {
		switch (orgType) {
			case 'production':
				return Database;
			case 'sandbox':
				return Cloud;
			case 'developer':
				return Code;
			case 'scratch':
				return Zap;
			default:
				return Database;
		}
	}

	function getOrgTypeLabel(orgType: string): string {
		return orgType.charAt(0).toUpperCase() + orgType.slice(1);
	}

	function getOrgRole(orgId: string): 'source' | 'target' | null {
		if (orgId === sourceOrgId) return 'source';
		if (orgId === targetOrgId) return 'target';
		return null;
	}

	function getOrgRoleBadgeVariant(role: 'source' | 'target' | null): 'default' | 'secondary' | 'outline' {
		if (role === 'source') return 'default';
		if (role === 'target') return 'secondary';
		return 'outline';
	}
</script>

<div class="space-y-3">
	<div class="flex items-center justify-between">
		<h3 class="text-sm font-medium">Connected Organizations</h3>
		<Badge variant="outline" class="text-xs">
			{organizations.length} org{organizations.length !== 1 ? 's' : ''}
		</Badge>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
		{#each organizations as org}
			{@const role = getOrgRole(org.id)}
			{@const Icon = getOrgIcon(org.org_type)}
			{@const isSelected = role !== null}
			
			<Card.Root 
				class="p-4 transition-all {isSelected ? 'ring-2 ring-offset-2' : ''}"
				style={isSelected ? `ring-color: ${org.color || '#6b7280'};` : ''}
			>
				<div class="space-y-3">
					<!-- Header with icon and status -->
					<div class="flex items-start justify-between gap-2">
						<div class="flex items-center gap-2 flex-1 min-w-0">
							<div 
								class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
								style="background-color: {org.color || '#6b7280'}20;"
							>
								<Icon 
									class="w-4 h-4" 
									style="color: {org.color || '#6b7280'};"
								/>
							</div>
							<div class="flex-1 min-w-0">
								<h4 class="font-medium text-sm truncate font-mono" title={org.org_name}>
									{org.org_name}
								</h4>
								<p class="text-xs text-muted-foreground">
									{getOrgTypeLabel(org.org_type)}
								</p>
							</div>
						</div>
						
						{#if org.is_active}
							<CircleCheck class="w-4 h-4 text-green-500 flex-shrink-0" />
						{:else}
							<Circle class="w-4 h-4 text-muted-foreground flex-shrink-0" />
						{/if}
					</div>

					<!-- Role badges -->
					<div class="flex items-center gap-2 flex-wrap">
						{#if role}
							<Badge 
								variant={getOrgRoleBadgeVariant(role)}
								class="text-xs"
								style={role === 'source' ? `background-color: ${org.color || '#6b7280'}; color: white;` : role === 'target' ? `background-color: ${org.color || '#6b7280'}40; color: ${org.color || '#6b7280'};` : ''}
							>
								{role === 'source' ? 'Source' : 'Target'}
							</Badge>
						{/if}
						
						{#if org.component_counts}
							{@const totalComponents = (org.component_counts.lwc || 0) + 
								(org.component_counts.apex || 0) + 
								(org.component_counts.objects || 0) + 
								(org.component_counts.fields || 0) + 
								(org.component_counts.triggers || 0) + 
								(org.component_counts.visualforce || 0) + 
								(org.component_counts.flows || 0)}
							
							{#if totalComponents > 0}
								<Badge variant="outline" class="text-xs">
									{totalComponents} component{totalComponents !== 1 ? 's' : ''}
								</Badge>
							{/if}
						{/if}
					</div>

					<!-- Connection info -->
					<div class="text-xs text-muted-foreground space-y-1">
						{#if org.last_synced_at}
							<p>
								Synced: {new Date(org.last_synced_at).toLocaleDateString()}
							</p>
						{:else}
							<p class="text-amber-600">
								Not synced yet
							</p>
						{/if}
					</div>
				</div>
			</Card.Root>
		{/each}
	</div>
</div>

