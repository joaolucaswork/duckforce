import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrgSessionCookies, hasValidSession } from '$lib/server/salesforce/cookies';
import { getUserOrganizations } from '$lib/server/db/organizations';
import { getActiveSession } from '$lib/server/db/session';
import type { OrganizationResponse } from '$lib/server/db/types';

/**
 * Check current Salesforce connection status
 *
 * Returns non-sensitive connection metadata only (no tokens)
 *
 * Returns:
 * {
 *   // Legacy dual-org format (for backward compatibility)
 *   source: { isConnected, instanceUrl, orgId, orgName, orgType, color, icon },
 *   target: { isConnected, instanceUrl, orgId, orgName, orgType, color, icon },
 *
 *   // New single-login format
 *   activeOrg: OrganizationResponse | null,
 *   cachedOrgs: OrganizationResponse[]
 * }
 */
export const GET: RequestHandler = async ({ cookies, locals }) => {
	// Get user ID (TODO: Replace with actual user authentication)
	const userId = (locals as any).user?.id || 'demo-user';

	// Check legacy cookie-based sessions (for backward compatibility)
	const sourceSession = getOrgSessionCookies(cookies, 'source');
	const sourceConnected = hasValidSession(cookies, 'source');

	const targetSession = getOrgSessionCookies(cookies, 'target');
	const targetConnected = hasValidSession(cookies, 'target');

	// Get active session and cached organizations from Supabase
	let activeOrg: OrganizationResponse | null = null;
	let cachedOrgs: OrganizationResponse[] = [];

	try {
		// Fetch active session with organization details
		const activeSession = await getActiveSession(userId);
		if (activeSession && activeSession.organization) {
			activeOrg = {
				id: activeSession.organization.id,
				org_id: activeSession.organization.org_id,
				org_name: activeSession.organization.org_name,
				instance_url: activeSession.organization.instance_url,
				org_type: activeSession.organization.org_type,
				color: activeSession.organization.color,
				icon: activeSession.organization.icon,
				api_version: activeSession.organization.api_version,
				last_connected_at: activeSession.organization.last_connected_at,
				last_synced_at: activeSession.organization.last_synced_at,
				is_active: true
			};
		}

		// Fetch all cached organizations
		const organizations = await getUserOrganizations(userId);
		cachedOrgs = organizations.map((org) => ({
			id: org.id,
			org_id: org.org_id,
			org_name: org.org_name,
			instance_url: org.instance_url,
			org_type: org.org_type,
			color: org.color,
			icon: org.icon,
			api_version: org.api_version,
			last_connected_at: org.last_connected_at,
			last_synced_at: org.last_synced_at,
			is_active: activeOrg ? org.id === activeOrg.id : false
		}));
	} catch (error) {
		console.error('Error fetching organizations from Supabase:', error);
		// Continue with legacy response even if Supabase fetch fails
	}

	return json({
		// Legacy dual-org format (for backward compatibility)
		source: {
			isConnected: sourceConnected,
			instanceUrl: sourceSession.instanceUrl,
			orgId: sourceSession.orgId,
			orgName: sourceSession.orgName,
			orgType: sourceSession.orgType,
			color: sourceSession.color,
			icon: sourceSession.icon
		},
		target: {
			isConnected: targetConnected,
			instanceUrl: targetSession.instanceUrl,
			orgId: targetSession.orgId,
			orgName: targetSession.orgName,
			orgType: targetSession.orgType,
			color: targetSession.color,
			icon: targetSession.icon
		},

		// New single-login format
		activeOrg,
		cachedOrgs
	});
};

