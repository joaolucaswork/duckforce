<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { onMount } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Alert from '$lib/components/ui/alert';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Icons from 'lucide-svelte';
	import CachedOrgsList from '../CachedOrgsList.svelte';
	import OrgSelector from '../OrgSelector.svelte';
	import SyncProgress from '../SyncProgress.svelte';
	import duckforceArrow from '$lib/assets/duckforce-arrow.png';

	// Local state
	let isLoadingOrgs = $state(false);
	let refreshingOrgId = $state<string | null>(null);
	let showDeleteConfirm = $state(false);
	let orgToDelete = $state<string | null>(null);
	let deleteError = $state<string | null>(null);
	let showSyncProgress = $state(false);
	let syncOrgName = $state('');
	let syncProgress = $state(0);
	let syncStep = $state('Initializing...');

	// Load cached orgs on mount
	onMount(async () => {
		await loadOrgs();
	});

	async function loadOrgs() {
		isLoadingOrgs = true;
		try {
			await wizardStore.loadCachedOrgs();
		} catch (error) {
			console.error('Failed to load organizations:', error);
		} finally {
			isLoadingOrgs = false;
		}
	}

	async function handleRefresh(orgId: string) {
		refreshingOrgId = orgId;
		const org = wizardStore.state.cachedOrgs.find(o => o.id === orgId);
		
		if (org) {
			syncOrgName = org.org_name;
			showSyncProgress = true;
			syncProgress = 0;
			syncStep = 'Fetching components...';
		}

		try {
			// Simulate progress updates
			const progressInterval = setInterval(() => {
				syncProgress = Math.min(syncProgress + 10, 90);
			}, 500);

			await wizardStore.refreshOrgData(orgId);
			
			clearInterval(progressInterval);
			syncProgress = 100;
			syncStep = 'Complete!';
			
			setTimeout(() => {
				showSyncProgress = false;
			}, 1000);
		} catch (error) {
			console.error('Failed to refresh org:', error);
			showSyncProgress = false;
		} finally {
			refreshingOrgId = null;
		}
	}

	async function handleActivate(orgId: string) {
		try {
			await wizardStore.switchActiveOrg(orgId);
		} catch (error) {
			console.error('Failed to activate org:', error);
		}
	}

	function handleDeleteClick(orgId: string) {
		orgToDelete = orgId;
		showDeleteConfirm = true;
		deleteError = null;
	}

	async function confirmDelete() {
		if (!orgToDelete) return;

		try {
			await wizardStore.deleteOrg(orgToDelete);
			showDeleteConfirm = false;
			orgToDelete = null;
			deleteError = null;
		} catch (error) {
			deleteError = error instanceof Error ? error.message : 'Failed to delete organization';
		}
	}

	function handleConnectNew() {
		wizardStore.connectNewOrg();
	}

	function handleSourceSelect(orgId: string | null) {
		wizardStore.setSelectedSourceOrg(orgId);
	}

	function handleTargetSelect(orgId: string | null) {
		wizardStore.setSelectedTargetOrg(orgId);
	}

	// Derived state
	const canProceed = $derived(wizardStore.canProceed());
	const selectedSourceOrg = $derived(
		wizardStore.state.selectedSourceOrgId 
			? wizardStore.state.cachedOrgs.find(o => o.id === wizardStore.state.selectedSourceOrgId)
			: null
	);
	const selectedTargetOrg = $derived(
		wizardStore.state.selectedTargetOrgId 
			? wizardStore.state.cachedOrgs.find(o => o.id === wizardStore.state.selectedTargetOrgId)
			: null
	);
</script>

<div class="space-y-8">
	<!-- Header -->
	<div>
		<h2 class="text-2xl font-bold tracking-tight">Configure Organizations</h2>
		<p class="text-muted-foreground mt-2">
			Connect your Salesforce organizations and select which ones to use for migration.
		</p>
	</div>

	<!-- Connected Organizations Section -->
	<section class="space-y-4">
		<CachedOrgsList
			orgs={wizardStore.state.cachedOrgs}
			isLoading={isLoadingOrgs}
			error={wizardStore.state.orgsError}
			onRefresh={handleRefresh}
			onDelete={handleDeleteClick}
			onActivate={handleActivate}
			onConnectNew={handleConnectNew}
			{refreshingOrgId}
		/>
	</section>

	<!-- Migration Path Selection -->
	{#if wizardStore.state.cachedOrgs.length >= 2}
		<section class="space-y-6">
			<div>
				<h3 class="text-lg font-semibold">Select Migration Path</h3>
				<p class="text-sm text-muted-foreground mt-1">
					Choose which organization to migrate from (source) and which to migrate to (target).
				</p>
			</div>

			<div class="grid gap-6 md:grid-cols-[1fr,auto,1fr] items-center">
				<!-- Source Org Selector -->
				<div>
					<OrgSelector
						orgs={wizardStore.state.cachedOrgs}
						selectedOrgId={wizardStore.state.selectedSourceOrgId}
						onSelect={handleSourceSelect}
						label="Source Organization"
						placeholder="Select source org"
						excludeOrgId={wizardStore.state.selectedTargetOrgId}
					/>
				</div>

				<!-- Arrow -->
				<div class="hidden md:flex items-center justify-center">
					<img src={duckforceArrow} alt="Migration arrow" class="h-12 w-12" />
				</div>

				<!-- Target Org Selector -->
				<div>
					<OrgSelector
						orgs={wizardStore.state.cachedOrgs}
						selectedOrgId={wizardStore.state.selectedTargetOrgId}
						onSelect={handleTargetSelect}
						label="Target Organization"
						placeholder="Select target org"
						excludeOrgId={wizardStore.state.selectedSourceOrgId}
					/>
				</div>
			</div>

			<!-- Selection Summary -->
			{#if selectedSourceOrg && selectedTargetOrg}
				<Alert.Root>
					<Icons.Info class="h-4 w-4" />
					<Alert.Title>Migration Path Configured</Alert.Title>
					<Alert.Description>
						Components will be migrated from <strong>{selectedSourceOrg.org_name}</strong> to <strong>{selectedTargetOrg.org_name}</strong>.
					</Alert.Description>
				</Alert.Root>
			{:else if wizardStore.state.selectedSourceOrgId === wizardStore.state.selectedTargetOrgId && wizardStore.state.selectedSourceOrgId}
				<Alert.Root variant="destructive">
					<Icons.AlertCircle class="h-4 w-4" />
					<Alert.Title>Invalid Selection</Alert.Title>
					<Alert.Description>
						Source and target organizations must be different.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</section>
	{:else if wizardStore.state.cachedOrgs.length === 1}
		<Alert.Root>
			<Icons.Info class="h-4 w-4" />
			<Alert.Title>Connect Another Organization</Alert.Title>
			<Alert.Description>
				You need at least two organizations to perform a migration. Please connect another organization.
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Navigation -->
	<div class="flex justify-between pt-6 border-t">
		<Button variant="outline" disabled>
			Previous
		</Button>
		<Button 
			on:click={() => wizardStore.nextStep()} 
			disabled={!canProceed}
		>
			Next: Select Components
			<Icons.ChevronRight class="ml-2 h-4 w-4" />
		</Button>
	</div>
</div>

<!-- Delete Confirmation Dialog -->
<Dialog.Root bind:open={showDeleteConfirm}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Organization</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to remove this organization from your cache? This will delete all cached component data.
			</Dialog.Description>
		</Dialog.Header>

		{#if deleteError}
			<Alert.Root variant="destructive">
				<Icons.AlertCircle class="h-4 w-4" />
				<Alert.Description>{deleteError}</Alert.Description>
			</Alert.Root>
		{/if}

		<Dialog.Footer>
			<Button variant="outline" on:click={() => { showDeleteConfirm = false; orgToDelete = null; }}>
				Cancel
			</Button>
			<Button variant="destructive" on:click={confirmDelete}>
				Delete
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Sync Progress Dialog -->
<SyncProgress
	bind:open={showSyncProgress}
	orgName={syncOrgName}
	currentStep={syncStep}
	progress={syncProgress}
/>

