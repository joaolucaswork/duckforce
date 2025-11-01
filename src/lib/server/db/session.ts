/**
 * Database operations for active session management
 * 
 * This module manages the active Salesforce session for each user.
 * Only one organization can be active at a time per user.
 */

import { supabaseAdmin } from '../supabase/client';
import type { ActiveSession, ActiveSessionWithOrg } from './types';

/**
 * Set the active session for a user
 * 
 * This will replace any existing active session for the user.
 * 
 * @param userId - The user ID
 * @param organizationId - The database ID (UUID) of the organization to activate
 * @param sessionData - Session tokens and metadata
 */
export async function setActiveSession(
	userId: string,
	organizationId: string,
	sessionData: {
		accessToken: string;
		refreshToken: string;
		instanceUrl: string;
	}
): Promise<void> {
	const { error } = await supabaseAdmin
		.from('active_session')
		.upsert(
			{
				user_id: userId,
				organization_id: organizationId,
				access_token: sessionData.accessToken,
				refresh_token: sessionData.refreshToken,
				instance_url: sessionData.instanceUrl,
				connected_at: new Date().toISOString(),
				expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'user_id'
			}
		);

	if (error) {
		console.error('Error setting active session:', error);
		throw error;
	}
}

/**
 * Get the active session for a user
 * 
 * Returns the session with organization details joined.
 * 
 * @param userId - The user ID
 * @returns The active session with organization data, or null if no active session
 */
export async function getActiveSession(userId: string): Promise<ActiveSessionWithOrg | null> {
	const { data, error } = await supabaseAdmin
		.from('active_session')
		.select(
			`
			*,
			organization:organizations(*)
		`
		)
		.eq('user_id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching active session:', error);
		throw error;
	}

	return data as ActiveSessionWithOrg;
}

/**
 * Get the active session without organization details
 * 
 * Lighter query when you only need session tokens.
 * 
 * @param userId - The user ID
 * @returns The active session or null if no active session
 */
export async function getActiveSessionOnly(userId: string): Promise<ActiveSession | null> {
	const { data, error } = await supabaseAdmin
		.from('active_session')
		.select('*')
		.eq('user_id', userId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching active session:', error);
		throw error;
	}

	return data;
}

/**
 * Update active session tokens
 * 
 * Used when refreshing OAuth tokens for the active session.
 * 
 * @param userId - The user ID
 * @param accessToken - New access token
 * @param refreshToken - New refresh token (optional)
 * @param expiresAt - New expiration timestamp (optional)
 */
export async function updateActiveSessionTokens(
	userId: string,
	accessToken: string,
	refreshToken?: string,
	expiresAt?: string
): Promise<void> {
	const updateData: any = {
		access_token: accessToken,
		updated_at: new Date().toISOString()
	};

	if (refreshToken) {
		updateData.refresh_token = refreshToken;
	}

	if (expiresAt) {
		updateData.expires_at = expiresAt;
	} else {
		// Default to 2 hours from now
		updateData.expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
	}

	const { error } = await supabaseAdmin
		.from('active_session')
		.update(updateData)
		.eq('user_id', userId);

	if (error) {
		console.error('Error updating active session tokens:', error);
		throw error;
	}
}

/**
 * Clear the active session for a user
 * 
 * This removes the active session but does not delete the organization data.
 * 
 * @param userId - The user ID
 */
export async function clearActiveSession(userId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('active_session')
		.delete()
		.eq('user_id', userId);

	if (error) {
		console.error('Error clearing active session:', error);
		throw error;
	}
}

/**
 * Check if a user has an active session
 * 
 * @param userId - The user ID
 * @returns True if the user has an active session
 */
export async function hasActiveSession(userId: string): Promise<boolean> {
	const session = await getActiveSessionOnly(userId);
	return session !== null;
}

/**
 * Check if a specific organization is the active session
 * 
 * @param userId - The user ID
 * @param organizationId - The database ID (UUID) of the organization
 * @returns True if this organization is the active session
 */
export async function isActiveOrganization(
	userId: string,
	organizationId: string
): Promise<boolean> {
	const session = await getActiveSessionOnly(userId);
	return session?.organization_id === organizationId;
}

