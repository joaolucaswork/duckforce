import { OAuth2 } from '@jsforce/jsforce-node';
import crypto from 'crypto';

/**
 * PKCE (Proof Key for Code Exchange) utilities for secure OAuth flow
 */

/**
 * Generate PKCE code verifier (43-128 characters)
 * Uses base64url encoding to ensure URL-safe characters
 *
 * According to RFC 7636, code_verifier should be 43-128 characters
 * using unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
 *
 * We use base64url encoding which produces URL-safe output without padding
 */
export function generateCodeVerifier(): string {
	// Generate 96 random bytes, which will produce 128 base64url characters
	// (96 bytes * 4/3 = 128 characters)
	const randomBytes = crypto.randomBytes(96);
	return randomBytes.toString('base64url');
}

/**
 * Generate PKCE code challenge from verifier using SHA256
 */
export function generateCodeChallenge(verifier: string): string {
	const hash = crypto.createHash('sha256').update(verifier).digest();
	return hash.toString('base64url');
}

/**
 * Create OAuth2 client for Salesforce
 */
export function createOAuth2Client(loginUrl: string, clientId: string, clientSecret: string, redirectUri: string): OAuth2 {
	return new OAuth2({
		loginUrl,
		clientId,
		clientSecret,
		redirectUri
	});
}

/**
 * Build authorization URL with PKCE parameters
 */
export function buildAuthorizationUrl(
	oauth2: OAuth2,
	codeChallenge: string,
	state: string
): string {
	const params = new URLSearchParams();
	params.append('response_type', 'code');
	params.append('client_id', oauth2.clientId || '');
	params.append('redirect_uri', oauth2.redirectUri || '');
	params.append('code_challenge', codeChallenge);
	params.append('code_challenge_method', 'S256');
	params.append('state', state);
	params.append('scope', 'api refresh_token');

	return `${oauth2.loginUrl}/services/oauth2/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access and refresh tokens
 * Uses direct fetch to support PKCE code_verifier parameter
 */
export async function exchangeCodeForTokens(
	oauth2: OAuth2,
	code: string,
	codeVerifier: string
): Promise<{
	accessToken: string;
	refreshToken: string;
	instanceUrl: string;
	id: string;
}> {
	try {
		const tokenUrl = `${oauth2.loginUrl}/services/oauth2/token`;

		// When using PKCE, client_secret is not required
		// This allows users to authenticate to any Salesforce org without needing
		// the Connected App installed in each org
		const params: Record<string, string> = {
			grant_type: 'authorization_code',
			code,
			client_id: oauth2.clientId || '',
			redirect_uri: oauth2.redirectUri || '',
			code_verifier: codeVerifier
		};

		// Only include client_secret if it's actually provided and not empty
		// When using PKCE, omitting client_secret is preferred over sending an empty value
		const hasClientSecret = !!(oauth2.clientSecret && oauth2.clientSecret.trim() !== '');
		if (hasClientSecret) {
			params.client_secret = oauth2.clientSecret;
		}

		// Log request details (without sensitive data)
		console.log('Token exchange request:', {
			tokenUrl,
			hasClientSecret,
			hasCodeVerifier: !!codeVerifier,
			codeVerifierLength: codeVerifier.length,
			codeVerifierStart: codeVerifier.substring(0, 10),
			codeVerifierEnd: codeVerifier.substring(codeVerifier.length - 10),
			clientIdLength: oauth2.clientId?.length || 0,
			redirectUri: oauth2.redirectUri,
			codeLength: code.length,
			codeStart: code.substring(0, 10),
			codeEnd: code.substring(code.length - 10)
		});

		const body = new URLSearchParams(params);

		// Log the encoded body to see if there are encoding issues
		const bodyString = body.toString();
		console.log('Encoded request body length:', bodyString.length);
		console.log('code_verifier in body:', bodyString.includes('code_verifier=') ? 'YES' : 'NO');

		const response = await fetch(tokenUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error('Token exchange failed:', response.status, errorText);
			console.error('Request had client_secret:', hasClientSecret);
			throw new Error(`Token exchange failed with status ${response.status}`);
		}

		const tokenResponse = await response.json();

		if (!tokenResponse.access_token || !tokenResponse.refresh_token || !tokenResponse.instance_url) {
			throw new Error('Invalid token response from Salesforce');
		}

		return {
			accessToken: tokenResponse.access_token,
			refreshToken: tokenResponse.refresh_token,
			instanceUrl: tokenResponse.instance_url,
			id: tokenResponse.id // Identity URL for fetching user/org info
		};
	} catch (error) {
		console.error('Token exchange error:', error);
		throw new Error('Failed to exchange authorization code for tokens');
	}
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(
	oauth2: OAuth2,
	refreshToken: string
): Promise<{
	accessToken: string;
	instanceUrl: string;
}> {
	try {
		const tokenResponse = await oauth2.refreshToken(refreshToken);

		if (!tokenResponse.access_token || !tokenResponse.instance_url) {
			throw new Error('Invalid refresh token response from Salesforce');
		}

		return {
			accessToken: tokenResponse.access_token,
			instanceUrl: tokenResponse.instance_url
		};
	} catch (error) {
		console.error('Token refresh error:', error);
		throw new Error('Failed to refresh access token');
	}
}

/**
 * Revoke OAuth token
 */
export async function revokeToken(
	loginUrl: string,
	token: string
): Promise<void> {
	try {
		const response = await fetch(`${loginUrl}/services/oauth2/revoke`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({ token })
		});

		if (!response.ok) {
			throw new Error(`Revoke failed with status ${response.status}`);
		}
	} catch (error) {
		console.error('Token revocation error:', error);
		throw new Error('Failed to revoke token');
	}
}

