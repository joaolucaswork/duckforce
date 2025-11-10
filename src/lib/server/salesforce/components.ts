/**
 * Salesforce Component Fetching Functions
 * 
 * This module provides functions to fetch various types of components
 * from Salesforce using the Tooling API and Metadata API.
 */

import { Connection } from '@jsforce/jsforce-node';
import type { ComponentInsert } from '../db/types';
import type { LWCUsageMetadata, LWCUsageLocation } from '$lib/types/salesforce';

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

		// First, fetch all custom objects to build a map of ID -> API name
		console.log('[Salesforce] Building object ID to API name map...');
		const objectsResult = await conn.tooling.query(
			`SELECT Id, DeveloperName, NamespacePrefix
			 FROM CustomObject
			 WHERE ManageableState IN ('unmanaged', 'installed')
			 LIMIT 2000`
		);

		// Create map of object ID to API name
		const objectIdToApiName = new Map<string, string>();
		objectsResult.records.forEach((obj: any) => {
			const apiName = obj.NamespacePrefix
				? `${obj.NamespacePrefix}__${obj.DeveloperName}__c`
				: `${obj.DeveloperName}__c`;
			objectIdToApiName.set(obj.Id, apiName);
		});

		console.log(`[Salesforce] Built map with ${objectIdToApiName.size} custom objects`);

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

		const components: ComponentInsert[] = result.records.map((record: any) => {
			// Resolve TableEnumOrId to object API name
			// TableEnumOrId can be either an object ID or an object API name
			let objectApiName = record.TableEnumOrId;

			// If it looks like an ID (15-18 alphanumeric chars), try to resolve it
			if (record.TableEnumOrId.match(/^[0-9a-zA-Z]{15,18}$/)) {
				const resolvedName = objectIdToApiName.get(record.TableEnumOrId);
				if (resolvedName) {
					objectApiName = resolvedName;
				}
				// If not found in map, it might be a standard object ID
				// Keep the original TableEnumOrId as fallback
			}

			return {
				component_id: record.Id,
				api_name: record.NamespacePrefix
					? `${objectApiName}.${record.NamespacePrefix}__${record.DeveloperName}__c`
					: `${objectApiName}.${record.DeveloperName}__c`,
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
			};
		});

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

/**
 * Fetch usage metadata for Lightning Web Components
 *
 * Queries the MetadataComponentDependency table to find where LWCs are used
 * (FlexiPages, Flows, QuickActions, etc.)
 *
 * @param conn - JSforce connection with valid access token
 * @param lwcComponentIds - Array of LWC component IDs to fetch usage for
 * @returns Map of component ID to usage metadata
 */
export async function fetchLWCUsageMetadata(
	conn: Connection,
	lwcComponentIds: string[]
): Promise<Map<string, LWCUsageMetadata>> {
	try {
		if (lwcComponentIds.length === 0) {
			return new Map();
		}

		console.log(`[Salesforce] Fetching usage metadata for ${lwcComponentIds.length} LWC components...`);

		// Query MetadataComponentDependency to find where LWCs are used
		// RefMetadataComponentId is the LWC component ID
		// MetadataComponentId is the parent component (FlexiPage, Flow, etc.)
		const idList = lwcComponentIds.map(id => `'${id}'`).join(',');
		const query = `
			SELECT MetadataComponentId,
			       MetadataComponentName,
			       MetadataComponentType,
			       RefMetadataComponentId,
			       RefMetadataComponentName,
			       RefMetadataComponentType
			FROM MetadataComponentDependency
			WHERE RefMetadataComponentType = 'LightningComponentBundle'
			  AND RefMetadataComponentId IN (${idList})
		`;

		const result = await conn.tooling.query(query);

		console.log(`[Salesforce] Found ${result.records.length} usage references`);

		// Group usage locations by LWC component ID
		const usageMap = new Map<string, LWCUsageLocation[]>();

		result.records.forEach((record: any) => {
			const lwcId = record.RefMetadataComponentId;

			if (!usageMap.has(lwcId)) {
				usageMap.set(lwcId, []);
			}

			// Determine the type and subType based on MetadataComponentType
			let locationType: LWCUsageLocation['type'] = 'Other';
			let subType: string | undefined;

			switch (record.MetadataComponentType) {
				case 'FlexiPage':
					locationType = 'FlexiPage';
					// Try to determine subType from metadata if available
					// This would require additional queries, so we'll leave it undefined for now
					break;
				case 'Flow':
					locationType = 'Flow';
					break;
				case 'QuickAction':
					locationType = 'QuickAction';
					break;
				case 'CustomApplication':
					locationType = 'CustomApplication';
					break;
				default:
					locationType = 'Other';
			}

			usageMap.get(lwcId)!.push({
				id: record.MetadataComponentId,
				name: record.MetadataComponentName,
				type: locationType,
				subType
			});
		});

		// Convert to final format with usage metadata
		const metadataMap = new Map<string, LWCUsageMetadata>();

		usageMap.forEach((locations, lwcId) => {
			metadataMap.set(lwcId, {
				locations,
				totalUsageCount: locations.length
			});
		});

		console.log(`[Salesforce] Processed usage metadata for ${metadataMap.size} LWC components`);

		return metadataMap;
	} catch (error) {
		console.error('[Salesforce] Error fetching LWC usage metadata:', error);
		// Don't throw - return empty map to allow dependency analysis to continue
		console.warn('[Salesforce] Continuing without usage metadata');
		return new Map();
	}
}

