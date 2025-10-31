import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization, updateOrganizationTokens } from '$lib/server/db/organizations';
import { createOAuth2Client, refreshAccessToken } from '$lib/server/salesforce/oauth';
import { getActiveSessionOnly, updateActiveSessionTokens } from '$lib/server/db/session';
import { saveComponentsBatch } from '$lib/server/db/components';
import { fetchAllComponents } from '$lib/server/salesforce/components';
import { Connection } from '@jsforce/jsforce-node';
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
 * Query parameters:
 * - refreshComponents: If 'true', also re-fetch all components from Salesforce (default: false)
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
 *   },
 *   componentsFetched?: number
 * }
 *
 * This endpoint:
 * 1. Refreshes the OAuth access token using the refresh token
 * 2. Updates the cached tokens in the database
 * 3. If this is the active organization, updates the active session tokens
 * 4. Optionally re-fetches all components from Salesforce
 * 5. Returns the updated organization details
 */
export const POST: RequestHandler = async ({ params, locals, url }) => {
	console.log('='.repeat(80));
	console.log('[Sync] POST /api/orgs/[orgId]/sync endpoint called');
	console.log('[Sync] Params:', params);
	console.log('[Sync] URL:', url.toString());
	console.log('='.repeat(80));

	const userId = locals.user?.id;
	console.log('[Sync] User ID:', userId);

	if (!userId) {
		console.error('[Sync] No user ID - Unauthorized');
		throw error(401, 'Unauthorized');
	}

	const { orgId } = params;
	console.log('[Sync] Org ID from params:', orgId);

	if (!orgId) {
		console.error('[Sync] No org ID provided');
		throw error(400, 'Organization ID is required');
	}

	// Check if we should refresh components
	const refreshComponents = url.searchParams.get('refreshComponents') === 'true';
	console.log('[Sync] Refresh components:', refreshComponents);

	// Validate environment variables
	console.log('[Sync] Validating environment variables...');
	console.log('[Sync] SALESFORCE_CLIENT_ID:', SALESFORCE_CLIENT_ID ? 'SET' : 'NOT SET');
	console.log('[Sync] SALESFORCE_CLIENT_SECRET:', SALESFORCE_CLIENT_SECRET ? 'SET' : 'NOT SET');
	console.log('[Sync] SALESFORCE_CALLBACK_URL:', SALESFORCE_CALLBACK_URL ? 'SET' : 'NOT SET');
	console.log('[Sync] SALESFORCE_LOGIN_URL:', SALESFORCE_LOGIN_URL ? 'SET' : 'NOT SET');

	if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CALLBACK_URL || !SALESFORCE_LOGIN_URL) {
		console.error('[Sync] Missing required Salesforce OAuth configuration');
		throw error(500, 'Salesforce OAuth configuration incomplete');
	}

	try {
		console.log(`[Sync] Starting sync for org ${orgId}, refreshComponents=${refreshComponents}`);

		// Get organization from cache
		console.log(`[Sync] Fetching organization from database...`);
		const org = await getOrganization(userId, orgId);
		console.log(`[Sync] Organization fetch result:`, org ? 'FOUND' : 'NOT FOUND');

		if (!org) {
			console.error(`[Sync] Organization not found: ${orgId}`);
			throw error(404, 'Organization not found');
		}

		console.log(`[Sync] Found org: ${org.org_name} (${org.id})`);

		// Validate that we have a refresh token
		if (!org.refresh_token) {
			console.error(`[Sync] No refresh token for org: ${orgId}`);
			throw error(400, 'No refresh token found. Please reconnect to this organization.');
		}

		// Determine login URL based on org type
		const loginUrl = org.org_type === 'sandbox'
			? 'https://test.salesforce.com'
			: SALESFORCE_LOGIN_URL;

		console.log(`[Sync] Using login URL: ${loginUrl}`);

		// Create OAuth2 client
		const oauth2 = createOAuth2Client(
			loginUrl,
			SALESFORCE_CLIENT_ID,
			SALESFORCE_CLIENT_SECRET || undefined as any,
			SALESFORCE_CALLBACK_URL
		);

		console.log(`[Sync] Refreshing access token...`);
		// Refresh the access token
		const tokens = await refreshAccessToken(oauth2, org.refresh_token);
		console.log(`[Sync] Access token refreshed successfully`);

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

		// Optionally refresh components from Salesforce
		let componentsFetched: number | undefined;
		if (refreshComponents) {
			console.log(`[Sync] Refreshing components for org ${org.id}`);
			try {
				// Create a new connection for fetching components
				console.log(`[Sync] Creating connection with instanceUrl: ${tokens.instanceUrl}`);
				const conn = new Connection({
					instanceUrl: tokens.instanceUrl,
					accessToken: tokens.accessToken
				});

				// Fetch all components
				console.log(`[Sync] Fetching all components from Salesforce...`);
				const components = await fetchAllComponents(conn);
				console.log(`[Sync] Fetched ${components.length} components`);

				// Save components to database
				console.log(`[Sync] Saving components to database...`);
				await saveComponentsBatch(org.id, components);
				componentsFetched = components.length;
				console.log(`[Sync] Successfully cached ${components.length} components`);
			} catch (compError: any) {
				console.error('[Sync] Error refreshing components:', compError);
				console.error('[Sync] Error details:', {
					message: compError?.message,
					stack: compError?.stack,
					name: compError?.name
				});
				// Re-throw the error so it's properly handled
				throw new Error(`Failed to refresh components: ${compError?.message || 'Unknown error'}`);
			}
		}

		const response: any = {
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
		};

		if (componentsFetched !== undefined) {
			response.componentsFetched = componentsFetched;
		}

		return json(response);
	} catch (err: any) {
		console.error('='.repeat(80));
		console.error('[Sync] CAUGHT ERROR in sync endpoint');
		console.error('[Sync] Error type:', typeof err);
		console.error('[Sync] Error:', err);
		console.error('[Sync] Error status:', err?.status);
		console.error('[Sync] Error message:', err?.message);
		console.error('[Sync] Error stack:', err?.stack);
		console.error('[Sync] Error name:', err?.name);
		console.error('='.repeat(80));

		if (err.status) {
			throw err;
		}

		console.error('[Sync] Error syncing organization:', err);
		console.error('[Sync] Error details:', {
			message: err.message,
			stack: err.stack,
			name: err.name
		});

		// Check if it's a token refresh error
		if (err.message?.includes('refresh')) {
			throw error(401, 'Failed to refresh tokens. Please reconnect to this organization.');
		}

		throw error(500, `Failed to sync organization: ${err.message || 'Unknown error'}`);
	}
};

