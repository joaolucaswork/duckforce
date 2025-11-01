<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Database, Cloud, Code, Zap } from '@lucide/svelte';
	import type { CachedOrganization } from '$lib/types/wizard';

	interface Props {
		organization: CachedOrganization;
		role: 'source' | 'target';
	}

	let { organization, role }: Props = $props();

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

	const Icon = $derived(getOrgIcon(organization.org_type));
</script>

<Card.Root
	class="p-4 transition-all !border-0 !outline-none !ring-0 !ring-offset-0 shadow-none ring-2 ring-offset-2 w-full"
	style={`ring-color: ${organization.color || '#6b7280'};`}
>
	<div class="space-y-3">
		<!-- Header with icon and role badge -->
		<div class="flex items-start justify-between gap-2">
			<div class="flex items-center gap-2 flex-1 min-w-0">
				<div
					class="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
					style="background-color: {organization.color || '#6b7280'}20;"
				>
					<Icon
						class="w-4 h-4"
						style="color: {organization.color || '#6b7280'};"
					/>
				</div>
				<div class="flex-1 min-w-0">
					<h4 class="font-medium text-sm truncate font-mono" title={organization.org_name}>
						{organization.org_name}
					</h4>
					<p class="text-xs text-muted-foreground">
						{getOrgTypeLabel(organization.org_type)}
					</p>
				</div>
			</div>

			<Badge
				variant={role === 'source' ? 'default' : 'secondary'}
				class="text-xs font-mono flex-shrink-0"
				style={role === 'source' ? `background-color: ${organization.color || '#6b7280'}; color: white;` : `background-color: ${organization.color || '#6b7280'}40; color: ${organization.color || '#6b7280'};`}
			>
				{role === 'source' ? 'Source' : 'Target'}
			</Badge>
		</div>

		<!-- Component count -->
		<div class="flex items-center gap-2 flex-wrap">
			{#if organization.component_counts}
				{@const totalComponents = (organization.component_counts.lwc || 0) + 
					(organization.component_counts.apex || 0) + 
					(organization.component_counts.objects || 0) + 
					(organization.component_counts.fields || 0) + 
					(organization.component_counts.triggers || 0) + 
					(organization.component_counts.visualforce || 0) + 
					(organization.component_counts.flows || 0)}
				
				{#if totalComponents > 0}
					<Badge variant="outline" class="text-xs">
						{totalComponents} component{totalComponents !== 1 ? 's' : ''}
					</Badge>
				{/if}
			{/if}
		</div>
	</div>
</Card.Root>

