import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization, deleteOrganization } from '$lib/server/db/organizations';
import { getActiveSessionOnly, clearActiveSession } from '$lib/server/db/session';
import type { OrganizationResponse } from '$lib/server/db/types';

/**
 * GET /api/orgs/[orgId]
 * 
 * Get details for a specific organization
 * 
 * Path parameters:
 * - orgId: Salesforce organization ID
 * 
 * Returns:
 * {
 *   organization: OrganizationResponse
 * }
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const { orgId } = params;

	if (!orgId) {
		throw error(400, 'Organization ID is required');
	}

	try {
		// Fetch the organization
		const org = await getOrganization(userId, orgId);

		if (!org) {
			throw error(404, 'Organization not found');
		}

		// Get the active session to check if this org is active
		const activeSession = await getActiveSessionOnly(userId);
		const isActive = activeSession?.organization_id === org.id;

		// Transform to response format (exclude sensitive tokens)
		const orgResponse: OrganizationResponse = {
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
			is_active: isActive
		};

		return json({
			organization: orgResponse
		});
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error fetching organization:', err);
		throw error(500, 'Failed to fetch organization');
	}
};

/**
 * DELETE /api/orgs/[orgId]
 * 
 * Delete a cached organization and all its data
 * 
 * Path parameters:
 * - orgId: Salesforce organization ID
 * 
 * Returns:
 * {
 *   success: boolean,
 *   message: string
 * }
 * 
 * Note: If the deleted organization is the active session,
 * the active session will be cleared.
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const { orgId } = params;

	if (!orgId) {
		throw error(400, 'Organization ID is required');
	}

	try {
		// Check if the organization exists
		const org = await getOrganization(userId, orgId);

		if (!org) {
			throw error(404, 'Organization not found');
		}

		// Check if this is the active organization
		const activeSession = await getActiveSessionOnly(userId);
		const isActive = activeSession?.organization_id === org.id;

		// Delete the organization (this will cascade delete components)
		await deleteOrganization(userId, orgId);

		// If this was the active organization, clear the active session
		if (isActive) {
			await clearActiveSession(userId);
		}

		return json({
			success: true,
			message: `Organization "${org.org_name}" deleted successfully`,
			wasActive: isActive
		});
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error deleting organization:', err);
		throw error(500, 'Failed to delete organization');
	}
};

