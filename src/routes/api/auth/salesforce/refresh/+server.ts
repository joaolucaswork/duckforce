import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createOAuth2Client, refreshAccessToken } from '$lib/server/salesforce/oauth';
import {
	getOrgSessionCookies,
	updateAccessToken,
	type OrgType
} from '$lib/server/salesforce/cookies';
import {
	SALESFORCE_CLIENT_ID,
	SALESFORCE_CLIENT_SECRET,
	SALESFORCE_CALLBACK_URL,
	SALESFORCE_LOGIN_URL
} from '$env/static/private';

/**
 * Refresh access token for a specific org
 *
 * Request body (JSON):
 * {
 *   org: 'source' | 'target' (required) - which org to refresh
 *   // or
 *   role: 'source' | 'target' (alternative to org)
 * }
 *
 * Returns:
 * {
 *   success: boolean,
 *   error?: string
 * }
 */
export const POST: RequestHandler = async ({ request, cookies }) => {
	// Read org/role from JSON body
	let body: { org?: string; role?: string };
	try {
		body = await request.json();
	} catch (err) {
		throw error(400, 'Invalid JSON body');
	}

	// Accept either 'org' or 'role' parameter
	const orgParam = body.org || body.role;
	if (!orgParam || (orgParam !== 'source' && orgParam !== 'target')) {
		throw error(400, 'Invalid or missing "org" or "role" parameter in request body. Must be "source" or "target".');
	}
	const org: OrgType = orgParam as OrgType;

	// Validate environment variables
	if (!SALESFORCE_CLIENT_ID || !SALESFORCE_CLIENT_SECRET || !SALESFORCE_CALLBACK_URL || !SALESFORCE_LOGIN_URL) {
		throw error(500, 'Salesforce OAuth configuration incomplete');
	}

	// Get current session
	const session = getOrgSessionCookies(cookies, org);
	if (!session.refreshToken) {
		return json({
			success: false,
			error: 'No refresh token found. Please re-authenticate.'
		}, { status: 401 });
	}

	try {
		// Determine login URL based on stored orgType
		const loginUrl = session.orgType === 'sandbox'
			? 'https://test.salesforce.com'
			: SALESFORCE_LOGIN_URL;

		// Create OAuth2 client
		// Pass undefined instead of empty string if client secret not provided
		const oauth2 = createOAuth2Client(
			loginUrl,
			SALESFORCE_CLIENT_ID,
			SALESFORCE_CLIENT_SECRET || undefined as any,
			SALESFORCE_CALLBACK_URL
		);

		// Refresh the access token
		const tokens = await refreshAccessToken(oauth2, session.refreshToken);

		// Update access token cookie (tokens stay server-side only)
		updateAccessToken(cookies, org, tokens.accessToken);

		return json({
			success: true
			// Don't return tokens - they're stored in httpOnly cookies
		});
	} catch (err) {
		console.error('Token refresh error:', err);
		return json({
			success: false,
			error: 'Failed to refresh access token. Please re-authenticate.'
		}, { status: 401 });
	}
};

