/**
 * Salesforce Component Utilities
 * 
 * Helper functions for identifying and categorizing Salesforce components
 */

import type { SalesforceComponent } from '$lib/types/salesforce';

/**
 * List of common standard Salesforce objects
 * This is not exhaustive but covers the most common ones
 */
const STANDARD_OBJECTS = new Set([
	'Account',
	'Contact',
	'Lead',
	'Opportunity',
	'Case',
	'Task',
	'Event',
	'Campaign',
	'User',
	'Profile',
	'PermissionSet',
	'Group',
	'Role',
	'Territory',
	'Product2',
	'Pricebook2',
	'PricebookEntry',
	'Quote',
	'Contract',
	'Order',
	'OrderItem',
	'Asset',
	'Solution',
	'Idea',
	'Question',
	'Reply',
	'Attachment',
	'Document',
	'Folder',
	'ContentDocument',
	'ContentVersion',
	'ContentWorkspace',
	'FeedItem',
	'FeedComment',
	'ChatterMessage',
	'EmailMessage',
	'EmailTemplate',
	'Report',
	'Dashboard',
	'DashboardComponent'
]);

/**
 * Determine if a component is a standard Salesforce component
 * 
 * @param component - The component to check
 * @returns true if the component is a standard Salesforce component
 */
export function isStandardComponent(component: SalesforceComponent): boolean {
	// Custom objects always end with __c
	if (component.type === 'object') {
		// If it has a namespace, it's from a managed package (not standard)
		if (component.namespace) {
			return false;
		}
		
		// If API name ends with __c, it's custom
		if (component.apiName.endsWith('__c')) {
			return false;
		}
		
		// Check if it's in our list of known standard objects
		return STANDARD_OBJECTS.has(component.apiName);
	}
	
	// Custom fields end with __c
	if (component.type === 'field') {
		// Extract field name from API name (format: ObjectName.FieldName__c)
		const parts = component.apiName.split('.');
		if (parts.length === 2) {
			const fieldName = parts[1];
			// If field name ends with __c, it's a custom field
			return !fieldName.endsWith('__c');
		}
	}
	
	// For other component types (Apex, LWC, etc.)
	// If it has a namespace, it's from a managed package
	if (component.namespace) {
		return false;
	}
	
	// Apex classes, LWC, Triggers, Visualforce, Flows are never "standard"
	// They're either custom or from managed packages
	if (['apex', 'lwc', 'trigger', 'visualforce', 'flow'].includes(component.type)) {
		return false;
	}
	
	// Default to false (assume custom)
	return false;
}

/**
 * Determine if a custom field belongs to a standard object
 * 
 * @param field - The field component to check
 * @returns true if the field is a custom field on a standard object
 */
export function isCustomFieldOnStandardObject(field: SalesforceComponent): boolean {
	if (field.type !== 'field') {
		return false;
	}
	
	// Extract object name from field API name (format: ObjectName.FieldName__c)
	const parts = field.apiName.split('.');
	if (parts.length !== 2) {
		return false;
	}
	
	const objectName = parts[0];
	const fieldName = parts[1];
	
	// Check if field is custom (ends with __c) and object is standard
	const isCustomField = fieldName.endsWith('__c');
	const isStandardObject = STANDARD_OBJECTS.has(objectName) && !objectName.endsWith('__c');
	
	return isCustomField && isStandardObject;
}

/**
 * Extract the parent object name from a field's API name
 * 
 * @param fieldApiName - Field API name (format: ObjectName.FieldName__c)
 * @returns The parent object name, or null if invalid format
 */
export function getParentObjectName(fieldApiName: string): string | null {
	const parts = fieldApiName.split('.');
	if (parts.length === 2) {
		return parts[0];
	}
	return null;
}

/**
 * Group custom fields by their parent standard object
 * 
 * @param fields - Array of field components
 * @returns Map of standard object name to array of custom fields
 */
export function groupCustomFieldsByStandardObject(
	fields: SalesforceComponent[]
): Map<string, SalesforceComponent[]> {
	const grouped = new Map<string, SalesforceComponent[]>();
	
	fields.forEach(field => {
		if (isCustomFieldOnStandardObject(field)) {
			const objectName = getParentObjectName(field.apiName);
			if (objectName) {
				if (!grouped.has(objectName)) {
					grouped.set(objectName, []);
				}
				grouped.get(objectName)!.push(field);
			}
		}
	});
	
	return grouped;
}

