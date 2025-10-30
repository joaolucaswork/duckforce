import type {
	MigrationProject,
	SalesforceComponent,
	LWCComponent,
	FieldComponent,
	ObjectComponent,
	ApexComponent,
	MigrationStats
} from '$lib/types/salesforce';

// Mock Salesforce Components
export const mockComponents: SalesforceComponent[] = [
	// Objects
	{
		id: 'obj-account',
		name: 'Account',
		type: 'object',
		apiName: 'Account',
		description: 'Standard Account object',
		dependencies: [],
		dependents: [
			{ id: 'field-account-custom', name: 'Account.CustomField__c', type: 'field', required: false }
		],
		migrationStatus: 'completed',
		migrationDate: new Date('2025-01-15')
	} as ObjectComponent,
	{
		id: 'obj-contact',
		name: 'Contact',
		type: 'object',
		apiName: 'Contact',
		description: 'Standard Contact object',
		dependencies: [{ id: 'obj-account', name: 'Account', type: 'object', required: true }],
		dependents: [
			{ id: 'lwc-contact-list', name: 'contactList', type: 'lwc', required: false }
		],
		migrationStatus: 'completed',
		migrationDate: new Date('2025-01-16')
	} as ObjectComponent,
	{
		id: 'obj-opportunity',
		name: 'Opportunity',
		type: 'object',
		apiName: 'Opportunity',
		description: 'Standard Opportunity object',
		dependencies: [{ id: 'obj-account', name: 'Account', type: 'object', required: true }],
		dependents: [
			{ id: 'apex-opportunity-handler', name: 'OpportunityHandler', type: 'apex', required: false }
		],
		migrationStatus: 'in-progress'
	} as ObjectComponent,
	{
		id: 'obj-custom-product',
		name: 'Custom Product',
		type: 'object',
		apiName: 'CustomProduct__c',
		description: 'Custom product tracking object',
		dependencies: [],
		dependents: [
			{ id: 'lwc-product-catalog', name: 'productCatalog', type: 'lwc', required: false }
		],
		migrationStatus: 'pending'
	} as ObjectComponent,

	// Fields
	{
		id: 'field-account-custom',
		name: 'Account.CustomField__c',
		type: 'field',
		apiName: 'CustomField__c',
		objectName: 'Account',
		fieldType: 'Text',
		isCustom: true,
		isRequired: false,
		description: 'Custom field on Account',
		dependencies: [{ id: 'obj-account', name: 'Account', type: 'object', required: true }],
		dependents: [
			{ id: 'lwc-account-detail', name: 'accountDetail', type: 'lwc', required: false }
		],
		migrationStatus: 'completed',
		migrationDate: new Date('2025-01-17')
	} as FieldComponent,
	{
		id: 'field-opportunity-stage',
		name: 'Opportunity.StageName',
		type: 'field',
		apiName: 'StageName',
		objectName: 'Opportunity',
		fieldType: 'Picklist',
		isCustom: false,
		isRequired: true,
		picklistValues: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
		description: 'Opportunity stage',
		dependencies: [{ id: 'obj-opportunity', name: 'Opportunity', type: 'object', required: true }],
		dependents: [],
		migrationStatus: 'in-progress'
	} as FieldComponent,

	// LWC Components
	{
		id: 'lwc-contact-list',
		name: 'contactList',
		type: 'lwc',
		apiName: 'contactList',
		description: 'Lightning Web Component to display contact list',
		jsFile: 'contactList.js',
		htmlFile: 'contactList.html',
		cssFile: 'contactList.css',
		xmlFile: 'contactList.js-meta.xml',
		isExposed: true,
		targets: ['lightning__RecordPage', 'lightning__AppPage'],
		dependencies: [
			{ id: 'obj-contact', name: 'Contact', type: 'object', required: true },
			{ id: 'apex-contact-controller', name: 'ContactController', type: 'apex', required: true }
		],
		dependents: [],
		migrationStatus: 'pending'
	} as LWCComponent,
	{
		id: 'lwc-account-detail',
		name: 'accountDetail',
		type: 'lwc',
		apiName: 'accountDetail',
		description: 'Lightning Web Component for account details',
		jsFile: 'accountDetail.js',
		htmlFile: 'accountDetail.html',
		cssFile: 'accountDetail.css',
		xmlFile: 'accountDetail.js-meta.xml',
		isExposed: true,
		targets: ['lightning__RecordPage'],
		dependencies: [
			{ id: 'obj-account', name: 'Account', type: 'object', required: true },
			{ id: 'field-account-custom', name: 'Account.CustomField__c', type: 'field', required: false }
		],
		dependents: [],
		migrationStatus: 'completed',
		migrationDate: new Date('2025-01-20')
	} as LWCComponent,
	{
		id: 'lwc-product-catalog',
		name: 'productCatalog',
		type: 'lwc',
		apiName: 'productCatalog',
		description: 'Product catalog display component',
		jsFile: 'productCatalog.js',
		htmlFile: 'productCatalog.html',
		xmlFile: 'productCatalog.js-meta.xml',
		isExposed: true,
		targets: ['lightning__AppPage'],
		dependencies: [
			{ id: 'obj-custom-product', name: 'CustomProduct__c', type: 'object', required: true },
			{ id: 'apex-product-service', name: 'ProductService', type: 'apex', required: true }
		],
		dependents: [],
		migrationStatus: 'blocked'
	} as LWCComponent,

	// Apex Classes
	{
		id: 'apex-contact-controller',
		name: 'ContactController',
		type: 'apex',
		apiName: 'ContactController',
		description: 'Apex controller for contact operations',
		isTest: false,
		apiVersion: 60.0,
		methods: [
			{
				name: 'getContacts',
				isStatic: false,
				isPublic: true,
				returnType: 'List<Contact>',
				parameters: []
			}
		],
		dependencies: [{ id: 'obj-contact', name: 'Contact', type: 'object', required: true }],
		dependents: [
			{ id: 'lwc-contact-list', name: 'contactList', type: 'lwc', required: false }
		],
		migrationStatus: 'pending'
	} as ApexComponent,
	{
		id: 'apex-opportunity-handler',
		name: 'OpportunityHandler',
		type: 'apex',
		apiName: 'OpportunityHandler',
		description: 'Handler for opportunity trigger logic',
		isTest: false,
		apiVersion: 60.0,
		methods: [
			{
				name: 'beforeInsert',
				isStatic: true,
				isPublic: true,
				returnType: 'void',
				parameters: [{ name: 'newOpps', type: 'List<Opportunity>' }]
			}
		],
		dependencies: [
			{ id: 'obj-opportunity', name: 'Opportunity', type: 'object', required: true },
			{ id: 'obj-account', name: 'Account', type: 'object', required: true }
		],
		dependents: [],
		migrationStatus: 'pending'
	} as ApexComponent,
	{
		id: 'apex-product-service',
		name: 'ProductService',
		type: 'apex',
		apiName: 'ProductService',
		description: 'Service class for product operations',
		isTest: false,
		apiVersion: 60.0,
		methods: [
			{
				name: 'getProducts',
				isStatic: false,
				isPublic: true,
				returnType: 'List<CustomProduct__c>',
				parameters: []
			}
		],
		dependencies: [
			{ id: 'obj-custom-product', name: 'CustomProduct__c', type: 'object', required: true }
		],
		dependents: [
			{ id: 'lwc-product-catalog', name: 'productCatalog', type: 'lwc', required: false }
		],
		migrationStatus: 'pending'
	} as ApexComponent
];

// Mock Migration Project
export const mockProject: MigrationProject = {
	id: 'proj-1',
	name: 'Sales Cloud Migration',
	description: 'Migrating Sales Cloud customizations from Production to new Sandbox',
	sourceOrg: {
		id: 'org-prod',
		name: 'Production Org',
		instanceUrl: 'https://mycompany.my.salesforce.com',
		orgType: 'production',
		apiVersion: '60.0',
		color: '#2563eb',
		icon: 'building-2'
	},
	targetOrg: {
		id: 'org-sandbox',
		name: 'UAT Sandbox',
		instanceUrl: 'https://mycompany--uat.sandbox.my.salesforce.com',
		orgType: 'sandbox',
		apiVersion: '60.0',
		color: '#059669',
		icon: 'cloud'
	},
	components: mockComponents,
	createdDate: new Date('2025-01-10'),
	lastModifiedDate: new Date('2025-01-20'),
	completionPercentage: 33
};

// Calculate migration statistics
export function calculateMigrationStats(components: SalesforceComponent[]): MigrationStats {
	const stats: MigrationStats = {
		total: components.length,
		pending: 0,
		inProgress: 0,
		completed: 0,
		blocked: 0,
		skipped: 0,
		byType: {
			lwc: { total: 0, completed: 0 },
			field: { total: 0, completed: 0 },
			object: { total: 0, completed: 0 },
			apex: { total: 0, completed: 0 },
			trigger: { total: 0, completed: 0 },
			visualforce: { total: 0, completed: 0 },
			flow: { total: 0, completed: 0 }
		}
	};

	for (const component of components) {
		// Count by status
		switch (component.migrationStatus) {
			case 'pending':
				stats.pending++;
				break;
			case 'in-progress':
				stats.inProgress++;
				break;
			case 'completed':
				stats.completed++;
				break;
			case 'blocked':
				stats.blocked++;
				break;
			case 'skipped':
				stats.skipped++;
				break;
		}

		// Count by type
		stats.byType[component.type].total++;
		if (component.migrationStatus === 'completed') {
			stats.byType[component.type].completed++;
		}
	}

	return stats;
}

