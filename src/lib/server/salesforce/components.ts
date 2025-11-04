/**
 * Salesforce Component Fetching Functions
 * 
 * This module provides functions to fetch various types of components
 * from Salesforce using the Tooling API and Metadata API.
 */

import { Connection } from '@jsforce/jsforce-node';
import type { ComponentInsert } from '../db/types';

/**
 * Fetch all Lightning Web Components from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of LWC components
 */
export async function fetchLightningComponents(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Lightning Web Components...');
		
		// Query LWC bundles using Tooling API
		const result = await conn.tooling.query(
			`SELECT Id, DeveloperName, NamespacePrefix, Description, MasterLabel, CreatedDate, LastModifiedDate
			 FROM LightningComponentBundle
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY DeveloperName`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.DeveloperName}`
				: record.DeveloperName,
			name: record.MasterLabel || record.DeveloperName,
			type: 'lwc' as const,
			description: record.Description || null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				developername: record.DeveloperName,
				masterlabel: record.MasterLabel,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Lightning Web Components`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Lightning Web Components:', error);
		throw error;
	}
}

/**
 * Fetch all Apex Classes from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of Apex class components
 */
export async function fetchApexClasses(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Apex Classes...');
		
		// Query Apex classes using Tooling API
		const result = await conn.tooling.query(
			`SELECT Id, Name, NamespacePrefix, ApiVersion, Status, IsValid, LengthWithoutComments, CreatedDate, LastModifiedDate
			 FROM ApexClass
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY Name`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.Name}`
				: record.Name,
			name: record.Name,
			type: 'apex' as const,
			description: null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				apiversion: record.ApiVersion,
				status: record.Status,
				isvalid: record.IsValid,
				lengthwithoutcomments: record.LengthWithoutComments,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Apex Classes`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Apex Classes:', error);
		throw error;
	}
}

/**
 * Fetch all Custom Objects from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of custom object components
 */
export async function fetchCustomObjects(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Custom Objects...');

		// Query custom objects using Tooling API
		// Note: CustomObject doesn't have MasterLabel field, only DeveloperName
		const result = await conn.tooling.query(
			`SELECT Id, DeveloperName, NamespacePrefix, Description, CreatedDate, LastModifiedDate
			 FROM CustomObject
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY DeveloperName`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.DeveloperName}__c`
				: `${record.DeveloperName}__c`,
			name: record.DeveloperName, // Use DeveloperName as display name
			type: 'object' as const,
			description: record.Description || null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				developername: record.DeveloperName,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Custom Objects`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Custom Objects:', error);
		throw error;
	}
}

/**
 * Fetch all Custom Fields from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of custom field components
 */
export async function fetchCustomFields(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Custom Fields...');

		// Query custom fields using Tooling API
		// Note: CustomField in Tooling API has very limited fields available
		// We can only reliably query: Id, DeveloperName, NamespacePrefix, TableEnumOrId
		const result = await conn.tooling.query(
			`SELECT Id, DeveloperName, NamespacePrefix, TableEnumOrId, CreatedDate, LastModifiedDate
			 FROM CustomField
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY TableEnumOrId, DeveloperName
			 LIMIT 2000`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.TableEnumOrId}.${record.NamespacePrefix}__${record.DeveloperName}__c`
				: `${record.TableEnumOrId}.${record.DeveloperName}__c`,
			name: record.DeveloperName, // Use DeveloperName as display name
			type: 'field' as const,
			description: null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				developername: record.DeveloperName,
				tableenumorid: record.TableEnumOrId,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Custom Fields`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Custom Fields:', error);
		throw error;
	}
}

/**
 * Fetch all Apex Triggers from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of trigger components
 */
export async function fetchTriggers(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Apex Triggers...');
		
		// Query triggers using Tooling API
		const result = await conn.tooling.query(
			`SELECT Id, Name, NamespacePrefix, TableEnumOrId, ApiVersion, Status, IsValid, CreatedDate, LastModifiedDate
			 FROM ApexTrigger
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY Name`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.Name}`
				: record.Name,
			name: record.Name,
			type: 'trigger' as const,
			description: null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				tableenumorid: record.TableEnumOrId,
				apiversion: record.ApiVersion,
				status: record.Status,
				isvalid: record.IsValid,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Apex Triggers`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Apex Triggers:', error);
		throw error;
	}
}

/**
 * Fetch all Visualforce Pages from a Salesforce org
 * 
 * @param conn - JSforce connection with valid access token
 * @returns Array of Visualforce page components
 */
export async function fetchVisualforcePages(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Visualforce Pages...');

		// Query Visualforce pages using Tooling API
		// Note: ApexPage doesn't have MasterLabel in Tooling API, only Name
		const result = await conn.tooling.query(
			`SELECT Id, Name, NamespacePrefix, ApiVersion, Description, CreatedDate, LastModifiedDate
			 FROM ApexPage
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY Name`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.Name}`
				: record.Name,
			name: record.Name, // Use Name as display name
			type: 'visualforce' as const,
			description: record.Description || null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				name: record.Name,
				apiversion: record.ApiVersion,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Visualforce Pages`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Visualforce Pages:', error);
		throw error;
	}
}

/**
 * Fetch all Flows from a Salesforce org
 *
 * @param conn - JSforce connection with valid access token
 * @returns Array of flow components
 */
export async function fetchFlows(conn: Connection): Promise<ComponentInsert[]> {
	try {
		console.log('[Salesforce] Fetching Flows...');

		// Query flows using Tooling API
		// Note: FlowDefinition has limited fields available in Tooling API
		const result = await conn.tooling.query(
			`SELECT Id, DeveloperName, NamespacePrefix, Description, ActiveVersionId, CreatedDate, LastModifiedDate
			 FROM FlowDefinition
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 ORDER BY DeveloperName`
		);

		const components: ComponentInsert[] = result.records.map((record: any) => ({
			component_id: record.Id,
			api_name: record.NamespacePrefix
				? `${record.NamespacePrefix}__${record.DeveloperName}`
				: record.DeveloperName,
			name: record.DeveloperName, // Use DeveloperName as display name
			type: 'flow' as const,
			description: record.Description || null,
			namespace: record.NamespacePrefix || null,
			metadata: {
				developername: record.DeveloperName,
				activeversionid: record.ActiveVersionId,
				created_date: record.CreatedDate,
				last_modified_date: record.LastModifiedDate
			},
			dependencies: [],
			dependents: []
		}));

		console.log(`[Salesforce] Found ${components.length} Flows`);
		return components;
	} catch (error) {
		console.error('[Salesforce] Error fetching Flows:', error);
		throw error;
	}
}

/**
 * Fetch all components from a Salesforce org
 *
 * This is a convenience function that fetches all component types.
 *
 * @param conn - JSforce connection with valid access token
 * @returns Array of all components
 */
export async function fetchAllComponents(conn: Connection): Promise<ComponentInsert[]> {
	console.log('[Salesforce] Starting comprehensive component fetch...');

	const allComponents: ComponentInsert[] = [];

	try {
		// Fetch all component types in parallel for better performance
		const [lwcs, apexClasses, customObjects, customFields, triggers, visualforcePages, flows] = await Promise.all([
			fetchLightningComponents(conn),
			fetchApexClasses(conn),
			fetchCustomObjects(conn),
			fetchCustomFields(conn),
			fetchTriggers(conn),
			fetchVisualforcePages(conn),
			fetchFlows(conn)
		]);

		allComponents.push(...lwcs, ...apexClasses, ...customObjects, ...customFields, ...triggers, ...visualforcePages, ...flows);

		console.log(`[Salesforce] Total components fetched: ${allComponents.length}`);
		console.log(`[Salesforce] Breakdown:`, {
			lwc: lwcs.length,
			apex: apexClasses.length,
			object: customObjects.length,
			field: customFields.length,
			trigger: triggers.length,
			visualforce: visualforcePages.length,
			flow: flows.length
		});

		return allComponents;
	} catch (error) {
		console.error('[Salesforce] Error fetching all components:', error);
		throw error;
	}
}

