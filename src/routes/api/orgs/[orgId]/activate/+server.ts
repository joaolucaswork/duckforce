import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization } from '$lib/server/db/organizations';
import { setActiveSession } from '$lib/server/db/session';

/**
 * POST /api/orgs/[orgId]/activate
 * 
 * Switch to a cached organization (make it the active session)
 * 
 * Path parameters:
 * - orgId: Salesforce organization ID
 * 
 * Returns:
 * {
 *   success: boolean,
 *   organization: {
 *     id: string,
 *     org_id: string,
 *     org_name: string,
 *     instance_url: string
 *   }
 * }
 * 
 * This endpoint:
 * 1. Validates that the organization exists and belongs to the user
 * 2. Sets it as the active session using cached tokens
 * 3. Returns the organization details
 * 
 * Note: The organization must have valid cached tokens.
 * If tokens are expired, use the sync endpoint first to refresh them.
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	// TODO: Implement proper user authentication
	const userId = (locals as any).user?.id || 'demo-user';
	const { orgId } = params;

	if (!orgId) {
		throw error(400, 'Organization ID is required');
	}

	try {
		// Get organization from cache
		const org = await getOrganization(userId, orgId);

		if (!org) {
			throw error(404, 'Organization not found');
		}

		// Validate that we have tokens
		if (!org.access_token || !org.refresh_token) {
			throw error(400, 'Organization tokens are missing. Please reconnect to this organization.');
		}

		// Set as active session
		await setActiveSession(userId, org.id, {
			accessToken: org.access_token,
			refreshToken: org.refresh_token,
			instanceUrl: org.instance_url
		});

		return json({
			success: true,
			organization: {
				id: org.id,
				org_id: org.org_id,
				org_name: org.org_name,
				instance_url: org.instance_url,
				org_type: org.org_type
			}
		});
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error activating organization:', err);
		throw error(500, 'Failed to activate organization');
	}
};

