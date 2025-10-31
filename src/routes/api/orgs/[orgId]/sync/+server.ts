import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization, updateOrganizationTokens } from '$lib/server/db/organizations';
import { createOAuth2Client, refreshAccessToken } from '$lib/server/salesforce/oauth';
import { getActiveSessionOnly, updateActiveSessionTokens } from '$lib/server/db/session';
import {
	SALESFORCE_CLIENT_ID,
	SALESFORCE_CLIENT_SECRET,
	SALESFORCE_CALLBACK_URL,
	SALESFORCE_LOGIN_URL
} from '$env/static/private';

/**
 * POST /api/orgs/[orgId]/sync
 * 
 * Re-sync organization data and refresh tokens
 * 
 * Path parameters:
 * - orgId: Salesforce organization ID
 * 
 * Returns:
 * {
 *   success: boolean,
 *   message: string,
 *   organization: {
 *     id: string,
 *     org_id: string,
 *     org_name: string,
 *     instance_url: string
 *   }
 * }
 * 
 * This endpoint:
 * 1. Refreshes the OAuth access token using the refresh token
 * 2. Updates the cached tokens in the database
 * 3. If this is the active organization, updates the active session tokens
 * 4. Returns the updated organization details
 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	const { orgId } = params;

	if (!orgId) {
		throw error(400, 'Organization ID is required');
	}

	// Validate environment variables
	if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_CALLBACK_URL || !SALESFORCE_LOGIN_URL) {
		throw error(500, 'Salesforce OAuth configuration incomplete');
	}

	try {
		// Get organization from cache
		const org = await getOrganization(userId, orgId);

		if (!org) {
			throw error(404, 'Organization not found');
		}

		// Validate that we have a refresh token
		if (!org.refresh_token) {
			throw error(400, 'No refresh token found. Please reconnect to this organization.');
		}

		// Determine login URL based on org type
		const loginUrl = org.org_type === 'sandbox'
			? 'https://test.salesforce.com'
			: SALESFORCE_LOGIN_URL;

		// Create OAuth2 client
		const oauth2 = createOAuth2Client(
			loginUrl,
			SALESFORCE_CLIENT_ID,
			SALESFORCE_CLIENT_SECRET || undefined as any,
			SALESFORCE_CALLBACK_URL
		);

		// Refresh the access token
		const tokens = await refreshAccessToken(oauth2, org.refresh_token);

		// Calculate expiration (2 hours from now)
		const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

		// Update organization tokens in database
		await updateOrganizationTokens(
			userId,
			orgId,
			tokens.accessToken,
			org.refresh_token, // Keep the same refresh token
			expiresAt
		);

		// Check if this is the active organization
		const activeSession = await getActiveSessionOnly(userId);
		const isActive = activeSession?.organization_id === org.id;

		// If this is the active organization, update the active session tokens
		if (isActive) {
			await updateActiveSessionTokens(
				userId,
				tokens.accessToken,
				org.refresh_token,
				expiresAt
			);
		}

		return json({
			success: true,
			message: `Organization "${org.org_name}" synced successfully`,
			organization: {
				id: org.id,
				org_id: org.org_id,
				org_name: org.org_name,
				instance_url: tokens.instanceUrl,
				org_type: org.org_type
			},
			wasActive: isActive
		});
	} catch (err: any) {
		if (err.status) {
			throw err;
		}
		console.error('Error syncing organization:', err);
		
		// Check if it's a token refresh error
		if (err.message?.includes('refresh')) {
			throw error(401, 'Failed to refresh tokens. Please reconnect to this organization.');
		}
		
		throw error(500, 'Failed to sync organization');
	}
};

