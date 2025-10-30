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
 * 3. Store tokens in secure httpOnly cookies
 * 4. Clear temporary OAuth state cookies
 * 5. Redirect back to wizard with success/error status
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
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
		const tokens = await exchangeCodeForTokens(oauth2, code, codeVerifier);

		// Fetch identity information to get org ID and name
		let orgId: string | undefined;
		let orgName: string | undefined;

		try {
			const conn = new Connection({
				instanceUrl: tokens.instanceUrl,
				accessToken: tokens.accessToken
			});

			const identity = await conn.identity();
			orgId = identity.organization_id;
			// Use provided orgName from OAuth state, or fall back to identity org name
			orgName = oauthState.orgName || identity.display_name || undefined;
		} catch (identityError) {
			console.error('Failed to fetch identity (non-fatal):', identityError);
			// Continue without org metadata if identity fetch fails
			orgName = oauthState.orgName;
		}

		// Store tokens and org metadata in secure cookies
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

		// Redirect back to wizard with success indicator
		throw redirect(302, `/wizard?connected=${org}`);
	} catch (err) {
		if (err instanceof Response) {
			throw err; // Re-throw redirect
		}
		console.error('OAuth callback error:', err);

		// Clear temporary OAuth state cookies on error
		if (org) {
			clearOAuthStateCookies(cookies, org);
		}

		throw redirect(302, `/wizard?error=${encodeURIComponent('Failed to complete authentication')}`);
	}
};

