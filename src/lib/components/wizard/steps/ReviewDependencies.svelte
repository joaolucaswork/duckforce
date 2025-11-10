<script lang="ts">
	import { wizardStore } from '$lib/stores/wizard.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { Loader2, AlertTriangle, CheckCircle2, Search as SearchIcon, MapPin, Zap, Layout } from '@lucide/svelte';
	import type { SalesforceComponent } from '$lib/types/salesforce';
	import { onMount } from 'svelte';

	const isScanning = $derived(wizardStore.state.dependencyReview.isScanning);
	const scanComplete = $derived(wizardStore.state.dependencyReview.scanComplete);
	const customDependencies = $derived(wizardStore.state.dependencyReview.customDependencies);
	const standardObjectsWithFields = $derived(wizardStore.state.dependencyReview.standardObjectsWithFields);
	const selectedSourceOrgId = $derived(wizardStore.state.selectedSourceOrgId);

	// Store analysis notes for display
	let analysisNotes = $state<Record<string, string[]>>({});

	// Track which standard objects are expanded
	let expandedStandardObjects = $state<Set<string>>(new Set());

	// Helper function to determine if a component is custom (not system/standard)
	function isCustomComponent(component: SalesforceComponent): boolean {
		// Components with a namespace are from managed packages (not custom)
		if (component.namespace) {
			return false;
		}

		// For different component types, check specific indicators
		switch (component.type) {
			case 'object':
				// Custom objects end with __c
				return component.apiName.endsWith('__c');

			case 'field':
				// Custom fields end with __c
				return component.apiName.includes('__c');

			case 'lwc':
			case 'apex':
			case 'trigger':
			case 'visualforce':
			case 'flow':
				// These are always custom if they have no namespace
				return true;

			default:
				return true;
		}
	}

	// FIX: Only show components from the SOURCE org that are selected
	// This prevents showing components from the target org that were auto-selected
	// CRITICAL FIX: Also filter out system/standard components
	const selectedComponents = $derived(() => {
		const selectedIds = wizardStore.state.componentSelection.selectedIds;
		const allComponents = wizardStore.state.componentSelection.availableComponents;

		// Filter to only show custom components from the source org that are selected
		return allComponents.filter(c =>
			selectedIds.has(c.id) &&
			c.sourceOrgId === selectedSourceOrgId &&
			isCustomComponent(c)
		);
	});

	const allComponentsToMigrate = $derived(() => {
		// Combine selected components, custom dependencies, and custom fields on standard objects
		const all = [
			...selectedComponents(),
			...customDependencies,
			...standardObjectsWithFields.flatMap(obj => obj.customFields)
		];
		// Remove duplicates
		const unique = all.filter(
			(component, index, self) => index === self.findIndex(c => c.id === component.id)
		);
		return unique;
	});

	const dependencyStats = $derived(() => {
		const selected = selectedComponents().length;
		const customDeps = customDependencies.length;
		const standardObjectsCount = standardObjectsWithFields.length;
		const customFieldsOnStandardObjects = standardObjectsWithFields.reduce(
			(sum, obj) => sum + obj.customFields.length,
			0
		);
		return {
			selected,
			customDependencies: customDeps,
			standardObjectsWithFields: standardObjectsCount,
			customFieldsOnStandardObjects,
			total: allComponentsToMigrate().length
		};
	});

	onMount(() => {
		// Auto-start dependency scan if not already done
		if (!scanComplete && !isScanning) {
			startDependencyScan();
		}
	});

	function toggleStandardObject(objectName: string) {
		if (expandedStandardObjects.has(objectName)) {
			expandedStandardObjects.delete(objectName);
		} else {
			expandedStandardObjects.add(objectName);
		}
		expandedStandardObjects = new Set(expandedStandardObjects);
	}

	async function startDependencyScan() {
		wizardStore.setDependencyScanning(true);

		try {
			const selected = selectedComponents();

			if (selected.length === 0) {
				console.warn('[Dependency Scan] No components selected');
				wizardStore.setDiscoveredDependencies([]);
				return;
			}

			console.log(`[Dependency Scan] Starting analysis for ${selected.length} components`);

			// Get the organization ID from the first selected component
			// All selected components should be from the same source org
			const organizationId = selected[0].sourceOrgId;

			if (!organizationId) {
				throw new Error('No organization ID found for selected components');
			}

			// Call the dependency analysis API
			const response = await fetch('/api/dependencies/analyze', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					organizationId,
					componentIds: selected.map(c => c.id)
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to analyze dependencies');
			}

			const data = await response.json();

			console.log('[Dependency Scan] Analysis complete:', {
				selectedCount: data.selectedComponents.length,
				customDependenciesCount: data.customDependencies.length,
				standardObjectsWithFieldsCount: data.standardObjectsWithFields.length,
				analysisNotes: data.analysisNotes
			});

			// Store categorized dependencies and analysis notes
			wizardStore.setCategorizedDependencies(
				data.customDependencies,
				data.standardObjectsWithFields
			);
			analysisNotes = data.analysisNotes || {};

		} catch (err: any) {
			console.error('[Dependency Scan] Error:', err);
			wizardStore.setDependencyError(err.message || 'Failed to scan dependencies');
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
				Found {dependencyStats().customDependencies} custom dependenc{dependencyStats().customDependencies !== 1 ? 'ies' : 'y'}
				{#if dependencyStats().standardObjectsWithFields > 0}
					and {dependencyStats().customFieldsOnStandardObjects} custom field{dependencyStats().customFieldsOnStandardObjects !== 1 ? 's' : ''} on {dependencyStats().standardObjectsWithFields} standard object{dependencyStats().standardObjectsWithFields !== 1 ? 's' : ''}
				{/if}
				that will be included in the migration.
			</Alert.Description>
		</Alert.Root>

		<!-- Summary Cards -->
		<div class="grid grid-cols-4 gap-4">
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Selected Components</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().selected}</Card.Title>
				</Card.Header>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Custom Dependencies</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().customDependencies}</Card.Title>
				</Card.Header>
			</Card.Root>

			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Description>Standard Objects</Card.Description>
					<Card.Title class="text-3xl">{dependencyStats().standardObjectsWithFields}</Card.Title>
					<p class="text-xs text-muted-foreground mt-1">
						{dependencyStats().customFieldsOnStandardObjects} custom field{dependencyStats().customFieldsOnStandardObjects !== 1 ? 's' : ''}
					</p>
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
					<div class="space-y-2 max-h-[200px] overflow-y-auto scrollbar-custom">
						{#each selectedComponents() as component}
							<div class="flex flex-col gap-2 p-2 rounded border">
								<div class="flex items-center justify-between">
									<div class="flex items-center gap-2">
										<Badge variant="outline" class="text-xs">
											{component.type.toUpperCase()}
										</Badge>
										<div>
											<p class="text-sm font-medium">{component.name}</p>
											<p class="text-xs text-muted-foreground font-mono">{component.apiName}</p>
										</div>
									</div>
								</div>

								<!-- LWC Usage Metadata -->
								{#if component.type === 'lwc' && component.usageMetadata && component.usageMetadata.totalUsageCount > 0}
									<div class="pl-6 pt-1 border-t">
										<div class="flex items-center gap-2 mb-1">
											<MapPin class="h-3 w-3 text-muted-foreground" />
											<p class="text-xs font-medium text-muted-foreground">
												Used in {component.usageMetadata.totalUsageCount} location{component.usageMetadata.totalUsageCount !== 1 ? 's' : ''}:
											</p>
										</div>
										<div class="flex flex-wrap gap-1">
											{#each component.usageMetadata.locations as location}
												<Badge variant="secondary" class="text-xs">
													{#if location.type === 'FlexiPage'}
														<Layout class="h-3 w-3 mr-1" />
													{:else if location.type === 'Flow'}
														<Zap class="h-3 w-3 mr-1" />
													{/if}
													{location.name}
												</Badge>
											{/each}
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Custom Dependencies -->
			{#if customDependencies.length > 0}
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>Custom Dependencies</Card.Title>
								<Card.Description>
									Custom components that will be automatically included ({dependencyStats().customDependencies})
								</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 max-h-[200px] overflow-y-auto">
							{#each customDependencies as component}
								<div class="flex flex-col gap-2 p-2 rounded border border-amber-200 bg-amber-50">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<Badge variant="outline" class="text-xs">
												{component.type.toUpperCase()}
											</Badge>
											<div>
												<p class="text-sm font-medium">{component.name}</p>
												<p class="text-xs text-muted-foreground font-mono">{component.apiName}</p>
											</div>
										</div>
										<Badge variant="secondary" class="text-xs">Required</Badge>
									</div>

									<!-- LWC Usage Metadata -->
									{#if component.type === 'lwc' && component.usageMetadata && component.usageMetadata.totalUsageCount > 0}
										<div class="pl-6 pt-1 border-t border-amber-300">
											<div class="flex items-center gap-2 mb-1">
												<MapPin class="h-3 w-3 text-amber-700" />
												<p class="text-xs font-medium text-amber-700">
													Used in {component.usageMetadata.totalUsageCount} location{component.usageMetadata.totalUsageCount !== 1 ? 's' : ''}:
												</p>
											</div>
											<div class="flex flex-wrap gap-1">
												{#each component.usageMetadata.locations as location}
													<Badge variant="secondary" class="text-xs">
														{#if location.type === 'FlexiPage'}
															<Layout class="h-3 w-3 mr-1" />
														{:else if location.type === 'Flow'}
															<Zap class="h-3 w-3 mr-1" />
														{/if}
														{location.name}
													</Badge>
												{/each}
											</div>
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Standard Objects with Custom Fields -->
			{#if standardObjectsWithFields.length > 0}
				<Card.Root>
					<Card.Header>
						<div class="flex items-center justify-between">
							<div>
								<Card.Title>Standard Objects with Custom Fields</Card.Title>
								<Card.Description>
									Standard objects containing custom fields to migrate ({dependencyStats().standardObjectsWithFields} object{dependencyStats().standardObjectsWithFields !== 1 ? 's' : ''}, {dependencyStats().customFieldsOnStandardObjects} field{dependencyStats().customFieldsOnStandardObjects !== 1 ? 's' : ''})
								</Card.Description>
							</div>
						</div>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							{#each standardObjectsWithFields as stdObj}
								<div class="border rounded-lg p-3 bg-blue-50 border-blue-200">
									<button
										class="w-full flex items-center justify-between text-left"
										onclick={() => toggleStandardObject(stdObj.objectName)}
									>
										<div class="flex items-center gap-2">
											<Badge variant="outline" class="text-xs bg-blue-100 border-blue-300">
												STANDARD OBJECT
											</Badge>
											<div>
												<p class="text-sm font-medium font-mono">{stdObj.objectName}</p>
												<p class="text-xs text-muted-foreground">
													{stdObj.customFields.length} custom field{stdObj.customFields.length !== 1 ? 's' : ''} to migrate
												</p>
											</div>
										</div>
										<span class="text-xs text-muted-foreground">
											{expandedStandardObjects.has(stdObj.objectName) ? '−' : '+'}
										</span>
									</button>

									{#if expandedStandardObjects.has(stdObj.objectName)}
										<div class="mt-3 pl-4 space-y-2 border-l-2 border-blue-300">
											{#each stdObj.customFields as field}
												<div class="flex items-center justify-between p-2 rounded bg-white border border-blue-100">
													<div class="flex items-center gap-2">
														<Badge variant="outline" class="text-xs">
															FIELD
														</Badge>
														<div>
															<p class="text-sm font-medium">{field.name}</p>
															<p class="text-xs text-muted-foreground font-mono">{field.apiName}</p>
														</div>
													</div>
													<Badge variant="secondary" class="text-xs">Custom Field</Badge>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- No Dependencies Message -->
			{#if customDependencies.length === 0 && standardObjectsWithFields.length === 0}
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

