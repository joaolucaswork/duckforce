import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { revokeToken } from '$lib/server/salesforce/oauth';
import {
	getOrgSessionCookies,
	clearOrgSessionCookies,
	clearOAuthStateCookies,
	type OrgType
} from '$lib/server/salesforce/cookies';
import { SALESFORCE_LOGIN_URL } from '$env/static/private';
import { clearActiveSession } from '$lib/server/db/session';

/**
 * Logout and revoke Salesforce OAuth tokens
 *
 * Query parameters:
 * - org: 'source' | 'target' (optional, defaults to 'source') - which org to logout from
 *   Note: In the new single-login model, this clears the active session
 *
 * Flow:
 * 1. Get current session tokens
 * 2. Revoke refresh token with Salesforce (preferred over access token)
 * 3. Clear all session cookies
 * 4. Clear active session from Supabase
 *
 * Returns:
 * {
 *   success: boolean,
 *   error?: string
 * }
 */
export const POST: RequestHandler = async ({ url, cookies, locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	// Get org type from query parameter (defaults to 'source' for backward compatibility)
	const orgParam = url.searchParams.get('org') || 'source';
	if (orgParam !== 'source' && orgParam !== 'target') {
		throw error(400, 'Invalid "org" parameter. Must be "source" or "target".');
	}
	const org: OrgType = orgParam as OrgType;

	// Validate environment variables
	if (!SALESFORCE_LOGIN_URL) {
		throw error(500, 'Salesforce OAuth configuration incomplete');
	}

	// Get current session
	const session = getOrgSessionCookies(cookies, org);

	// Attempt to revoke refresh token first (preferred), then access token
	// Revoking the refresh token also invalidates the access token
	const tokenToRevoke = session.refreshToken || session.accessToken;

	if (tokenToRevoke) {
		try {
			// Determine login URL based on stored orgType
			const loginUrl = session.orgType === 'sandbox'
				? 'https://test.salesforce.com'
				: SALESFORCE_LOGIN_URL;

			await revokeToken(loginUrl, tokenToRevoke);
		} catch (err) {
			console.error('Token revocation error (non-fatal):', err);
			// Don't fail the logout if revocation fails
			// We'll still clear cookies below
		}
	}

	// Clear cookies after revocation attempt
	clearOrgSessionCookies(cookies, org);

	// Also clear any temporary OAuth state cookies
	clearOAuthStateCookies(cookies, org);

	// Clear active session from Supabase
	try {
		await clearActiveSession(userId);
	} catch (err) {
		console.error('Error clearing active session from Supabase (non-fatal):', err);
		// Don't fail the logout if Supabase clear fails
	}

	return json({
		success: true
	});
};

