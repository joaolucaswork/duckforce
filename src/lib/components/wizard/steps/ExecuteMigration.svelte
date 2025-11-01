<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Progress } from '$lib/components/ui/progress';
	import {
		Loader2,
		CheckCircle2,
		XCircle,
		AlertCircle,
		Rocket,
		ArrowRight
	} from '@lucide/svelte';

	const migrationStatus = $derived(wizardStore.state.migrationExecution.status);
	const progress = $derived(wizardStore.state.migrationExecution.progress);
	const currentComponent = $derived(wizardStore.state.migrationExecution.currentComponent);
	const migratedComponents = $derived(wizardStore.state.migrationExecution.migratedComponents);
	const failedComponents = $derived(wizardStore.state.migrationExecution.failedComponents);
	const error = $derived(wizardStore.state.migrationExecution.error);

	const selectedComponents = $derived(() => {
		const selectedIds = wizardStore.state.componentSelection.selectedIds;
		return wizardStore.state.componentSelection.availableComponents.filter(c =>
			selectedIds.has(c.id)
		);
	});

	const discoveredDependencies = $derived(wizardStore.state.dependencyReview.discoveredDependencies);

	const allComponentsToMigrate = $derived(() => {
		const all = [...selectedComponents(), ...discoveredDependencies];
		const unique = all.filter(
			(component, index, self) => index === self.findIndex(c => c.id === component.id)
		);
		return unique;
	});

	const sourceOrg = $derived(wizardStore.state.sourceOrg.org);
	const targetOrg = $derived(wizardStore.state.targetOrg.org);

	async function startMigration() {
		wizardStore.setMigrationStatus('preparing');
		
		// Simulate preparation
		await new Promise(resolve => setTimeout(resolve, 1000));

		wizardStore.setMigrationStatus('migrating');

		const components = allComponentsToMigrate();
		const totalComponents = components.length;

		// Simulate migrating each component
		for (let i = 0; i < components.length; i++) {
			const component = components[i];
			wizardStore.setCurrentMigratingComponent(component.id);

			// Simulate migration time
			await new Promise(resolve => setTimeout(resolve, 800));

			// Simulate 90% success rate
			if (Math.random() > 0.1) {
				wizardStore.addMigratedComponent(component.id);
			} else {
				wizardStore.addFailedComponent(component.id, 'Simulated deployment error');
			}

			// Update progress
			const newProgress = Math.round(((i + 1) / totalComponents) * 100);
			wizardStore.setMigrationProgress(newProgress);
		}

		wizardStore.setCurrentMigratingComponent(null);
		wizardStore.setMigrationStatus('completed');
	}

	function getCurrentComponentName(): string {
		if (!currentComponent) return '';
		const component = allComponentsToMigrate().find(c => c.id === currentComponent);
		return component?.name || '';
	}
</script>

<div class="space-y-6">
	{#if migrationStatus === 'idle'}
		<!-- Ready to Migrate -->
		<Alert.Root>
			<Rocket class="h-4 w-4" />
			<Alert.Title>Ready to Migrate</Alert.Title>
			<Alert.Description>
				Review the migration summary below and click "Start Migration" when ready.
			</Alert.Description>
		</Alert.Root>

		<!-- Migration Summary -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Migration Summary</Card.Title>
				<Card.Description>Components will be migrated from source to target org</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<p class="text-sm font-medium">Source Org</p>
						<div class="p-3 rounded-lg border bg-muted/50">
							<p class="font-medium">{sourceOrg?.name}</p>
							<p class="text-xs text-muted-foreground">{sourceOrg?.instanceUrl}</p>
						</div>
					</div>
					<div class="space-y-2">
						<p class="text-sm font-medium">Target Org</p>
						<div class="p-3 rounded-lg border bg-muted/50">
							<p class="font-medium">{targetOrg?.name}</p>
							<p class="text-xs text-muted-foreground">{targetOrg?.instanceUrl}</p>
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<p class="text-sm font-medium">Components to Migrate</p>
					<div class="p-3 rounded-lg border bg-muted/50">
						<p class="text-2xl font-bold">{allComponentsToMigrate().length}</p>
						<p class="text-xs text-muted-foreground">
							{selectedComponents().length} selected + {discoveredDependencies.length} dependencies
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<div class="flex justify-center pt-4">
			<Button size="lg" onclick={startMigration}>
				<Rocket class="mr-2 h-4 w-4" />
				Start Migration
			</Button>
		</div>

	{:else if migrationStatus === 'preparing'}
		<!-- Preparing -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center space-y-4">
				<Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
				<div>
					<p class="font-medium">Preparing Migration</p>
					<p class="text-sm text-muted-foreground">Setting up deployment package...</p>
				</div>
			</div>
		</div>

	{:else if migrationStatus === 'migrating'}
		<!-- Migrating -->
		<Alert.Root>
			<Loader2 class="h-4 w-4 animate-spin" />
			<Alert.Title>Migration in Progress</Alert.Title>
			<Alert.Description>
				Please do not close this window. Migration is currently running...
			</Alert.Description>
		</Alert.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Migration Progress</Card.Title>
				<Card.Description>
					{migratedComponents.length + failedComponents.length} of {allComponentsToMigrate().length} components processed
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="space-y-2">
					<div class="flex items-center justify-between text-sm">
						<span>Overall Progress</span>
						<span class="font-medium">{progress}%</span>
					</div>
					<Progress value={progress} />
				</div>

				{#if currentComponent}
					<div class="flex items-center gap-2 text-sm">
						<Loader2 class="h-4 w-4 animate-spin text-primary" />
						<span>Migrating: <strong>{getCurrentComponentName()}</strong></span>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-4 pt-4">
					<div class="flex items-center gap-2">
						<CheckCircle2 class="h-4 w-4 text-green-600" />
						<span class="text-sm">
							<strong>{migratedComponents.length}</strong> succeeded
						</span>
					</div>
					<div class="flex items-center gap-2">
						<XCircle class="h-4 w-4 text-red-600" />
						<span class="text-sm">
							<strong>{failedComponents.length}</strong> failed
						</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

	{:else if migrationStatus === 'completed'}
		<!-- Completed -->
		<Alert.Root class="border-green-200 bg-green-50">
			<CheckCircle2 class="h-4 w-4 text-green-600" />
			<Alert.Title class="text-green-900">Migration Completed!</Alert.Title>
			<Alert.Description class="text-green-800">
				Your components have been migrated to the target org.
			</Alert.Description>
		</Alert.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Migration Results</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="grid grid-cols-3 gap-4">
					<div class="text-center p-4 rounded-lg border">
						<p class="text-3xl font-bold">{allComponentsToMigrate().length}</p>
						<p class="text-sm text-muted-foreground">Total</p>
					</div>
					<div class="text-center p-4 rounded-lg border border-green-200 bg-green-50">
						<p class="text-3xl font-bold text-green-700">{migratedComponents.length}</p>
						<p class="text-sm text-green-600">Succeeded</p>
					</div>
					<div class="text-center p-4 rounded-lg border border-red-200 bg-red-50">
						<p class="text-3xl font-bold text-red-700">{failedComponents.length}</p>
						<p class="text-sm text-red-600">Failed</p>
					</div>
				</div>

				{#if failedComponents.length > 0}
					<div class="space-y-2">
						<p class="text-sm font-medium">Failed Components</p>
						<div class="space-y-1 max-h-[150px] overflow-y-auto scrollbar-custom">
							{#each failedComponents as failed}
								{@const component = allComponentsToMigrate().find(c => c.id === failed.id)}
								<div class="p-2 rounded border border-red-200 bg-red-50 text-sm">
									<p class="font-medium text-red-900">{component?.name}</p>
									<p class="text-xs text-red-700">{failed.error}</p>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="flex justify-center gap-4 pt-4">
			<Button variant="outline" href="/">
				Back to Dashboard
			</Button>
			<Button href="/">
				View Migration Project
				<ArrowRight class="ml-2 h-4 w-4" />
			</Button>
		</div>

	{:else if migrationStatus === 'failed'}
		<!-- Failed -->
		<Alert.Root variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<Alert.Title>Migration Failed</Alert.Title>
			<Alert.Description>{error || 'An unexpected error occurred'}</Alert.Description>
		</Alert.Root>
	{/if}
</div>

