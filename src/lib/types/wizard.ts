import type { SalesforceOrg, SalesforceComponent } from './salesforce';

export type WizardStep = 
	| 'connect-source'
	| 'connect-target'
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
		id: 'connect-source',
		title: 'Connect Source Org',
		description: 'Connect to the Salesforce org you want to migrate from',
		order: 1
	},
	{
		id: 'connect-target',
		title: 'Connect Target Org',
		description: 'Connect to the Salesforce org you want to migrate to',
		order: 2
	},
	{
		id: 'select-components',
		title: 'Select Components',
		description: 'Choose the components you want to migrate',
		order: 3
	},
	{
		id: 'review-dependencies',
		title: 'Review Dependencies',
		description: 'Review all discovered dependencies',
		order: 4
	},
	{
		id: 'execute-migration',
		title: 'Execute Migration',
		description: 'Migrate your components to the target org',
		order: 5
	}
];

export interface OrgConnection {
	org: SalesforceOrg | null;
	isConnected: boolean;
	isConnecting: boolean;
	error: string | null;
	accessToken?: string;
	instanceUrl?: string;
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
	currentStep: 'connect-source',
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

