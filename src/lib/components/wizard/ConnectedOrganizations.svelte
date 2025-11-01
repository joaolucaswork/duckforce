<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Database, Cloud, Code, Zap } from '@lucide/svelte';
	import type { CachedOrganization } from '$lib/types/wizard';

	interface Props {
		organizations: CachedOrganization[];
		sourceOrgId: string | null;
		targetOrgId: string | null;
	}

	let { organizations, sourceOrgId, targetOrgId }: Props = $props();

	// Calculate the most recent sync timestamp across all organizations
	const mostRecentSync = $derived(() => {
		const syncDates = organizations
			.map(org => org.last_synced_at)
			.filter((date): date is string => date !== null && date !== undefined)
			.map(date => new Date(date).getTime());

		if (syncDates.length === 0) return null;

		const mostRecent = Math.max(...syncDates);
		return new Date(mostRecent);
	});

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

<div class="space-y-6">
	<div class="flex items-center justify-end">
		<div class="flex items-center gap-2">
			{#if mostRecentSync()}
				<span class="text-xs text-muted-foreground">
					Last synced: {mostRecentSync()?.toLocaleDateString()}
				</span>
			{:else}
				<span class="text-xs text-amber-600">
					Not synced yet
				</span>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each organizations as org}
			{@const role = getOrgRole(org.id)}
			{@const Icon = getOrgIcon(org.org_type)}
			{@const isSelected = role !== null}

			<Card.Root
				class="p-4 transition-all !border-0 !outline-none !ring-0 !ring-offset-0 shadow-none {isSelected ? 'ring-2 ring-offset-2' : ''}"
				style={isSelected ? `ring-color: ${org.color || '#6b7280'};` : ''}
			>
				<div class="space-y-3">
					<!-- Header with icon and role badge -->
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

						{#if role}
							<Badge
								variant={getOrgRoleBadgeVariant(role)}
								class="text-xs font-mono flex-shrink-0"
								style={role === 'source' ? `background-color: ${org.color || '#6b7280'}; color: white;` : role === 'target' ? `background-color: ${org.color || '#6b7280'}40; color: ${org.color || '#6b7280'};` : ''}
							>
								{role === 'source' ? 'Source' : 'Target'}
							</Badge>
						{/if}
					</div>

					<!-- Component count -->
					<div class="flex items-center gap-2 flex-wrap">
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
				</div>
			</Card.Root>
		{/each}
	</div>
</div>

