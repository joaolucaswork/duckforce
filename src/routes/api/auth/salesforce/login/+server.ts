import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	createOAuth2Client,
	generateCodeVerifier,
	generateCodeChallenge,
	buildAuthorizationUrl
} from '$lib/server/salesforce/oauth';
import { setOAuthStateCookies, type OrgType } from '$lib/server/salesforce/cookies';
import {
	getClientIdForOrg,
	getClientSecret,
	getCallbackUrl,
	getLoginUrl
} from '$lib/server/salesforce/config';
import crypto from 'crypto';

/**
 * Initiate OAuth 2.0 flow with PKCE for Salesforce authentication
 *
 * Query parameters:
 * - org: 'source' | 'target' (optional, defaults to 'source') - which org to authenticate
 *   Note: In the new single-login model, this is mainly for backward compatibility
 * - orgType: 'production' | 'sandbox' | 'developer' | 'scratch' (optional) - org type
 * - orgName: string (optional) - custom org name
 * - color: string (optional) - UI color
 * - icon: string (optional) - UI icon
 *
 * Flow:
 * 1. Generate PKCE code verifier and challenge
 * 2. Generate random state for CSRF protection
 * 3. Store verifier, state, and UI customization in temporary cookies
 * 4. Redirect to Salesforce authorization URL (sandbox or production based on orgType)
 */
export const GET: RequestHandler = async ({ url, cookies }) => {
	// Get org type from query parameter (defaults to 'source' for backward compatibility)
	const orgParam = url.searchParams.get('org') || 'source';
	if (orgParam !== 'source' && orgParam !== 'target') {
		throw error(400, 'Invalid "org" parameter. Must be "source" or "target".');
	}
	const org: OrgType = orgParam as OrgType;

	// Get optional UI customization parameters
	const orgType = url.searchParams.get('orgType') || undefined;
	const orgName = url.searchParams.get('orgName') || undefined;
	const color = url.searchParams.get('color') || undefined;
	const icon = url.searchParams.get('icon') || undefined;

	// Get org-specific Client ID
	const clientId = getClientIdForOrg(org);
	const clientSecret = getClientSecret();
	const callbackUrl = getCallbackUrl();
	const loginUrl = getLoginUrl();

	// Validate configuration
	if (!clientId || !callbackUrl || !loginUrl) {
		throw error(500, 'Salesforce OAuth configuration incomplete. Check environment variables.');
	}

	// Generate PKCE parameters
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = generateCodeChallenge(codeVerifier);

	// Generate random state for CSRF protection
	const state = crypto.randomBytes(32).toString('hex');

	// Debug logging
	console.log(`[OAuth Login - ${org}] Generated PKCE:`, {
		codeVerifierLength: codeVerifier.length,
		codeVerifierStart: codeVerifier.substring(0, 10),
		codeVerifierEnd: codeVerifier.substring(codeVerifier.length - 10),
		codeChallenge: codeChallenge,
		codeChallengeLength: codeChallenge.length,
		stateLength: state.length,
		state: state.substring(0, 16) + '...'
	});

	// Store PKCE verifier, state, and UI customization in temporary cookies
	setOAuthStateCookies(cookies, org, {
		state,
		codeVerifier,
		orgType,
		orgName,
		color,
		icon
	});

	// Determine login URL based on orgType
	// Use test.salesforce.com for sandbox, otherwise use configured login URL
	const effectiveLoginUrl = orgType === 'sandbox' ? 'https://test.salesforce.com' : loginUrl;

	// Create OAuth2 client with org-specific Client ID
	// Client secret is optional when using PKCE
	// Pass undefined instead of empty string if not provided
	const oauth2 = createOAuth2Client(
		effectiveLoginUrl,
		clientId,
		clientSecret || undefined as any,
		callbackUrl
	);

	// Build authorization URL with PKCE
	const authUrl = buildAuthorizationUrl(oauth2, codeChallenge, state);

	// Redirect to Salesforce authorization page
	return redirect(302, authUrl);
};

