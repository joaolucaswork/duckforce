<script lang="ts">
	import type { CachedOrganization } from '$lib/types/wizard';
	import * as Select from '$lib/components/ui/select';
	import * as Icons from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';

	interface Props {
		orgs: CachedOrganization[];
		selectedOrgId: string | null;
		onSelect: (orgId: string | null) => void;
		label: string;
		placeholder?: string;
		excludeOrgId?: string | null;
		disabled?: boolean;
	}

	let { 
		orgs, 
		selectedOrgId, 
		onSelect, 
		label, 
		placeholder = 'Select an organization',
		excludeOrgId = null,
		disabled = false
	}: Props = $props();

	// Filter out excluded org
	const availableOrgs = $derived(
		excludeOrgId 
			? orgs.filter(org => org.id !== excludeOrgId)
			: orgs
	);

	// Get selected org
	const selectedOrg = $derived(
		selectedOrgId 
			? orgs.find(org => org.id === selectedOrgId)
			: null
	);

	// Get icon component for selected org
	const IconComponent = $derived(() => {
		if (!selectedOrg?.icon) return Icons.Cloud;
		return selectedOrg.icon in Icons ? Icons[selectedOrg.icon as keyof typeof Icons] : Icons.Cloud;
	});

	// Get org type badge variant
	function getOrgTypeBadgeVariant(orgType: string) {
		switch (orgType) {
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
	}

	// Get icon for org
	function getOrgIcon(org: CachedOrganization) {
		if (!org.icon || !(org.icon in Icons)) return Icons.Cloud;
		return Icons[org.icon as keyof typeof Icons];
	}
</script>

<div class="space-y-2">
	<label class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
		{label}
	</label>
	
	<Select.Root
		selected={selectedOrgId ? { value: selectedOrgId, label: selectedOrg?.org_name || '' } : undefined}
		onSelectedChange={(selected) => {
			onSelect(selected?.value || null);
		}}
		disabled={disabled || availableOrgs.length === 0}
	>
		<Select.Trigger class="w-full">
			{#if selectedOrg}
				<div class="flex items-center gap-2 w-full">
					<!-- Icon -->
					<div 
						class="flex h-6 w-6 items-center justify-center rounded"
						style="background-color: {selectedOrg.color || '#6366f1'}20"
					>
						<svelte:component 
							this={IconComponent()} 
							class="h-3 w-3" 
							style="color: {selectedOrg.color || '#6366f1'}"
						/>
					</div>
					
					<!-- Org name and type -->
					<div class="flex items-center gap-2 flex-1 min-w-0">
						<span class="truncate">{selectedOrg.org_name}</span>
						<Badge variant={getOrgTypeBadgeVariant(selectedOrg.org_type)} class="text-xs">
							{selectedOrg.org_type}
						</Badge>
					</div>
				</div>
			{:else}
				<span class="text-muted-foreground">{placeholder}</span>
			{/if}
		</Select.Trigger>
		
		<Select.Content>
			{#if availableOrgs.length === 0}
				<div class="p-4 text-center text-sm text-muted-foreground">
					No organizations available
				</div>
			{:else}
				{#each availableOrgs as org (org.id)}
					<Select.Item value={org.id} label={org.org_name}>
						<div class="flex items-center gap-2 w-full">
							<!-- Icon -->
							<div 
								class="flex h-6 w-6 items-center justify-center rounded"
								style="background-color: {org.color || '#6366f1'}20"
							>
								<svelte:component 
									this={getOrgIcon(org)} 
									class="h-3 w-3" 
									style="color: {org.color || '#6366f1'}"
								/>
							</div>
							
							<!-- Org info -->
							<div class="flex flex-col flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<span class="truncate font-medium">{org.org_name}</span>
									{#if org.is_active}
										<Badge variant="default" class="text-xs">Active</Badge>
									{/if}
								</div>
								<div class="flex items-center gap-2 text-xs text-muted-foreground">
									<Badge variant={getOrgTypeBadgeVariant(org.org_type)} class="text-xs">
										{org.org_type}
									</Badge>
									<span class="truncate">{org.instance_url}</span>
								</div>
							</div>
						</div>
					</Select.Item>
				{/each}
			{/if}
		</Select.Content>
	</Select.Root>
	
	{#if availableOrgs.length === 0}
		<p class="text-xs text-muted-foreground">
			No organizations available. Please connect an organization first.
		</p>
	{/if}
</div>

