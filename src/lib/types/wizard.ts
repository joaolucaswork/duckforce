import type { SalesforceOrg, SalesforceComponent } from './salesforce';

export type WizardStep =
	| 'configure-orgs'
	| 'select-components'
	| 'review-dependencies'
	| 'execute-migration';

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

export interface DependencyReview {
	discoveredDependencies: SalesforceComponent[];
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

export interface WizardState {
	currentStep: WizardStep;
	completedSteps: Set<WizardStep>;
	sourceOrg: OrgConnection;
	targetOrg: OrgConnection;
	componentSelection: ComponentSelection;
	dependencyReview: DependencyReview;
	migrationExecution: MigrationExecution;
}

export const initialWizardState: WizardState = {
	currentStep: 'configure-orgs',
	completedSteps: new Set(),
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
		discoveredDependencies: [],
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
	}
};

