import type { Cookies } from '@sveltejs/kit';

/**
 * Cookie management utilities for Salesforce sessions
 *
 * DEPRECATED: Most functionality has been moved to Supabase-based session management.
 * This file is kept for backward compatibility and will be removed in a future version.
 *
 * The new single-login model stores all session data in Supabase, with only the
 * active session ID stored in cookies.
 */

// DEPRECATED: Use Supabase organizations table instead
export type OrgType = 'source' | 'target';

// Cookie names
const COOKIE_NAMES = {
	accessToken: (org: OrgType) => `sf_${org}_access_token`,
	refreshToken: (org: OrgType) => `sf_${org}_refresh_token`,
	instanceUrl: (org: OrgType) => `sf_${org}_instance_url`,
	orgId: (org: OrgType) => `sf_${org}_org_id`,
	orgName: (org: OrgType) => `sf_${org}_org_name`,
	orgType: (org: OrgType) => `sf_${org}_org_type`,
	color: (org: OrgType) => `sf_${org}_color`,
	icon: (org: OrgType) => `sf_${org}_icon`,
	// Temporary OAuth state cookie (consolidated)
	oauthState: (org: OrgType) => `sf_${org}_oauth_state`
} as const;

// Cookie options for secure httpOnly cookies
const SECURE_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 60 * 60 * 24 * 30 // 30 days
};

// Cookie options for temporary OAuth state (shorter expiry)
const TEMP_COOKIE_OPTIONS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === 'production',
	sameSite: 'lax' as const,
	path: '/',
	maxAge: 60 * 10 // 10 minutes
};

/**
 * Set OAuth session cookies for an org
 * @deprecated Use Supabase organizations table instead. This function is kept for backward compatibility.
 */
export function setOrgSessionCookies(
	cookies: Cookies,
	org: OrgType,
	data: {
		accessToken: string;
		refreshToken: string;
		instanceUrl: string;
		orgId?: string;
		orgName?: string;
		orgType?: string;
		color?: string;
		icon?: string;
	}
): void {
	cookies.set(COOKIE_NAMES.accessToken(org), data.accessToken, SECURE_COOKIE_OPTIONS);
	cookies.set(COOKIE_NAMES.refreshToken(org), data.refreshToken, SECURE_COOKIE_OPTIONS);
	cookies.set(COOKIE_NAMES.instanceUrl(org), data.instanceUrl, SECURE_COOKIE_OPTIONS);

	if (data.orgId) {
		cookies.set(COOKIE_NAMES.orgId(org), data.orgId, SECURE_COOKIE_OPTIONS);
	}
	if (data.orgName) {
		cookies.set(COOKIE_NAMES.orgName(org), data.orgName, SECURE_COOKIE_OPTIONS);
	}
	if (data.orgType) {
		cookies.set(COOKIE_NAMES.orgType(org), data.orgType, SECURE_COOKIE_OPTIONS);
	}
	if (data.color) {
		cookies.set(COOKIE_NAMES.color(org), data.color, SECURE_COOKIE_OPTIONS);
	}
	if (data.icon) {
		cookies.set(COOKIE_NAMES.icon(org), data.icon, SECURE_COOKIE_OPTIONS);
	}
}

/**
 * Get OAuth session data for an org
 * @deprecated Use Supabase organizations table instead. This function is kept for backward compatibility.
 */
export function getOrgSessionCookies(
	cookies: Cookies,
	org: OrgType
): {
	accessToken: string | undefined;
	refreshToken: string | undefined;
	instanceUrl: string | undefined;
	orgId: string | undefined;
	orgName: string | undefined;
	orgType: string | undefined;
	color: string | undefined;
	icon: string | undefined;
} {
	return {
		accessToken: cookies.get(COOKIE_NAMES.accessToken(org)),
		refreshToken: cookies.get(COOKIE_NAMES.refreshToken(org)),
		instanceUrl: cookies.get(COOKIE_NAMES.instanceUrl(org)),
		orgId: cookies.get(COOKIE_NAMES.orgId(org)),
		orgName: cookies.get(COOKIE_NAMES.orgName(org)),
		orgType: cookies.get(COOKIE_NAMES.orgType(org)),
		color: cookies.get(COOKIE_NAMES.color(org)),
		icon: cookies.get(COOKIE_NAMES.icon(org))
	};
}

/**
 * Clear OAuth session cookies for an org
 * @deprecated Use Supabase organizations table instead. This function is kept for backward compatibility.
 */
export function clearOrgSessionCookies(cookies: Cookies, org: OrgType): void {
	const cookieOptions = { path: '/' };
	cookies.delete(COOKIE_NAMES.accessToken(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.refreshToken(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.instanceUrl(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.orgId(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.orgName(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.orgType(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.color(org), cookieOptions);
	cookies.delete(COOKIE_NAMES.icon(org), cookieOptions);
}

/**
 * OAuth state data structure
 */
export interface OAuthStateData {
	state: string;
	codeVerifier: string;
	org: OrgType;
	orgType?: string;
	orgName?: string;
	color?: string;
	icon?: string;
}

/**
 * Set temporary OAuth state cookie (used during OAuth flow)
 * Stores all OAuth state in a single JSON cookie
 */
export function setOAuthStateCookies(
	cookies: Cookies,
	org: OrgType,
	data: {
		state: string;
		codeVerifier: string;
		orgType?: string;
		orgName?: string;
		color?: string;
		icon?: string;
	}
): void {
	const stateData: OAuthStateData = {
		state: data.state,
		codeVerifier: data.codeVerifier,
		org,
		orgType: data.orgType,
		orgName: data.orgName,
		color: data.color,
		icon: data.icon
	};
	const serialized = JSON.stringify(stateData);
	console.log(`[Cookies] Setting OAuth state for ${org}:`, {
		cookieName: COOKIE_NAMES.oauthState(org),
		codeVerifierLength: data.codeVerifier.length,
		serializedLength: serialized.length,
		codeVerifierStart: data.codeVerifier.substring(0, 10),
		codeVerifierEnd: data.codeVerifier.substring(data.codeVerifier.length - 10)
	});
	cookies.set(COOKIE_NAMES.oauthState(org), serialized, TEMP_COOKIE_OPTIONS);
}

/**
 * Get temporary OAuth state cookie
 */
export function getOAuthStateCookies(
	cookies: Cookies,
	org: OrgType
): Partial<OAuthStateData> {
	const cookieName = COOKIE_NAMES.oauthState(org);
	const cookieValue = cookies.get(cookieName);

	console.log(`[Cookies] Getting OAuth state for ${org}:`, {
		cookieName,
		hasCookie: !!cookieValue,
		cookieLength: cookieValue?.length || 0
	});

	if (!cookieValue) {
		return {};
	}

	try {
		const parsed = JSON.parse(cookieValue) as OAuthStateData;
		console.log(`[Cookies] Parsed OAuth state for ${org}:`, {
			hasCodeVerifier: !!parsed.codeVerifier,
			codeVerifierLength: parsed.codeVerifier?.length || 0,
			codeVerifierStart: parsed.codeVerifier?.substring(0, 10),
			codeVerifierEnd: parsed.codeVerifier?.substring(parsed.codeVerifier.length - 10)
		});
		return parsed;
	} catch (error) {
		console.error('Failed to parse OAuth state cookie:', error);
		return {};
	}
}

/**
 * Clear temporary OAuth state cookie
 */
export function clearOAuthStateCookies(cookies: Cookies, org: OrgType): void {
	const cookieOptions = { path: '/' };
	cookies.delete(COOKIE_NAMES.oauthState(org), cookieOptions);
}

/**
 * Check if an org has valid session cookies
 */
export function hasValidSession(cookies: Cookies, org: OrgType): boolean {
	const session = getOrgSessionCookies(cookies, org);
	return !!(session.accessToken && session.refreshToken && session.instanceUrl);
}

/**
 * Update access token cookie (used after token refresh)
 */
export function updateAccessToken(cookies: Cookies, org: OrgType, accessToken: string): void {
	cookies.set(COOKIE_NAMES.accessToken(org), accessToken, SECURE_COOKIE_OPTIONS);
}

