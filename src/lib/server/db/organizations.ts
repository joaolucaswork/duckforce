/**
 * Database operations for Salesforce organizations
 * 
 * This module provides functions for managing organization data
 * in the Supabase database.
 */

import { supabaseAdmin } from '../supabase/client';
import type { Organization, OrganizationInsert, OrganizationUpdate } from './types';

/**
 * Save or update organization data
 * 
 * Uses upsert to either create a new organization or update an existing one
 * based on the unique constraint (user_id, org_id).
 * 
 * @param userId - The user ID who owns this organization
 * @param orgData - Organization data to save
 * @returns The saved organization record
 */
export async function upsertOrganization(
	userId: string,
	orgData: Omit<OrganizationInsert, 'user_id'>
): Promise<Organization> {
	const { data, error } = await supabaseAdmin
		.from('organizations')
		.upsert(
			{
				user_id: userId,
				org_id: orgData.org_id,
				instance_url: orgData.instance_url,
				org_name: orgData.org_name,
				org_type: orgData.org_type,
				color: orgData.color,
				icon: orgData.icon,
				access_token: orgData.access_token,
				refresh_token: orgData.refresh_token,
				token_expires_at: orgData.token_expires_at,
				api_version: orgData.api_version || '60.0',
				last_connected_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'user_id,org_id'
			}
		)
		.select()
		.single();

	if (error) {
		console.error('Error upserting organization:', error);
		throw error;
	}
	
	return data;
}

/**
 * Get all organizations for a user
 * 
 * Returns organizations ordered by most recently connected first.
 * 
 * @param userId - The user ID to fetch organizations for
 * @returns Array of organizations
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
	const { data, error } = await supabaseAdmin
		.from('organizations')
		.select('*')
		.eq('user_id', userId)
		.order('last_connected_at', { ascending: false });

	if (error) {
		console.error('Error fetching user organizations:', error);
		throw error;
	}
	
	return data || [];
}

/**
 * Get a specific organization by org_id
 * 
 * @param userId - The user ID who owns the organization
 * @param orgId - The Salesforce organization ID
 * @returns The organization or null if not found
 */
export async function getOrganization(
	userId: string,
	orgId: string
): Promise<Organization | null> {
	const { data, error } = await supabaseAdmin
		.from('organizations')
		.select('*')
		.eq('user_id', userId)
		.eq('org_id', orgId)
		.single();

	if (error) {
		// PGRST116 is the "not found" error code
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching organization:', error);
		throw error;
	}
	
	return data;
}

/**
 * Get a specific organization by database ID
 * 
 * @param userId - The user ID who owns the organization
 * @param id - The database ID (UUID)
 * @returns The organization or null if not found
 */
export async function getOrganizationById(
	userId: string,
	id: string
): Promise<Organization | null> {
	const { data, error } = await supabaseAdmin
		.from('organizations')
		.select('*')
		.eq('user_id', userId)
		.eq('id', id)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching organization by ID:', error);
		throw error;
	}
	
	return data;
}

/**
 * Update organization data
 * 
 * @param userId - The user ID who owns the organization
 * @param orgId - The Salesforce organization ID
 * @param updates - Partial organization data to update
 */
export async function updateOrganization(
	userId: string,
	orgId: string,
	updates: OrganizationUpdate
): Promise<Organization> {
	const { data, error } = await supabaseAdmin
		.from('organizations')
		.update({
			...updates,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', userId)
		.eq('org_id', orgId)
		.select()
		.single();

	if (error) {
		console.error('Error updating organization:', error);
		throw error;
	}
	
	return data;
}

/**
 * Update organization tokens
 * 
 * This is a specialized update function for refreshing OAuth tokens.
 * 
 * @param userId - The user ID who owns the organization
 * @param orgId - The Salesforce organization ID
 * @param accessToken - New access token
 * @param refreshToken - New refresh token (optional)
 * @param expiresAt - Token expiration timestamp (optional)
 */
export async function updateOrganizationTokens(
	userId: string,
	orgId: string,
	accessToken: string,
	refreshToken?: string,
	expiresAt?: string
): Promise<void> {
	const updateData: OrganizationUpdate = {
		access_token: accessToken,
		updated_at: new Date().toISOString()
	};

	if (refreshToken) {
		updateData.refresh_token = refreshToken;
	}

	if (expiresAt) {
		updateData.token_expires_at = expiresAt;
	}

	const { error } = await supabaseAdmin
		.from('organizations')
		.update(updateData)
		.eq('user_id', userId)
		.eq('org_id', orgId);

	if (error) {
		console.error('Error updating organization tokens:', error);
		throw error;
	}
}

/**
 * Update the last_synced_at timestamp for an organization
 * 
 * @param organizationId - The database ID (UUID) of the organization
 */
export async function updateLastSynced(organizationId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('organizations')
		.update({
			last_synced_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', organizationId);

	if (error) {
		console.error('Error updating last_synced_at:', error);
		throw error;
	}
}

/**
 * Delete an organization and all its cached data
 * 
 * This will cascade delete all related data (components, etc.)
 * due to foreign key constraints.
 * 
 * @param userId - The user ID who owns the organization
 * @param orgId - The Salesforce organization ID
 */
export async function deleteOrganization(userId: string, orgId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('organizations')
		.delete()
		.eq('user_id', userId)
		.eq('org_id', orgId);

	if (error) {
		console.error('Error deleting organization:', error);
		throw error;
	}
}

/**
 * Check if an organization exists for a user
 * 
 * @param userId - The user ID
 * @param orgId - The Salesforce organization ID
 * @returns True if the organization exists
 */
export async function organizationExists(userId: string, orgId: string): Promise<boolean> {
	const org = await getOrganization(userId, orgId);
	return org !== null;
}

