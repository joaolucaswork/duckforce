import type { 
	WizardState, 
	WizardStep, 
	OrgConnection,
	ComponentSelection,
	DependencyReview,
	MigrationExecution
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

	// Source Org methods
	setSourceOrgConnecting(isConnecting: boolean) {
		this.state.sourceOrg.isConnecting = isConnecting;
		if (isConnecting) {
			this.state.sourceOrg.error = null;
		}
	}

	setSourceOrg(org: SalesforceOrg, accessToken?: string, instanceUrl?: string) {
		this.state.sourceOrg = {
			org,
			isConnected: true,
			isConnecting: false,
			error: null,
			accessToken,
			instanceUrl
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

	setTargetOrg(org: SalesforceOrg, accessToken?: string, instanceUrl?: string) {
		this.state.targetOrg = {
			org,
			isConnected: true,
			isConnecting: false,
			error: null,
			accessToken,
			instanceUrl
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
		if (this.state.componentSelection.selectedIds.has(componentId)) {
			this.state.componentSelection.selectedIds.delete(componentId);
		} else {
			this.state.componentSelection.selectedIds.add(componentId);
		}
		
		if (this.state.componentSelection.selectedIds.size > 0) {
			this.markStepComplete('select-components');
		}
	}

	selectAllComponents() {
		this.state.componentSelection.availableComponents.forEach(component => {
			this.state.componentSelection.selectedIds.add(component.id);
		});
		this.markStepComplete('select-components');
	}

	deselectAllComponents() {
		this.state.componentSelection.selectedIds.clear();
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
		this.state.dependencyReview.discoveredDependencies = dependencies;
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

