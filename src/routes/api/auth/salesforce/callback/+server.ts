import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createOAuth2Client,
	exchangeCodeForTokens,
	generateCodeChallenge
} from '$lib/server/salesforce/oauth';
import {
	getOAuthStateCookies,
	clearOAuthStateCookies,
	setOrgSessionCookies,
	type OrgType
} from '$lib/server/salesforce/cookies';
import {
	getClientIdForOrg,
	getClientSecret,
	getCallbackUrl,
	getLoginUrl
} from '$lib/server/salesforce/config';
import { Connection } from '@jsforce/jsforce-node';
import { upsertOrganization } from '$lib/server/db/organizations';
import { setActiveSession } from '$lib/server/db/session';
import { saveComponentsBatch } from '$lib/server/db/components';
import { fetchAllComponents } from '$lib/server/salesforce/components';

/**
 * Helper function to fetch and cache components in the background
 *
 * @param organizationId - The database ID (UUID) of the organization
 * @param instanceUrl - Salesforce instance URL
 * @param accessToken - Salesforce access token
 */
async function fetchAndCacheComponents(
	organizationId: string,
	instanceUrl: string,
	accessToken: string
): Promise<void> {
	try {
		console.log(`[Component Fetch] Starting for org ${organizationId}`);

		// Create a new connection for fetching components
		const conn = new Connection({
			instanceUrl,
			accessToken
		});

		// Fetch all components
		const components = await fetchAllComponents(conn);

		console.log(`[Component Fetch] Fetched ${components.length} components, saving to database`);

		// Save components to database
		await saveComponentsBatch(organizationId, components);

		console.log(`[Component Fetch] Successfully cached ${components.length} components for org ${organizationId}`);
	} catch (error) {
		console.error(`[Component Fetch] Error caching components for org ${organizationId}:`, error);
		// Don't throw - this is a background operation
	}
}

/**
 * Handle OAuth 2.0 callback from Salesforce
 *
 * Query parameters:
 * - code: Authorization code from Salesforce
 * - state: CSRF protection state
 *
 * Flow:
 * 1. Validate state parameter against stored cookie
 * 2. Exchange authorization code for tokens using PKCE verifier
 * 3. Save organization to Supabase database
 * 4. Set active session in Supabase
 * 5. Store tokens in secure httpOnly cookies (for backward compatibility)
 * 6. Clear temporary OAuth state cookies
 * 7. Redirect back to wizard with success/error status
 */
export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	// Get callback parameters
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const errorParam = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	// Log the authorization code (first/last chars only for security)
	console.log('[OAuth Callback] Received authorization code:', {
		codeLength: code?.length || 0,
		codeStart: code?.substring(0, 10),
		codeEnd: code?.substring(code.length - 10),
		stateLength: state?.length || 0
	});

	// Handle OAuth errors from Salesforce
	if (errorParam) {
		console.error('OAuth error from Salesforce:', errorParam, errorDescription);
		throw redirect(302, `/wizard?error=${encodeURIComponent(errorDescription || errorParam)}`);
	}

	// Validate required parameters
	if (!code || !state) {
		throw error(400, 'Missing required OAuth callback parameters');
	}

	// Determine which org is being authenticated by checking both source and target cookies
	let org: OrgType | null = null;
	let storedState: string | undefined;
	let codeVerifier: string | undefined;

	// Check source org cookies
	const sourceOAuthState = getOAuthStateCookies(cookies, 'source');
	if (sourceOAuthState.state === state) {
		org = 'source';
		storedState = sourceOAuthState.state;
		codeVerifier = sourceOAuthState.codeVerifier;
	}

	// Check target org cookies if not found in source
	if (!org) {
		const targetOAuthState = getOAuthStateCookies(cookies, 'target');
		if (targetOAuthState.state === state) {
			org = 'target';
			storedState = targetOAuthState.state;
			codeVerifier = targetOAuthState.codeVerifier;
		}
	}

	// Validate state and org
	if (!org || !storedState || !codeVerifier) {
		console.error('OAuth state validation failed:', { org, storedState: !!storedState, codeVerifier: !!codeVerifier });
		throw error(400, 'Invalid OAuth state. Please try again.');
	}

	// Verify code_verifier by recalculating code_challenge
	const recalculatedChallenge = generateCodeChallenge(codeVerifier);

	console.log(`[OAuth Callback - ${org}] State validated:`, {
		org,
		hasCodeVerifier: !!codeVerifier,
		codeVerifierLength: codeVerifier?.length,
		codeVerifierStart: codeVerifier?.substring(0, 10),
		codeVerifierEnd: codeVerifier?.substring(codeVerifier.length - 10),
		recalculatedChallenge: recalculatedChallenge
	});

	try {
		console.log(`[OAuth Callback - ${org}] Starting token exchange and org save`);

		// Determine login URL based on stored orgType
		const oauthState = org === 'source'
			? getOAuthStateCookies(cookies, 'source')
			: getOAuthStateCookies(cookies, 'target');

		// Get org-specific configuration
		const clientId = getClientIdForOrg(org);
		const clientSecret = getClientSecret();
		const callbackUrl = getCallbackUrl();
		const baseLoginUrl = getLoginUrl();

		const effectiveLoginUrl = oauthState.orgType === 'sandbox'
			? 'https://test.salesforce.com'
			: baseLoginUrl;

		// Create OAuth2 client with org-specific Client ID
		// Client secret is optional when using PKCE
		// Pass undefined instead of empty string if not provided
		const oauth2 = createOAuth2Client(
			effectiveLoginUrl,
			clientId,
			clientSecret || undefined as any,
			callbackUrl
		);

		// Exchange authorization code for tokens
		console.log(`[OAuth Callback - ${org}] Exchanging code for tokens`);
		const tokens = await exchangeCodeForTokens(oauth2, code, codeVerifier);
		console.log(`[OAuth Callback - ${org}] Tokens received successfully`);

		// Fetch identity information to get org ID and name
		let orgId: string | undefined;
		let orgName: string | undefined;

		try {
			console.log(`[OAuth Callback - ${org}] Fetching org identity`);
			const conn = new Connection({
				instanceUrl: tokens.instanceUrl,
				accessToken: tokens.accessToken
			});

			const identity = await conn.identity();
			orgId = identity.organization_id;
			// Use provided orgName from OAuth state, or fall back to identity org name
			orgName = oauthState.orgName || identity.display_name || undefined;
			console.log(`[OAuth Callback - ${org}] Identity fetched:`, { orgId, orgName });
		} catch (identityError) {
			console.error('Failed to fetch identity (non-fatal):', identityError);
			// Continue without org metadata if identity fetch fails
			orgName = oauthState.orgName;
		}

		// Validate that we have required org information
		if (!orgId) {
			throw new Error('Failed to retrieve organization ID from Salesforce');
		}

		// Get user ID (TODO: Replace with actual user authentication)
		const userId = (locals as any).user?.id || 'demo-user';
		console.log(`[OAuth Callback - ${org}] User ID:`, userId);

		// Save organization to Supabase
		console.log(`[OAuth Callback - ${org}] Saving organization to Supabase`);
		const savedOrg = await upsertOrganization(userId, {
			org_id: orgId,
			instance_url: tokens.instanceUrl,
			org_name: orgName || 'Salesforce Organization',
			org_type: (oauthState.orgType as 'production' | 'sandbox' | 'developer' | 'scratch') || 'production',
			color: oauthState.color || null,
			icon: oauthState.icon || null,
			access_token: tokens.accessToken,
			refresh_token: tokens.refreshToken,
			token_expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
			api_version: '60.0'
		});
		console.log(`[OAuth Callback - ${org}] Organization saved to Supabase:`, savedOrg.id);

		// Set as active session
		console.log(`[OAuth Callback - ${org}] Setting active session`);
		await setActiveSession(userId, savedOrg.id, {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			instanceUrl: tokens.instanceUrl
		});
		console.log(`[OAuth Callback - ${org}] Active session set`);

		// Fetch and cache all components from the org
		// This runs in the background - we don't wait for it to complete
		// to avoid long wait times during OAuth callback
		console.log(`[OAuth Callback - ${org}] Starting background component fetch`);
		fetchAndCacheComponents(savedOrg.id, tokens.instanceUrl, tokens.accessToken)
			.then(() => {
				console.log(`[OAuth Callback - ${org}] Background component fetch completed`);
			})
			.catch((error) => {
				console.error(`[OAuth Callback - ${org}] Background component fetch failed:`, error);
			});

		// Store tokens and org metadata in secure cookies (for backward compatibility)
		setOrgSessionCookies(cookies, org, {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			instanceUrl: tokens.instanceUrl,
			orgId,
			orgName,
			orgType: oauthState.orgType,
			color: oauthState.color,
			icon: oauthState.icon
		});

		// Clear temporary OAuth state cookies
		clearOAuthStateCookies(cookies, org);

		console.log(`[OAuth Callback - ${org}] OAuth flow completed successfully`);
		// Redirect back to wizard with success indicator
		throw redirect(302, `/wizard?connected=${org}`);
	} catch (err) {
		if (err instanceof Response) {
			throw err; // Re-throw redirect
		}
		console.error(`[OAuth Callback - ${org}] Error:`, err);

		// Clear temporary OAuth state cookies on error
		if (org) {
			clearOAuthStateCookies(cookies, org);
		}

		const errorMessage = err instanceof Error ? err.message : 'Failed to complete authentication';
		throw redirect(302, `/wizard?error=${encodeURIComponent(errorMessage)}`);
	}
};

