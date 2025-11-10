import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCachedComponents } from '$lib/server/db/components';
import { analyzeComponentDependencies, categorizeDependencies } from '$lib/server/salesforce/dependency-analyzer';
import type { SalesforceComponent } from '$lib/types/salesforce';
import { getOrganization } from '$lib/server/db/organizations';
import { Connection } from '@jsforce/jsforce-node';
import { fetchLWCUsageMetadata } from '$lib/server/salesforce/components';

/**
 * POST /api/dependencies/analyze
 * 
 * Analyze dependencies for selected components
 * 
 * Request body:
 * {
 *   organizationId: string,
 *   componentIds: string[]
 * }
 * 
 * Returns:
 * {
 *   selectedComponents: SalesforceComponent[],
 *   customDependencies: SalesforceComponent[],
 *   standardObjectsWithFields: Array<{ objectName: string, customFields: SalesforceComponent[] }>,
 *   analysisNotes: Record<string, string[]>
 * }
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { organizationId, componentIds } = body;

		if (!organizationId || !Array.isArray(componentIds)) {
			throw error(400, 'Invalid request: organizationId and componentIds are required');
		}

		console.log(`[Dependency Analysis] Analyzing ${componentIds.length} components for org ${organizationId}`);

		// Fetch all components from the organization (needed for dependency lookup)
		const allComponents = await getCachedComponents(organizationId);
		
		console.log(`[Dependency Analysis] Loaded ${allComponents.length} total components from org`);

		// Convert database components to SalesforceComponent type
		const allComponentsTyped: SalesforceComponent[] = allComponents.map(comp => ({
			id: comp.id,
			name: comp.name,
			type: comp.type as any,
			apiName: comp.api_name,
			description: comp.description || undefined,
			namespace: comp.namespace || undefined,
			dependencies: Array.isArray(comp.dependencies) ? comp.dependencies : [],
			dependents: Array.isArray(comp.dependents) ? comp.dependents : [],
			migrationStatus: comp.migration_status as any,
			migrationDate: comp.migration_date ? new Date(comp.migration_date) : undefined,
			migrationNotes: comp.migration_notes || undefined,
			metadata: comp.metadata || {},
			sourceOrgId: organizationId // Set the source org ID for all components
		}));

		// Filter to get only the selected components
		const selectedComponents = allComponentsTyped.filter(c => componentIds.includes(c.id));
		
		console.log(`[Dependency Analysis] Found ${selectedComponents.length} selected components`);

		// Analyze dependencies for each selected component
		const discoveredDependenciesMap = new Map<string, SalesforceComponent>();
		const analysisNotes: Record<string, string[]> = {};

		selectedComponents.forEach(component => {
			console.log(`[Dependency Analysis] Analyzing component: ${component.name} (${component.type})`);
			
			const analysis = analyzeComponentDependencies(component, allComponentsTyped);
			
			// Store analysis notes
			analysisNotes[component.id] = analysis.analysisNotes;
			
			// Add discovered dependencies to the map (avoiding duplicates)
			analysis.dependencies.forEach(dep => {
				// Only add if not already selected and not already discovered
				if (!componentIds.includes(dep.id) && !discoveredDependenciesMap.has(dep.id)) {
					const depComponent = allComponentsTyped.find(c => c.id === dep.id);
					if (depComponent) {
						discoveredDependenciesMap.set(dep.id, depComponent);
						console.log(`[Dependency Analysis] Discovered dependency: ${depComponent.name} (${depComponent.type})`);
					}
				}
			});
		});

		const discoveredDependencies = Array.from(discoveredDependenciesMap.values());

		// Categorize dependencies into custom components and standard objects with custom fields
		const categorized = categorizeDependencies(discoveredDependencies, analysisNotes);

		// Fetch LWC usage metadata for all LWC components (selected + discovered)
		const allLWCComponents = [
			...selectedComponents.filter(c => c.type === 'lwc'),
			...categorized.customDependencies.filter(c => c.type === 'lwc')
		];

		let usageMetadataMap = new Map<string, any>();

		if (allLWCComponents.length > 0) {
			try {
				// Get organization to create Salesforce connection
				const org = await getOrganization(organizationId);

				if (org && org.access_token && org.instance_url) {
					// Create Salesforce connection
					const conn = new Connection({
						instanceUrl: org.instance_url,
						accessToken: org.access_token,
						version: org.api_version || '59.0'
					});

					// Extract component_id from metadata for each LWC
					const lwcComponentIds = allLWCComponents
						.map(c => c.metadata?.component_id)
						.filter(Boolean);

					if (lwcComponentIds.length > 0) {
						console.log(`[Dependency Analysis] Fetching usage metadata for ${lwcComponentIds.length} LWC components`);
						usageMetadataMap = await fetchLWCUsageMetadata(conn, lwcComponentIds);
					}
				} else {
					console.warn('[Dependency Analysis] No valid org credentials found, skipping usage metadata fetch');
				}
			} catch (err) {
				console.error('[Dependency Analysis] Error fetching LWC usage metadata:', err);
				// Continue without usage metadata
			}
		}

		// Attach usage metadata to LWC components
		const enrichedSelectedComponents = selectedComponents.map(comp => {
			if (comp.type === 'lwc' && comp.metadata?.component_id) {
				const usageMetadata = usageMetadataMap.get(comp.metadata.component_id);
				if (usageMetadata) {
					return { ...comp, usageMetadata };
				}
			}
			return comp;
		});

		const enrichedCustomDependencies = categorized.customDependencies.map(comp => {
			if (comp.type === 'lwc' && comp.metadata?.component_id) {
				const usageMetadata = usageMetadataMap.get(comp.metadata.component_id);
				if (usageMetadata) {
					return { ...comp, usageMetadata };
				}
			}
			return comp;
		});

		console.log(`[Dependency Analysis] Analysis complete:`, {
			selectedCount: enrichedSelectedComponents.length,
			customDependenciesCount: enrichedCustomDependencies.length,
			standardObjectsWithFieldsCount: categorized.standardObjectsWithFields.length,
			totalCustomFieldsOnStandardObjects: categorized.standardObjectsWithFields.reduce(
				(sum, obj) => sum + obj.customFields.length,
				0
			),
			lwcComponentsWithUsageMetadata: usageMetadataMap.size
		});

		return json({
			selectedComponents: enrichedSelectedComponents,
			customDependencies: enrichedCustomDependencies,
			standardObjectsWithFields: categorized.standardObjectsWithFields,
			analysisNotes: categorized.analysisNotes
		});

	} catch (err: any) {
		console.error('[Dependency Analysis] Error:', err);
		throw error(500, err.message || 'Failed to analyze dependencies');
	}
};

