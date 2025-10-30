import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { clearOAuthStateCookies } from '$lib/server/salesforce/cookies';

/**
 * Clear temporary OAuth state cookies
 * 
 * This is useful when OAuth flow gets interrupted or when cookies become stale
 * (e.g., after server restart during development)
 * 
 * Returns:
 * {
 *   success: boolean,
 *   message: string
 * }
 */
export const POST: RequestHandler = async ({ cookies }) => {
	// Clear OAuth state cookies for both orgs
	clearOAuthStateCookies(cookies, 'source');
	clearOAuthStateCookies(cookies, 'target');

	return json({
		success: true,
		message: 'Temporary OAuth cookies cleared'
	});
};

