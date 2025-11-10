import type {
	WizardState,
	WizardStep,
	OrgConnection,
	ComponentSelection,
	DependencyReview,
	MigrationExecution,
	CachedOrganization,
	OrganizationSummary,
	StandardObjectWithFields,
	ComponentNoteData
} from '$lib/types/wizard';
import type { SalesforceOrg, SalesforceComponent } from '$lib/types/salesforce';
import { initialWizardState, WIZARD_STEPS } from '$lib/types/wizard';
import type { ComponentNoteResponse } from '$lib/server/db/types';

class WizardStore {
	state = $state<WizardState>(structuredClone(initialWizardState));
	// Version counter to force reactivity when Maps change
	noteHistoryVersion = $state(0);

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

	// Kanban board methods
	async addComponentToKanban(componentId: string, columnId: string) {
		// Remove from other columns if already present
		this.state.kanbanState.columns.forEach(column => {
			const index = column.componentIds.indexOf(componentId);
			if (index > -1) {
				column.componentIds.splice(index, 1);
			}
		});

		// Add to the specified column
		const targetColumn = this.state.kanbanState.columns.find(col => col.columnId === columnId);
		if (targetColumn && !targetColumn.componentIds.includes(componentId)) {
			targetColumn.componentIds.push(componentId);
		}

		// Save to database
		await this.saveKanbanBoard();
	}

	async moveComponentBetweenColumns(componentId: string, fromColumnId: string, toColumnId: string) {
		// Remove from source column
		const fromColumn = this.state.kanbanState.columns.find(col => col.columnId === fromColumnId);
		if (fromColumn) {
			const index = fromColumn.componentIds.indexOf(componentId);
			if (index > -1) {
				fromColumn.componentIds.splice(index, 1);
			}
		}

		// Add to target column
		const toColumn = this.state.kanbanState.columns.find(col => col.columnId === toColumnId);
		if (toColumn && !toColumn.componentIds.includes(componentId)) {
			toColumn.componentIds.push(componentId);
		}

		// Save to database
		await this.saveKanbanBoard();
	}

	async removeComponentFromKanban(componentId: string) {
		// Remove from all columns
		this.state.kanbanState.columns.forEach(column => {
			const index = column.componentIds.indexOf(componentId);
			if (index > -1) {
				column.componentIds.splice(index, 1);
			}
		});

		// Remove note if exists
		this.state.kanbanState.componentNotes.delete(componentId);

		// Save to database
		await this.saveKanbanBoard();
	}

	updateComponentNote(componentId: string, noteData: ComponentNoteData) {
		if (noteData.content.trim() === '') {
			this.state.kanbanState.componentNotes.delete(componentId);
		} else {
			this.state.kanbanState.componentNotes.set(componentId, noteData);
		}
	}

	async loadComponentNotes(componentIds: string[]) {
		if (componentIds.length === 0) return;

		try {
			const response = await fetch(`/api/notes?componentIds=${componentIds.join(',')}`);
			if (!response.ok) {
				throw new Error(`Failed to load component notes: ${response.statusText}`);
			}

			const data = await response.json();
			const notes: ComponentNoteResponse[] = data.notes || [];

			// Update the componentNotes Map with the fetched notes
			notes.forEach(note => {
				const noteData: ComponentNoteData = {
					id: note.id,
					content: note.content,
					isTodo: note.is_todo,
					createdAt: note.created_at,
					updatedAt: note.updated_at,
					userEmail: note.user_email,
					userName: note.user_name
				};
				this.state.kanbanState.componentNotes.set(note.component_id, noteData);
			});
		} catch (error) {
			console.error('Error loading component notes:', error);
		}
	}

	async loadKanbanBoard(): Promise<void> {
		try {
			const response = await fetch('/api/kanban');
			if (!response.ok) {
				throw new Error(`Failed to load kanban board: ${response.statusText}`);
			}

			const data = await response.json();

			// Update kanban columns with loaded data
			if (data.columns && Array.isArray(data.columns)) {
				this.state.kanbanState.columns = data.columns;

				// Extract all component IDs from all columns
				const allComponentIds = data.columns.flatMap((col: any) => col.componentIds || []);

				// Load notes for all components in the kanban board
				if (allComponentIds.length > 0) {
					await this.loadComponentNotes(allComponentIds);
				}
			}
		} catch (error) {
			console.error('Error loading kanban board:', error);
		}
	}

	async saveKanbanBoard(): Promise<void> {
		try {
			const response = await fetch('/api/kanban', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					columns: this.state.kanbanState.columns
				})
			});

			if (!response.ok) {
				throw new Error(`Failed to save kanban board: ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error saving kanban board:', error);
		}
	}

	async loadComponentNoteWithHistory(componentId: string) {
		try {
			const response = await fetch(`/api/notes?componentId=${componentId}&includeHistory=true`);
			if (!response.ok) {
				throw new Error(`Failed to load component note history: ${response.statusText}`);
			}

			const data = await response.json();

			// Update active note
			if (data.activeNote) {
				const noteData: ComponentNoteData = {
					id: data.activeNote.id,
					content: data.activeNote.content,
					isTodo: data.activeNote.is_todo,
					createdAt: data.activeNote.created_at,
					updatedAt: data.activeNote.updated_at,
					userEmail: data.activeNote.user_email,
					userName: data.activeNote.user_name
				};
				this.state.kanbanState.componentNotes.set(componentId, noteData);
			} else {
				this.state.kanbanState.componentNotes.delete(componentId);
			}

			// Update history
			const history: ComponentNoteData[] = (data.history || []).map((note: ComponentNoteResponse) => ({
				id: note.id,
				content: note.content,
				isTodo: note.is_todo,
				createdAt: note.created_at,
				updatedAt: note.updated_at,
				userEmail: note.user_email,
				userName: note.user_name
			}));
			this.state.kanbanState.componentNoteHistory.set(componentId, history);
			// Increment version to trigger reactivity
			this.noteHistoryVersion++;
		} catch (error) {
			console.error('Error loading component note history:', error);
		}
	}

	async saveComponentNote(componentId: string, content: string, isTodo: boolean, archiveCurrentAndCreateNew: boolean = false): Promise<ComponentNoteData> {
		const response = await fetch('/api/notes', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				componentId,
				content,
				isTodo,
				archiveCurrentAndCreateNew
			})
		});

		if (!response.ok) {
			throw new Error(`Failed to save component note: ${response.statusText}`);
		}

		const data = await response.json();
		const note: ComponentNoteResponse = data.note;

		// Update local state
		const noteData: ComponentNoteData = {
			id: note.id,
			content: note.content,
			isTodo: note.is_todo,
			createdAt: note.created_at,
			updatedAt: note.updated_at,
			userEmail: note.user_email,
			userName: note.user_name
		};
		this.state.kanbanState.componentNotes.set(componentId, noteData);

		// If we archived and created new, reload history
		if (archiveCurrentAndCreateNew) {
			await this.loadComponentNoteWithHistory(componentId);
		}

		return noteData;
	}

	async deleteComponentNote(componentId: string) {
		const response = await fetch(`/api/notes?componentId=${componentId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			throw new Error(`Failed to delete component note: ${response.statusText}`);
		}

		// Remove from local state
		this.state.kanbanState.componentNotes.delete(componentId);
	}

	async addMultipleComponentsToKanban(componentIds: string[], columnId: string) {
		componentIds.forEach(id => {
			// Remove from other columns if already present
			this.state.kanbanState.columns.forEach(column => {
				const index = column.componentIds.indexOf(id);
				if (index > -1) {
					column.componentIds.splice(index, 1);
				}
			});

			// Add to the specified column
			const targetColumn = this.state.kanbanState.columns.find(col => col.columnId === columnId);
			if (targetColumn && !targetColumn.componentIds.includes(id)) {
				targetColumn.componentIds.push(id);
			}
		});

		// Save to database once after all additions
		await this.saveKanbanBoard();
	}

	async clearKanbanBoard() {
		this.state.kanbanState.columns.forEach(column => {
			column.componentIds = [];
		});
		this.state.kanbanState.componentNotes.clear();
		this.state.kanbanState.componentNoteHistory.clear();

		// Save to database
		await this.saveKanbanBoard();
	}

	// Reset wizard
	reset() {
		this.state = structuredClone(initialWizardState);
	}
}

export const wizardStore = new WizardStore();

