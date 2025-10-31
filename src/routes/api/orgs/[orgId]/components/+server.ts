import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization } from '$lib/server/db/organizations';
import { getCachedComponents, getComponentStatusCounts } from '$lib/server/db/components';
import type { ComponentResponse } from '$lib/server/db/types';

/**
 * GET /api/orgs/[orgId]/components
 * 
 * Get cached components for an organization
 * 
 * Path parameters:
 * - orgId: Salesforce organization ID
 * 
 * Query parameters:
 * - type: Filter by component type (lwc, field, object, apex, trigger, visualforce, flow)
 * - search: Search by name or API name
 * - status: Filter by migration status (pending, in-progress, completed, blocked, skipped)
 * - includeStats: Include component status statistics (default: false)
 * 
 * Returns:
 * {
 *   components: ComponentResponse[],
 *   stats?: {
 *     pending: number,
 *     inProgress: number,
 *     completed: number,
 *     blocked: number,
 *     skipped: number,
 *     total: number
 *   }
 * }
 * 
 * Each component includes:
 * - id: Database UUID
 * - component_id: Salesforce component ID
 * - api_name: Component API name
 * - name: Component display name
 * - type: Component type
 * - description: Component description (optional)
 * - namespace: Component namespace (optional)
 * - migration_status: Current migration status
 * - migration_date: Date migrated (if completed)
 * - dependencies: Array of component dependencies
 * - dependents: Array of components that depend on this one
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const { orgId } = params;

	if (!orgId) {
		throw error(400, 'Organization ID is required');
	}

	// Parse query parameters
	const typeParam = url.searchParams.get('type');
	const searchParam = url.searchParams.get('search');
	const statusParam = url.searchParams.get('status');
	const includeStats = url.searchParams.get('includeStats') === 'true';

	// Validate type parameter if provided
	const validTypes = ['lwc', 'field', 'object', 'apex', 'trigger', 'visualforce', 'flow'];
	if (typeParam && !validTypes.includes(typeParam)) {
		throw error(400, `Invalid type parameter. Must be one of: ${validTypes.join(', ')}`);
	}

	// Validate status parameter if provided
	const validStatuses = ['pending', 'in-progress', 'completed', 'blocked', 'skipped'];
	if (statusParam && !validStatuses.includes(statusParam)) {
		throw error(400, `Invalid status parameter. Must be one of: ${validStatuses.join(', ')}`);
	}

	try {
		// Get organization from cache
		const org = await getOrganization(userId, orgId);

		if (!org) {
			throw error(404, 'Organization not found');
		}

		// Build filters
		const filters: any = {};
		if (typeParam) {
			filters.type = typeParam as any;
		}
		if (searchParam) {
			filters.search = searchParam;
		}
		if (statusParam) {
			filters.migrationStatus = statusParam as any;
		}

		// Fetch cached components
		const components = await getCachedComponents(org.id, filters);

		// Transform to response format (exclude organization_id and internal metadata)
		const componentResponses: ComponentResponse[] = components.map((comp) => ({
			id: comp.id,
			component_id: comp.component_id,
			api_name: comp.api_name,
			name: comp.name,
			type: comp.type,
			description: comp.description,
			namespace: comp.namespace,
			migration_status: comp.migration_status,
			migration_date: comp.migration_date,
			dependencies: comp.dependencies,
			dependents: comp.dependents
		}));

		// Build response
		const response: any = {
			components: componentResponses,
			count: componentResponses.length,
			organization: {
				id: org.id,
				org_id: org.org_id,
				org_name: org.org_name,
				last_synced_at: org.last_synced_at
			}
		};

		// Include stats if requested
		if (includeStats) {
			const stats = await getComponentStatusCounts(org.id);
			response.stats = stats;
		}

		return json(response);
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error fetching cached components:', err);
		throw error(500, 'Failed to fetch cached components');
	}
};

