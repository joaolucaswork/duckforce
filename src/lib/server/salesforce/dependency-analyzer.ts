/**
 * Salesforce Dependency Analyzer
 * 
 * Analyzes Salesforce components to discover dependencies between them.
 * This is a simplified implementation that uses metadata and naming conventions
 * to identify likely dependencies.
 * 
 * For a production implementation, this would need to:
 * - Fetch and parse actual source code (LWC JavaScript, Apex classes)
 * - Parse SOQL queries to find object/field references
 * - Analyze formula fields and validation rules
 * - Parse LWC templates for field bindings
 */

import type { SalesforceComponent } from '$lib/types/salesforce';
import type { Dependency } from '$lib/types/salesforce';
import { isStandardComponent, isCustomFieldOnStandardObject, groupCustomFieldsByStandardObject } from './component-utils';

export interface DependencyAnalysisResult {
	componentId: string;
	dependencies: Dependency[];
	analysisNotes: string[];
}

export interface StandardObjectWithFields {
	objectName: string;
	customFields: SalesforceComponent[];
}

export interface CategorizedDependencies {
	customDependencies: SalesforceComponent[];
	standardObjectsWithFields: StandardObjectWithFields[];
	analysisNotes: Record<string, string[]>;
}

/**
 * Analyze a component to discover its dependencies
 * 
 * @param component - The component to analyze
 * @param allComponents - All available components in the org (for reference lookup)
 * @returns Analysis result with discovered dependencies
 */
export function analyzeComponentDependencies(
	component: SalesforceComponent,
	allComponents: SalesforceComponent[]
): DependencyAnalysisResult {
	const dependencies: Dependency[] = [];
	const analysisNotes: string[] = [];

	// Create lookup maps for quick reference
	const componentsByApiName = new Map<string, SalesforceComponent>();
	const componentsByType = new Map<string, SalesforceComponent[]>();
	
	allComponents.forEach(comp => {
		componentsByApiName.set(comp.apiName, comp);
		
		if (!componentsByType.has(comp.type)) {
			componentsByType.set(comp.type, []);
		}
		componentsByType.get(comp.type)!.push(comp);
	});

	// Analyze based on component type
	switch (component.type) {
		case 'lwc':
			analyzeLWCDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'apex':
			analyzeApexDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'object':
			analyzeObjectDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'field':
			analyzeFieldDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'trigger':
			analyzeTriggerDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'visualforce':
			analyzeVisualforceDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
		case 'flow':
			analyzeFlowDependencies(component, componentsByApiName, componentsByType, dependencies, analysisNotes);
			break;
	}

	return {
		componentId: component.id,
		dependencies,
		analysisNotes
	};
}

/**
 * Analyze LWC dependencies
 * 
 * LWCs typically depend on:
 * - Apex classes (for @wire and imperative calls)
 * - Custom objects and fields (for data binding)
 * - Static resources
 * - Custom labels
 */
function analyzeLWCDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('LWC dependency analysis: Basic metadata-based analysis');
	
	// For now, we can't analyze actual dependencies without the source code
	// In a full implementation, we would:
	// 1. Fetch the JavaScript file using Tooling API
	// 2. Parse import statements to find Apex class references
	// 3. Parse @wire decorators
	// 4. Parse template to find field references
	
	analysisNotes.push('Note: Full LWC dependency analysis requires source code parsing (not yet implemented)');
}

/**
 * Analyze Apex class dependencies
 * 
 * Apex classes typically depend on:
 * - Other Apex classes
 * - Custom objects (via SOQL and DML)
 * - Custom fields
 * - Triggers
 */
function analyzeApexDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Apex dependency analysis: Basic metadata-based analysis');
	
	// For now, we can't analyze actual dependencies without the source code
	// In a full implementation, we would:
	// 1. Fetch the Body (source code) using Tooling API
	// 2. Parse SOQL queries to find object references
	// 3. Parse DML operations
	// 4. Parse class instantiations and method calls
	
	analysisNotes.push('Note: Full Apex dependency analysis requires source code parsing (not yet implemented)');
}

/**
 * Analyze Custom Object dependencies
 *
 * Custom objects depend on:
 * - Custom fields (owned by the object)
 * - Related objects (via lookup/master-detail relationships)
 * - Triggers
 * - Validation rules
 */
function analyzeObjectDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Object dependency analysis: Finding related fields');

	// Find all custom fields that belong to this object
	const objectApiName = component.apiName;
	const fields = componentsByType.get('field') || [];

	fields.forEach(field => {
		// Field API names are in format: ObjectName.FieldName__c
		if (field.apiName.startsWith(`${objectApiName}.`)) {
			dependencies.push({
				id: field.id,
				name: field.name,
				type: 'field',
				required: true // Fields are required for the object
			});
		}
	});

	if (dependencies.length > 0) {
		analysisNotes.push(`Found ${dependencies.length} custom fields for this object`);
	}
}

/**
 * Analyze Custom Field dependencies
 *
 * Custom fields depend on:
 * - The parent object
 * - Referenced objects (for lookup/master-detail fields)
 * - Other fields (for formula fields)
 */
function analyzeFieldDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Field dependency analysis: Finding parent object');

	// Extract object name from field API name (format: ObjectName.FieldName__c)
	const parts = component.apiName.split('.');
	if (parts.length === 2) {
		const objectApiName = parts[0];
		const parentObject = componentsByApiName.get(objectApiName);

		if (parentObject) {
			dependencies.push({
				id: parentObject.id,
				name: parentObject.name,
				type: 'object',
				required: true // Parent object is required
			});
			analysisNotes.push(`Found parent object: ${parentObject.name}`);
		}
	}
}

/**
 * Analyze Trigger dependencies
 *
 * Triggers depend on:
 * - The object they're defined on
 * - Apex classes (if they call helper classes)
 */
function analyzeTriggerDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Trigger dependency analysis: Basic metadata-based analysis');
	analysisNotes.push('Note: Full trigger dependency analysis requires source code parsing (not yet implemented)');
}

/**
 * Analyze Visualforce page dependencies
 *
 * Visualforce pages depend on:
 * - Apex controllers
 * - Custom objects and fields
 * - Other Visualforce components
 */
function analyzeVisualforceDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Visualforce dependency analysis: Basic metadata-based analysis');
	analysisNotes.push('Note: Full Visualforce dependency analysis requires source code parsing (not yet implemented)');
}

/**
 * Analyze Flow dependencies
 *
 * Flows depend on:
 * - Custom objects and fields
 * - Apex classes (for Apex actions)
 * - Other flows (for subflows)
 */
function analyzeFlowDependencies(
	component: SalesforceComponent,
	componentsByApiName: Map<string, SalesforceComponent>,
	componentsByType: Map<string, SalesforceComponent[]>,
	dependencies: Dependency[],
	analysisNotes: string[]
): void {
	analysisNotes.push('Flow dependency analysis: Basic metadata-based analysis');
	analysisNotes.push('Note: Full flow dependency analysis requires metadata parsing (not yet implemented)');
}

/**
 * Analyze dependencies for multiple components
 *
 * @param components - Components to analyze
 * @param allComponents - All available components for reference
 * @returns Map of component ID to analysis results
 */
export function analyzeBatchDependencies(
	components: SalesforceComponent[],
	allComponents: SalesforceComponent[]
): Map<string, DependencyAnalysisResult> {
	const results = new Map<string, DependencyAnalysisResult>();

	components.forEach(component => {
		const result = analyzeComponentDependencies(component, allComponents);
		results.set(component.id, result);
	});

	return results;
}

/**
 * Categorize discovered dependencies into custom components and standard objects with custom fields
 *
 * @param discoveredDependencies - All discovered dependencies
 * @param analysisNotes - Analysis notes for each component
 * @returns Categorized dependencies
 */
export function categorizeDependencies(
	discoveredDependencies: SalesforceComponent[],
	analysisNotes: Record<string, string[]>
): CategorizedDependencies {
	const customDependencies: SalesforceComponent[] = [];
	const customFieldsOnStandardObjects: SalesforceComponent[] = [];

	// Separate custom dependencies from custom fields on standard objects
	discoveredDependencies.forEach(dep => {
		// Skip standard components entirely (they don't need migration)
		if (isStandardComponent(dep)) {
			return;
		}

		// Check if this is a custom field on a standard object
		if (dep.type === 'field' && isCustomFieldOnStandardObject(dep)) {
			customFieldsOnStandardObjects.push(dep);
		} else {
			// This is a custom component (custom object, custom field on custom object, etc.)
			customDependencies.push(dep);
		}
	});

	// Group custom fields by their parent standard object
	const standardObjectsMap = groupCustomFieldsByStandardObject(customFieldsOnStandardObjects);
	const standardObjectsWithFields: StandardObjectWithFields[] = Array.from(standardObjectsMap.entries()).map(
		([objectName, fields]) => ({
			objectName,
			customFields: fields
		})
	);

	return {
		customDependencies,
		standardObjectsWithFields,
		analysisNotes
	};
}

