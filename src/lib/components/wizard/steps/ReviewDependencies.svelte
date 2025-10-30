<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Loader2, AlertTriangle, CheckCircle2, Search as SearchIcon } from '@lucide/svelte';
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import { onMount } from 'svelte';

	const isScanning = $derived(wizardStore.state.dependencyReview.isScanning);
	const scanComplete = $derived(wizardStore.state.dependencyReview.scanComplete);
	const discoveredDependencies = $derived(wizardStore.state.dependencyReview.discoveredDependencies);
	const selectedComponents = $derived(() => {
		const selectedIds = wizardStore.state.componentSelection.selectedIds;
		return wizardStore.state.componentSelection.availableComponents.filter(c =>
			selectedIds.has(c.id)
		);
	});

	const allComponentsToMigrate = $derived(() => {
		// Combine selected components and discovered dependencies
		const all = [...selectedComponents(), ...discoveredDependencies];
		// Remove duplicates
		const unique = all.filter(
			(component, index, self) => index === self.findIndex(c => c.id === component.id)
		);
		return unique;
	});

	const dependencyStats = $derived(() => {
		return {
			selected: selectedComponents().length,
			discovered: discoveredDependencies.length,
			total: allComponentsToMigrate().length
		};
	});

	onMount(() => {
		// Auto-start dependency scan if not already done
		if (!scanComplete && !isScanning) {
			startDependencyScan();
		}
	});

	async function startDependencyScan() {
		wizardStore.setDependencyScanning(true);

		// Simulate dependency discovery
		await new Promise(resolve => setTimeout(resolve, 2000));

		try {
			// Mock: Gather all dependencies from selected components
			const dependencies = new Set<SalesforceComponent>();
			const availableComponents = wizardStore.state.componentSelection.availableComponents;

			selectedComponents().forEach(component => {
				// Add direct dependencies
				component.dependencies.forEach(dep => {
					const depComponent = availableComponents.find(c => c.id === dep.id);
					if (depComponent && !wizardStore.state.componentSelection.selectedIds.has(dep.id)) {
						dependencies.add(depComponent);
					}
				});
			});

			wizardStore.setDiscoveredDependencies(Array.from(dependencies));
		} catch (err) {
			wizardStore.setDependencyError('Failed to scan dependencies');
		}
	}

	function handleRescan() {
		startDependencyScan();
	}
</script>

<div class="space-y-6">
	{#if isScanning}
		<!-- Scanning State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center space-y-4">
				<Loader2 class="h-8 w-8 animate-spin mx-auto text-primary" />
				<div>
					<p class="font-medium">Scanning for Dependencies</p>
					<p class="text-sm text-muted-foreground">
						Analyzing {selectedComponents().length} selected component{selectedComponents().length !== 1 ? 's' : ''}...
					</p>
				</div>
			</div>
		</div>
	{:else if scanComplete}
		<!-- Scan Complete -->
		<Alert.Root class="border-green-200 bg-green-50">
			<CheckCircle2 class="h-4 w-4 text-green-600" />
			<Alert.Title class="text-green-900">Dependency Scan Complete</Alert.Title>
			<Alert.Description class="text-green-800">
				Found {discoveredDependencies.length} additional dependenc{discoveredDependencies.length !== 1 ? 'ies' : 'y'} that will be included in the migration.
			</Alert.Description>
		</Alert.Root>

		<!-- Summary Cards -->
		<div class="grid grid-cols-3 gap-4">
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Selected Components</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().selected}</Card.Title>
				</Card.Header>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Discovered Dependencies</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().discovered}</Card.Title>
				</Card.Header>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Total to Migrate</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().total}</Card.Title>
				</Card.Header>
			</Card.Root>
		</div>

		<!-- Component Lists -->
		<div class="space-y-4">
			<!-- Selected Components -->
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Selected Components</Card.Title>
							<Card.Description>
								Components you explicitly selected ({dependencyStats().selected})
							</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="space-y-2 max-h-[200px] overflow-y-auto">
						{#each selectedComponents() as component}
							<div class="flex items-center justify-between p-2 rounded border">
								<div class="flex items-center gap-2">
									<Badge variant="outline" class="text-xs">
										{component.type.toUpperCase()}
									</Badge>
									<div>
										<p class="text-sm font-medium">{component.name}</p>
										<p class="text-xs text-muted-foreground">{component.apiName}</p>
									</div>
								</div>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Discovered Dependencies -->
			{#if discoveredDependencies.length > 0}
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>Discovered Dependencies</Card.Title>
								<Card.Description>
									Required components that will be automatically included ({dependencyStats().discovered})
								</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 max-h-[200px] overflow-y-auto">
							{#each discoveredDependencies as component}
								<div class="flex items-center justify-between p-2 rounded border border-amber-200 bg-amber-50">
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="text-xs">
											{component.type.toUpperCase()}
										</Badge>
										<div>
											<p class="text-sm font-medium">{component.name}</p>
											<p class="text-xs text-muted-foreground">{component.apiName}</p>
										</div>
									</div>
									<Badge variant="secondary" class="text-xs">Required</Badge>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{:else}
				<Alert.Root>
					<CheckCircle2 class="h-4 w-4" />
					<Alert.Title>No Additional Dependencies</Alert.Title>
					<Alert.Description>
						All selected components are self-contained with no external dependencies.
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<!-- Rescan Button -->
		<div class="flex justify-center pt-4">
			<Button variant="outline" onclick={handleRescan}>
				<SearchIcon class="mr-2 h-4 w-4" />
				Rescan Dependencies
			</Button>
		</div>
	{/if}
</div>

