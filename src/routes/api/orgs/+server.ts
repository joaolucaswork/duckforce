import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserOrganizations } from '$lib/server/db/organizations';
import { getActiveSessionOnly } from '$lib/server/db/session';
import type { OrganizationResponse } from '$lib/server/db/types';

/**
 * GET /api/orgs
 * 
 * List all cached organizations for the current user
 * 
 * Returns:
 * {
 *   organizations: OrganizationResponse[],
 *   activeOrgId: string | null
 * }
 * 
 * Each organization includes:
 * - id: Database UUID
 * - org_id: Salesforce organization ID
 * - org_name: Organization name
 * - instance_url: Salesforce instance URL
 * - org_type: 'production' | 'sandbox' | 'developer' | 'scratch'
 * - color: UI color (optional)
 * - icon: UI icon (optional)
 * - api_version: Salesforce API version
 * - last_connected_at: Last connection timestamp
 * - last_synced_at: Last component sync timestamp (optional)
 * - is_active: Whether this is the currently active organization
 */
export const GET: RequestHandler = async ({ locals }) => {
	// TODO: Implement proper user authentication
	// For now, we'll use a placeholder user ID
	// In production, this should come from locals.user.id or session
	const userId = (locals as any).user?.id || 'demo-user';

	try {
		// Fetch all organizations for the user
		const organizations = await getUserOrganizations(userId);

		// Get the active session to mark which org is active
		const activeSession = await getActiveSessionOnly(userId);
		const activeOrgId = activeSession?.organization_id || null;

		// Transform to response format (exclude sensitive tokens)
		const orgResponses: OrganizationResponse[] = organizations.map((org) => ({
			id: org.id,
			org_id: org.org_id,
			org_name: org.org_name,
			instance_url: org.instance_url,
			org_type: org.org_type,
			color: org.color,
			icon: org.icon,
			api_version: org.api_version,
			last_connected_at: org.last_connected_at,
			last_synced_at: org.last_synced_at,
			is_active: org.id === activeOrgId
		}));

		return json({
			organizations: orgResponses,
			activeOrgId
		});
	} catch (err) {
		console.error('Error fetching organizations:', err);
		throw error(500, 'Failed to fetch organizations');
	}
};

