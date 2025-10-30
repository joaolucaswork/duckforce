import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrgSessionCookies, hasValidSession } from '$lib/server/salesforce/cookies';

/**
 * Check current Salesforce connection status for both orgs
 *
 * Returns non-sensitive connection metadata only (no tokens)
 *
 * Returns:
 * {
 *   source: {
 *     isConnected: boolean,
 *     instanceUrl?: string,
 *     orgId?: string,
 *     orgName?: string,
 *     orgType?: string,
 *     color?: string,
 *     icon?: string
 *   },
 *   target: {
 *     isConnected: boolean,
 *     instanceUrl?: string,
 *     orgId?: string,
 *     orgName?: string,
 *     orgType?: string,
 *     color?: string,
 *     icon?: string
 *   }
 * }
 */
export const GET: RequestHandler = async ({ cookies }) => {
	// Check source org session
	const sourceSession = getOrgSessionCookies(cookies, 'source');
	const sourceConnected = hasValidSession(cookies, 'source');

	// Check target org session
	const targetSession = getOrgSessionCookies(cookies, 'target');
	const targetConnected = hasValidSession(cookies, 'target');

	return json({
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
		}
	});
};

