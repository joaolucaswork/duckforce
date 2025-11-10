import type { SalesforceOrg, SalesforceComponent } from './salesforce';

export type WizardStep =
	| 'configure-orgs'
	| 'select-components'
	| 'review-dependencies'
	| 'execute-migration';

// Cached organization from Supabase
export interface CachedOrganization {
	id: string;
	org_id: string;
	org_name: string;
	instance_url: string;
	org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
	color?: string;
	icon?: string;
	last_connected_at: string;
	last_synced_at?: string;
	is_active: boolean;
	component_counts?: {
		lwc?: number;
		apex?: number;
		objects?: number;
		fields?: number;
		triggers?: number;
		visualforce?: number;
		flows?: number;
	};
}

// Organization summary for UI display
export interface OrganizationSummary {
	id: string;
	org_id: string;
	org_name: string;
	instance_url: string;
	org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
	color?: string;
	icon?: string;
	last_connected_at: string;
	last_synced_at?: string;
	is_active: boolean;
	total_components: number;
	component_counts: {
		lwc: number;
		apex: number;
		objects: number;
		fields: number;
		triggers: number;
		visualforce: number;
		flows: number;
	};
}

export interface WizardStepConfig {
	id: WizardStep;
	title: string;
	description: string;
	order: number;
}

export const WIZARD_STEPS: WizardStepConfig[] = [
	{
		id: 'configure-orgs',
		title: 'Configure Organizations',
		description: 'Connect your source and target Salesforce organizations',
		order: 1
	},
	{
		id: 'select-components',
		title: 'Select Components',
		description: 'Choose the components you want to migrate',
		order: 2
	},
	{
		id: 'review-dependencies',
		title: 'Review Dependencies',
		description: 'Review all discovered dependencies',
		order: 3
	},
	{
		id: 'execute-migration',
		title: 'Execute Migration',
		description: 'Migrate your components to the target org',
		order: 4
	}
];

export interface OrgConnection {
	org: SalesforceOrg | null;
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	// Tokens are kept server-side only in httpOnly cookies, not in client state
}

export interface ComponentSelection {
	selectedIds: Set<string>;
	availableComponents: SalesforceComponent[];
	isLoading: boolean;
	error: string | null;
}

export interface StandardObjectWithFields {
	objectName: string;
	customFields: SalesforceComponent[];
}

export interface DependencyReview {
	discoveredDependencies: SalesforceComponent[]; // DEPRECATED: Use customDependencies instead
	customDependencies: SalesforceComponent[]; // Custom components (custom objects, custom fields on custom objects, etc.)
	standardObjectsWithFields: StandardObjectWithFields[]; // Standard objects with custom fields
	isScanning: boolean;
	scanComplete: boolean;
	error: string | null;
}

export interface MigrationExecution {
	status: 'idle' | 'preparing' | 'migrating' | 'completed' | 'failed';
	progress: number;
	currentComponent: string | null;
	migratedComponents: string[];
	failedComponents: Array<{ id: string; error: string }>;
	error: string | null;
}

export interface KanbanColumnData {
	columnId: string;
	componentIds: string[];
}

export interface ComponentNoteData {
	id: string;
	content: string;
	isTodo: boolean;
	createdAt: string;
	updatedAt: string;
	userEmail: string;
	userName: string | null;
}

export interface ComponentNoteWithHistory {
	activeNote: ComponentNoteData | null;
	history: ComponentNoteData[];
}

export interface KanbanState {
	columns: KanbanColumnData[];
	componentNotes: Map<string, ComponentNoteData>;
	componentNoteHistory: Map<string, ComponentNoteData[]>;
}

export interface WizardState {
	currentStep: WizardStep;
	completedSteps: Set<WizardStep>;

	// NEW: Cached organizations from Supabase
	cachedOrgs: CachedOrganization[];
	activeOrgId: string | null;

	// NEW: Selected orgs for migration (by ID)
	selectedSourceOrgId: string | null;
	selectedTargetOrgId: string | null;

	// Loading states
	isLoadingOrgs: boolean;
	hasLoadedOrgs: boolean;
	orgsError: string | null;

	// DEPRECATED: Will be removed in Phase 4
	// These are kept temporarily for backward compatibility
	sourceOrg: OrgConnection;
	targetOrg: OrgConnection;

	componentSelection: ComponentSelection;
	dependencyReview: DependencyReview;
	migrationExecution: MigrationExecution;
	kanbanState: KanbanState;
}

export const initialWizardState: WizardState = {
	currentStep: 'configure-orgs',
	completedSteps: new Set(),

	// NEW: Cached organizations
	cachedOrgs: [],
	activeOrgId: null,
	selectedSourceOrgId: null,
	selectedTargetOrgId: null,
	isLoadingOrgs: false,
	hasLoadedOrgs: false,
	orgsError: null,

	// DEPRECATED: Kept for backward compatibility
	sourceOrg: {
		org: null,
		isConnected: false,
		isConnecting: false,
		error: null
	},
	targetOrg: {
		org: null,
		isConnected: false,
		isConnecting: false,
		error: null
	},

	componentSelection: {
		selectedIds: new Set(),
		availableComponents: [],
		isLoading: false,
		error: null
	},
	dependencyReview: {
		discoveredDependencies: [], // DEPRECATED: Use customDependencies instead
		customDependencies: [],
		standardObjectsWithFields: [],
		isScanning: false,
		scanComplete: false,
		error: null
	},
	migrationExecution: {
		status: 'idle',
		progress: 0,
		currentComponent: null,
		migratedComponents: [],
		failedComponents: [],
		error: null
	},
	kanbanState: {
		columns: [
			{ columnId: 'nao-iniciado', componentIds: [] },
			{ columnId: 'em-andamento', componentIds: [] },
			{ columnId: 'concluido', componentIds: [] }
		],
		componentNotes: new Map(),
		componentNoteHistory: new Map()
	}
};

