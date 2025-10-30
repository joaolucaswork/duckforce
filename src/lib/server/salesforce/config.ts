import {
	SALESFORCE_CLIENT_ID,
	SALESFORCE_CLIENT_SECRET,
	SALESFORCE_CALLBACK_URL,
	SALESFORCE_LOGIN_URL
} from '$env/static/private';

/**
 * Get environment variable with fallback
 */
function getEnvVar(name: string, defaultValue?: string): string | undefined {
	try {
		// Try to get from process.env (for optional variables)
		const value = process.env[name];
		return value || defaultValue;
	} catch {
		return defaultValue;
	}
}

/**
 * Get the appropriate Client ID for a specific org
 * Allows using different Connected Apps for different orgs
 * 
 * @param org - The org type ('source' or 'target')
 * @returns The Client ID to use for this org
 */
export function getClientIdForOrg(org: 'source' | 'target'): string {
	// Try to get org-specific Client ID from environment
	const orgSpecificClientId = getEnvVar(
		org === 'source' ? 'SALESFORCE_SOURCE_CLIENT_ID' : 'SALESFORCE_TARGET_CLIENT_ID'
	);

	// If org-specific Client ID is configured, use it
	if (orgSpecificClientId && orgSpecificClientId.trim() !== '') {
		console.log(`[Config] Using org-specific Client ID for ${org}`);
		return orgSpecificClientId;
	}

	// Otherwise, fall back to the default Client ID
	console.log(`[Config] Using default Client ID for ${org}`);
	return SALESFORCE_CLIENT_ID;
}

/**
 * Get the Client Secret (same for all orgs for now)
 */
export function getClientSecret(): string | undefined {
	return SALESFORCE_CLIENT_SECRET || undefined;
}

/**
 * Get the Callback URL (same for all orgs)
 */
export function getCallbackUrl(): string {
	return SALESFORCE_CALLBACK_URL;
}

/**
 * Get the Login URL (same for all orgs by default)
 */
export function getLoginUrl(): string {
	return SALESFORCE_LOGIN_URL;
}

