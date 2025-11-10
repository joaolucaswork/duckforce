import type {
	WizardState,
	WizardStep,
	OrgConnection,
	ComponentSelection,
	DependencyReview,
	MigrationExecution,
	CachedOrganization,
	OrganizationSummary,
	StandardObjectWithFields
} from '$lib/types/wizard';
import type { SalesforceOrg, SalesforceComponent } from '$lib/types/salesforce';
import { initialWizardState, WIZARD_STEPS } from '$lib/types/wizard';

class WizardStore {
	state = $state<WizardState>(structuredClone(initialWizardState));

	// Navigation methods
	goToStep(step: WizardStep) {
		this.state.currentStep = step;
	}

	nextStep() {
		const currentIndex = WIZARD_STEPS.findIndex(s => s.id === this.state.currentStep);
		if (currentIndex < WIZARD_STEPS.length - 1) {
			this.state.currentStep = WIZARD_STEPS[currentIndex + 1].id;
		}
	}

	previousStep() {
		const currentIndex = WIZARD_STEPS.findIndex(s => s.id === this.state.currentStep);
		if (currentIndex > 0) {
			this.state.currentStep = WIZARD_STEPS[currentIndex - 1].id;
		}
	}

	markStepComplete(step: WizardStep) {
		this.state.completedSteps.add(step);
	}

	isStepComplete(step: WizardStep): boolean {
		return this.state.completedSteps.has(step);
	}

	canProceed(): boolean {
		const step = this.state.currentStep;

		switch (step) {
			case 'configure-orgs':
				// NEW: Check if both source and target orgs are selected and different
				if (this.state.selectedSourceOrgId && this.state.selectedTargetOrgId) {
					return this.state.selectedSourceOrgId !== this.state.selectedTargetOrgId;
				}
				// DEPRECATED: Fallback to old logic for backward compatibility
				return this.state.sourceOrg.isConnected && this.state.targetOrg.isConnected;
			case 'select-components':
				return this.state.componentSelection.selectedIds.size > 0;
			case 'review-dependencies':
				return this.state.dependencyReview.scanComplete;
			case 'execute-migration':
				return this.state.migrationExecution.status === 'completed';
			default:
				return false;
		}
	}

	// NEW: Cached Organizations methods
	async loadCachedOrgs() {
		this.state.isLoadingOrgs = true;
		this.state.orgsError = null;

		try {
			const response = await fetch('/api/orgs');
			if (!response.ok) {
				throw new Error(`Failed to load organizations: ${response.statusText}`);
			}

			const data = await response.json();
			this.state.cachedOrgs = data.organizations || [];

			// Set active org ID if there's an active org
			const activeOrg = this.state.cachedOrgs.find(org => org.is_active);
			if (activeOrg) {
				this.state.activeOrgId = activeOrg.id;
			}
		} catch (error) {
			this.state.orgsError = error instanceof Error ? error.message : 'Failed to load organizations';
			console.error('Error loading cached orgs:', error);
		} finally {
			this.state.isLoadingOrgs = false;
			this.state.hasLoadedOrgs = true;
		}
	}

	async switchActiveOrg(orgId: string) {
		try {
			const response = await fetch(`/api/orgs/${orgId}/activate`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to activate organization: ${response.statusText}`);
			}

			// Update local state
			this.state.cachedOrgs = this.state.cachedOrgs.map(org => ({
				...org,
				is_active: org.id === orgId
			}));
			this.state.activeOrgId = orgId;
		} catch (error) {
			console.error('Error switching active org:', error);
			throw error;
		}
	}

	async refreshOrgData(orgId: string) {
		try {
			const response = await fetch(`/api/orgs/${orgId}/sync`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error(`Failed to sync organization: ${response.statusText}`);
			}

			const data = await response.json();

			// Update the org in the cached list
			this.state.cachedOrgs = this.state.cachedOrgs.map(org =>
				org.id === orgId
					? { ...org, last_synced_at: new Date().toISOString(), component_counts: data.component_counts }
					: org
			);

			return data;
		} catch (error) {
			console.error('Error refreshing org data:', error);
			throw error;
		}
	}

	async deleteOrg(orgId: string) {
		try {
			const response = await fetch(`/api/orgs/${orgId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error(`Failed to delete organization: ${response.statusText}`);
			}

			// Remove from local state
			this.state.cachedOrgs = this.state.cachedOrgs.filter(org => org.id !== orgId);

			// Clear selections if deleted org was selected
			if (this.state.selectedSourceOrgId === orgId) {
				this.state.selectedSourceOrgId = null;
			}
			if (this.state.selectedTargetOrgId === orgId) {
				this.state.selectedTargetOrgId = null;
			}
			if (this.state.activeOrgId === orgId) {
				this.state.activeOrgId = null;
			}
		} catch (error) {
			console.error('Error deleting org:', error);
			throw error;
		}
	}

	connectNewOrg() {
		// Redirect to OAuth flow
		window.location.href = '/api/auth/salesforce/login';
	}

	setSelectedSourceOrg(orgId: string | null) {
		this.state.selectedSourceOrgId = orgId;
		this.updateStepCompletion();
	}

	setSelectedTargetOrg(orgId: string | null) {
		this.state.selectedTargetOrgId = orgId;
		this.updateStepCompletion();
	}

	private updateStepCompletion() {
		// Mark configure-orgs step as complete if both orgs are selected and different
		if (this.state.selectedSourceOrgId &&
		    this.state.selectedTargetOrgId &&
		    this.state.selectedSourceOrgId !== this.state.selectedTargetOrgId) {
			this.markStepComplete('configure-orgs');
		}
	}

	// Computed properties for source/target orgs
	get sourceOrg(): SalesforceOrg | null {
		if (!this.state.selectedSourceOrgId) return null;

		const cachedOrg = this.state.cachedOrgs.find(org => org.id === this.state.selectedSourceOrgId);
		if (!cachedOrg) return null;

		return {
			id: cachedOrg.id,
			name: cachedOrg.org_name,
			instanceUrl: cachedOrg.instance_url,
			orgType: cachedOrg.org_type,
			apiVersion: '60.0', // Default API version
			color: cachedOrg.color,
			icon: cachedOrg.icon
		};
	}

	get targetOrg(): SalesforceOrg | null {
		if (!this.state.selectedTargetOrgId) return null;

		const cachedOrg = this.state.cachedOrgs.find(org => org.id === this.state.selectedTargetOrgId);
		if (!cachedOrg) return null;

		return {
			id: cachedOrg.id,
			name: cachedOrg.org_name,
			instanceUrl: cachedOrg.instance_url,
			orgType: cachedOrg.org_type,
			apiVersion: '60.0', // Default API version
			color: cachedOrg.color,
			icon: cachedOrg.icon
		};
	}

	// Source Org methods
	setSourceOrgConnecting(isConnecting: boolean) {
		this.state.sourceOrg.isConnecting = isConnecting;
		if (isConnecting) {
			this.state.sourceOrg.error = null;
		}
	}

	setSourceOrg(org: SalesforceOrg) {
		this.state.sourceOrg = {
			org,
			isConnected: true,
			isConnecting: false,
			error: null
			// Tokens are kept server-side only, not stored in client state
		};
		// Mark step complete only if both orgs are connected
		if (this.state.targetOrg.isConnected) {
			this.markStepComplete('configure-orgs');
		}
	}

	setSourceOrgError(error: string) {
		this.state.sourceOrg.error = error;
		this.state.sourceOrg.isConnecting = false;
	}

	// Target Org methods
	setTargetOrgConnecting(isConnecting: boolean) {
		this.state.targetOrg.isConnecting = isConnecting;
		if (isConnecting) {
			this.state.targetOrg.error = null;
		}
	}

	setTargetOrg(org: SalesforceOrg) {
		this.state.targetOrg = {
			org,
			isConnected: true,
			isConnecting: false,
			error: null
			// Tokens are kept server-side only, not stored in client state
		};
		// Mark step complete only if both orgs are connected
		if (this.state.sourceOrg.isConnected) {
			this.markStepComplete('configure-orgs');
		}
	}

	setTargetOrgError(error: string) {
		this.state.targetOrg.error = error;
		this.state.targetOrg.isConnecting = false;
	}

	// Component Selection methods
	setAvailableComponents(components: SalesforceComponent[]) {
		this.state.componentSelection.availableComponents = components;
		this.state.componentSelection.isLoading = false;
	}

	// NEW: Add components from a specific org (for multi-org display)
	addComponentsFromOrg(components: SalesforceComponent[], orgId: string, orgName: string) {
		// Tag components with their source org
		const taggedComponents = components.map(comp => ({
			...comp,
			sourceOrgId: orgId,
			sourceOrgName: orgName
		}));

		// Merge with existing components, avoiding duplicates
		const existingIds = new Set(this.state.componentSelection.availableComponents.map(c => c.id));
		const newComponents = taggedComponents.filter(c => !existingIds.has(c.id));

		this.state.componentSelection.availableComponents = [
			...this.state.componentSelection.availableComponents,
			...newComponents
		];
	}

	// NEW: Replace all components with components from multiple orgs
	setComponentsFromMultipleOrgs(componentsByOrg: Array<{ orgId: string; orgName: string; components: SalesforceComponent[] }>) {
		const allComponents: SalesforceComponent[] = [];

		componentsByOrg.forEach(({ orgId, orgName, components }) => {
			const taggedComponents = components.map(comp => ({
				...comp,
				sourceOrgId: orgId,
				sourceOrgName: orgName
			}));
			allComponents.push(...taggedComponents);
		});

		this.state.componentSelection.availableComponents = allComponents;
		this.state.componentSelection.isLoading = false;
	}

	setComponentsLoading(isLoading: boolean) {
		this.state.componentSelection.isLoading = isLoading;
		if (isLoading) {
			this.state.componentSelection.error = null;
		}
	}

	setComponentsError(error: string) {
		this.state.componentSelection.error = error;
		this.state.componentSelection.isLoading = false;
	}

	toggleComponentSelection(componentId: string) {
		// Create a new Set to trigger Svelte reactivity
		const newSelectedIds = new Set(this.state.componentSelection.selectedIds);

		if (newSelectedIds.has(componentId)) {
			newSelectedIds.delete(componentId);
		} else {
			newSelectedIds.add(componentId);
		}

		this.state.componentSelection.selectedIds = newSelectedIds;

		if (newSelectedIds.size > 0) {
			this.markStepComplete('select-components');
		}
	}

	selectAllComponents() {
		// Create a new Set with all component IDs to trigger Svelte reactivity
		const newSelectedIds = new Set(
			this.state.componentSelection.availableComponents.map(component => component.id)
		);
		this.state.componentSelection.selectedIds = newSelectedIds;
		this.markStepComplete('select-components');
	}

	deselectAllComponents() {
		// Create a new empty Set to trigger Svelte reactivity
		this.state.componentSelection.selectedIds = new Set();
	}

	// Select all components from a specific org
	selectAllComponentsFromOrg(orgId: string) {
		const newSelectedIds = new Set(this.state.componentSelection.selectedIds);

		// Add all components from the specified org
		this.state.componentSelection.availableComponents
			.filter(component => component.sourceOrgId === orgId)
			.forEach(component => newSelectedIds.add(component.id));

		this.state.componentSelection.selectedIds = newSelectedIds;

		if (newSelectedIds.size > 0) {
			this.markStepComplete('select-components');
		}
	}

	// Deselect all components from a specific org
	deselectAllComponentsFromOrg(orgId: string) {
		const newSelectedIds = new Set(this.state.componentSelection.selectedIds);

		// Remove all components from the specified org
		this.state.componentSelection.availableComponents
			.filter(component => component.sourceOrgId === orgId)
			.forEach(component => newSelectedIds.delete(component.id));

		this.state.componentSelection.selectedIds = newSelectedIds;
	}

	// Batch select multiple components by IDs (performance optimization)
	selectComponentsBatch(componentIds: string[]) {
		const newSelectedIds = new Set(this.state.componentSelection.selectedIds);

		componentIds.forEach(id => newSelectedIds.add(id));

		this.state.componentSelection.selectedIds = newSelectedIds;

		if (newSelectedIds.size > 0) {
			this.markStepComplete('select-components');
		}
	}

	// Dependency Review methods
	setDependencyScanning(isScanning: boolean) {
		this.state.dependencyReview.isScanning = isScanning;
		if (isScanning) {
			this.state.dependencyReview.error = null;
			this.state.dependencyReview.scanComplete = false;
		}
	}

	setDiscoveredDependencies(dependencies: SalesforceComponent[]) {
		// DEPRECATED: Use setCategorizedDependencies instead
		this.state.dependencyReview.discoveredDependencies = dependencies;
		this.state.dependencyReview.isScanning = false;
		this.state.dependencyReview.scanComplete = true;
		this.markStepComplete('review-dependencies');
	}

	setCategorizedDependencies(
		customDependencies: SalesforceComponent[],
		standardObjectsWithFields: StandardObjectWithFields[]
	) {
		this.state.dependencyReview.customDependencies = customDependencies;
		this.state.dependencyReview.standardObjectsWithFields = standardObjectsWithFields;
		// Also set discoveredDependencies for backward compatibility
		this.state.dependencyReview.discoveredDependencies = [
			...customDependencies,
			...standardObjectsWithFields.flatMap(obj => obj.customFields)
		];
		this.state.dependencyReview.isScanning = false;
		this.state.dependencyReview.scanComplete = true;
		this.markStepComplete('review-dependencies');
	}

	setDependencyError(error: string) {
		this.state.dependencyReview.error = error;
		this.state.dependencyReview.isScanning = false;
	}

	// Migration Execution methods
	setMigrationStatus(status: MigrationExecution['status']) {
		this.state.migrationExecution.status = status;
		if (status === 'completed') {
			this.markStepComplete('execute-migration');
		}
	}

	setMigrationProgress(progress: number) {
		this.state.migrationExecution.progress = progress;
	}

	setCurrentMigratingComponent(componentId: string | null) {
		this.state.migrationExecution.currentComponent = componentId;
	}

	addMigratedComponent(componentId: string) {
		this.state.migrationExecution.migratedComponents.push(componentId);
	}

	addFailedComponent(componentId: string, error: string) {
		this.state.migrationExecution.failedComponents.push({ id: componentId, error });
	}

	setMigrationError(error: string) {
		this.state.migrationExecution.error = error;
		this.state.migrationExecution.status = 'failed';
	}

	// Reset wizard
	reset() {
		this.state = structuredClone(initialWizardState);
	}
}

export const wizardStore = new WizardStore();

