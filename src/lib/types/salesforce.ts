// Salesforce Component Types

export type ComponentType = 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';

export type MigrationStatus = 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';

export interface Dependency {
	id: string;
	name: string;
	type: ComponentType;
	required: boolean;
}

export interface SalesforceComponent {
	id: string;
	name: string;
	type: ComponentType;
	apiName: string;
	description?: string;
	namespace?: string;
	dependencies: Dependency[];
	dependents: Dependency[]; // Components that depend on this one
	migrationStatus: MigrationStatus;
	migrationDate?: Date;
	migrationNotes?: string;
	metadata?: Record<string, any>;
}

// Lightning Web Component
export interface LWCComponent extends SalesforceComponent {
	type: 'lwc';
	jsFile: string;
	htmlFile: string;
	cssFile?: string;
	xmlFile: string;
	isExposed: boolean;
	targets?: string[];
}

// Field
export interface FieldComponent extends SalesforceComponent {
	type: 'field';
	objectName: string;
	fieldType: string;
	isCustom: boolean;
	isRequired: boolean;
	length?: number;
	precision?: number;
	scale?: number;
	defaultValue?: any;
	picklistValues?: string[];
	referenceTo?: string; // For lookup/master-detail fields
}

// Object
export interface ObjectComponent extends SalesforceComponent {
	type: 'object';
	isCustom: boolean;
	fields: FieldComponent[];
	recordTypes?: string[];
	triggers?: TriggerComponent[];
}

// Apex Class
export interface ApexComponent extends SalesforceComponent {
	type: 'apex';
	isTest: boolean;
	apiVersion: number;
	methods: ApexMethod[];
}

export interface ApexMethod {
	name: string;
	isStatic: boolean;
	isPublic: boolean;
	returnType: string;
	parameters: ApexParameter[];
}

export interface ApexParameter {
	name: string;
	type: string;
}

// Trigger
export interface TriggerComponent extends SalesforceComponent {
	type: 'trigger';
	objectName: string;
	events: TriggerEvent[];
	apiVersion: number;
}

export type TriggerEvent = 'before insert' | 'before update' | 'before delete' | 
	'after insert' | 'after update' | 'after delete' | 'after undelete';

// Migration Project
export interface MigrationProject {
	id: string;
	name: string;
	description?: string;
	sourceOrg: SalesforceOrg;
	targetOrg: SalesforceOrg;
	components: SalesforceComponent[];
	createdDate: Date;
	lastModifiedDate: Date;
	completionPercentage: number;
}

export interface SalesforceOrg {
	id: string;
	name: string;
	instanceUrl: string;
	orgType: 'production' | 'sandbox' | 'developer' | 'scratch';
	apiVersion: string;
}

// Dependency Graph
export interface DependencyNode {
	id: string;
	component: SalesforceComponent;
	x?: number;
	y?: number;
}

export interface DependencyEdge {
	source: string;
	target: string;
	required: boolean;
}

export interface DependencyGraph {
	nodes: DependencyNode[];
	edges: DependencyEdge[];
}

// Migration Statistics
export interface MigrationStats {
	total: number;
	pending: number;
	inProgress: number;
	completed: number;
	blocked: number;
	skipped: number;
	byType: Record<ComponentType, {
		total: number;
		completed: number;
	}>;
}

