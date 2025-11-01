<script lang="ts">
	import type { CachedOrganization } from '$lib/types/wizard';
	import OrgCard from './OrgCard.svelte';
	import OrgCardSkeleton from './OrgCardSkeleton.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Icons from '@lucide/svelte';

	interface Props {
		orgs: CachedOrganization[];
		isLoading?: boolean;
		hasLoaded?: boolean;
		error?: string | null;
		onRefresh?: (orgId: string) => void;
		onDelete?: (orgId: string) => void;
		onActivate?: (orgId: string) => void;
		onConnectNew?: () => void;
		refreshingOrgId?: string | null;
	}

	let {
		orgs,
		isLoading = false,
		hasLoaded = false,
		error = null,
		onRefresh,
		onDelete,
		onActivate,
		onConnectNew,
		refreshingOrgId = null
	}: Props = $props();
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold">Connected Organizations</h3>
			<p class="text-sm text-muted-foreground">
				{orgs.length} {orgs.length === 1 ? 'organization' : 'organizations'} connected
			</p>
		</div>
		{#if onConnectNew}
			<Button on:click={onConnectNew} variant="outline">
				<Icons.Plus class="mr-2 h-4 w-4" />
				Connect New Org
			</Button>
		{/if}
	</div>

	<!-- Error message -->
	{#if error}
		<div class="rounded-lg border border-destructive bg-destructive/10 p-4">
			<div class="flex items-center gap-2">
				<Icons.AlertCircle class="h-4 w-4 text-destructive" />
				<p class="text-sm text-destructive">{error}</p>
			</div>
		</div>
	{/if}

	<!-- Loading state -->
	{#if isLoading || !hasLoaded}
		<div class="grid gap-4 md:grid-cols-2">
			{#each Array(2) as _}
				<OrgCardSkeleton />
			{/each}
		</div>
	{:else if orgs.length === 0}
		<!-- Empty state -->
		<div class="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
			<Icons.Cloud class="h-12 w-12 text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold mb-2">No Organizations Connected</h3>
			<p class="text-sm text-muted-foreground mb-4 max-w-sm">
				Connect your first Salesforce organization to get started with the migration wizard.
			</p>
			{#if onConnectNew}
				<Button on:click={onConnectNew}>
					<Icons.Plus class="mr-2 h-4 w-4" />
					Connect Organization
				</Button>
			{/if}
		</div>
	{:else}
		<!-- Orgs grid -->
		<div class="grid gap-4 md:grid-cols-2">
			{#each orgs as org (org.id)}
				<OrgCard 
					{org}
					onRefresh={onRefresh}
					onDelete={onDelete}
					onActivate={onActivate}
					isRefreshing={refreshingOrgId === org.id}
				/>
			{/each}
		</div>
	{/if}
</div>

