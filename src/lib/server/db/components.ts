/**
 * Database operations for Salesforce component caching
 * 
 * This module manages cached Salesforce component metadata
 * for each organization.
 */

import { supabaseAdmin } from '../supabase/client';
import type { SalesforceComponent, ComponentInsert, ComponentUpdate } from './types';
import { updateLastSynced } from './organizations';

/**
 * Cache components for an organization
 * 
 * This will replace all existing components for the organization
 * with the new set of components.
 * 
 * @param organizationId - The database ID (UUID) of the organization
 * @param components - Array of components to cache
 */
export async function cacheComponents(
	organizationId: string,
	components: Omit<ComponentInsert, 'organization_id'>[]
): Promise<void> {
	console.log(`[DB] Caching ${components.length} components for org ${organizationId}`);

	// First, delete existing components for this org
	console.log(`[DB] Deleting existing components...`);
	const { error: deleteError } = await supabaseAdmin
		.from('salesforce_components')
		.delete()
		.eq('organization_id', organizationId);

	if (deleteError) {
		console.error('[DB] Error deleting existing components:', deleteError);
		throw deleteError;
	}

	console.log(`[DB] Existing components deleted successfully`);

	// Then insert new components if there are any
	if (components.length > 0) {
		console.log(`[DB] Inserting ${components.length} new components...`);
		const { error: insertError } = await supabaseAdmin
			.from('salesforce_components')
			.insert(
				components.map((comp) => ({
					organization_id: organizationId,
					component_id: comp.component_id,
					api_name: comp.api_name,
					name: comp.name,
					type: comp.type,
					description: comp.description,
					namespace: comp.namespace,
					metadata: comp.metadata,
					dependencies: comp.dependencies || [],
					dependents: comp.dependents || [],
					migration_status: comp.migration_status || 'pending'
				}))
			);

		if (insertError) {
			console.error('[DB] Error inserting components:', insertError);
			throw insertError;
		}

		console.log(`[DB] Components inserted successfully`);
	}

	// Update last_synced_at for the organization
	console.log(`[DB] Updating last_synced_at...`);
	await updateLastSynced(organizationId);
	console.log(`[DB] Cache complete`);
}

/**
 * Get cached components for an organization
 * 
 * @param organizationId - The database ID (UUID) of the organization
 * @param filters - Optional filters for type and search
 * @returns Array of cached components
 */
export async function getCachedComponents(
	organizationId: string,
	filters?: {
		type?: 'lwc' | 'field' | 'object' | 'apex' | 'trigger' | 'visualforce' | 'flow';
		search?: string;
		migrationStatus?: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped';
	}
): Promise<SalesforceComponent[]> {
	let query = supabaseAdmin
		.from('salesforce_components')
		.select('*')
		.eq('organization_id', organizationId);

	if (filters?.type) {
		query = query.eq('type', filters.type);
	}

	if (filters?.migrationStatus) {
		query = query.eq('migration_status', filters.migrationStatus);
	}

	if (filters?.search) {
		query = query.or(`name.ilike.%${filters.search}%,api_name.ilike.%${filters.search}%`);
	}

	const { data, error } = await query.order('name');

	if (error) {
		console.error('Error fetching cached components:', error);
		throw error;
	}

	return data || [];
}

/**
 * Get a specific component by ID
 * 
 * @param componentId - The database ID (UUID) of the component
 * @returns The component or null if not found
 */
export async function getComponent(componentId: string): Promise<SalesforceComponent | null> {
	const { data, error } = await supabaseAdmin
		.from('salesforce_components')
		.select('*')
		.eq('id', componentId)
		.single();

	if (error) {
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching component:', error);
		throw error;
	}

	return data;
}

/**
 * Update component migration status
 * 
 * @param componentId - The database ID (UUID) of the component
 * @param status - New migration status
 * @param notes - Optional migration notes
 */
export async function updateComponentMigrationStatus(
	componentId: string,
	status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped',
	notes?: string
): Promise<void> {
	const updateData: ComponentUpdate = {
		migration_status: status,
		updated_at: new Date().toISOString()
	};

	if (status === 'completed') {
		updateData.migration_date = new Date().toISOString();
	}

	if (notes !== undefined) {
		updateData.migration_notes = notes;
	}

	const { error } = await supabaseAdmin
		.from('salesforce_components')
		.update(updateData)
		.eq('id', componentId);

	if (error) {
		console.error('Error updating component migration status:', error);
		throw error;
	}
}

/**
 * Update multiple components' migration status
 * 
 * @param componentIds - Array of component database IDs
 * @param status - New migration status
 */
export async function bulkUpdateComponentStatus(
	componentIds: string[],
	status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped'
): Promise<void> {
	const updateData: ComponentUpdate = {
		migration_status: status,
		updated_at: new Date().toISOString()
	};

	if (status === 'completed') {
		updateData.migration_date = new Date().toISOString();
	}

	const { error } = await supabaseAdmin
		.from('salesforce_components')
		.update(updateData)
		.in('id', componentIds);

	if (error) {
		console.error('Error bulk updating component status:', error);
		throw error;
	}
}

/**
 * Get component count by migration status
 * 
 * @param organizationId - The database ID (UUID) of the organization
 * @returns Object with counts for each status
 */
export async function getComponentStatusCounts(organizationId: string): Promise<{
	pending: number;
	inProgress: number;
	completed: number;
	blocked: number;
	skipped: number;
	total: number;
}> {
	const { data, error } = await supabaseAdmin
		.from('salesforce_components')
		.select('migration_status')
		.eq('organization_id', organizationId);

	if (error) {
		console.error('Error fetching component status counts:', error);
		throw error;
	}

	const counts = {
		pending: 0,
		inProgress: 0,
		completed: 0,
		blocked: 0,
		skipped: 0,
		total: data?.length || 0
	};

	data?.forEach((component) => {
		switch (component.migration_status) {
			case 'pending':
				counts.pending++;
				break;
			case 'in-progress':
				counts.inProgress++;
				break;
			case 'completed':
				counts.completed++;
				break;
			case 'blocked':
				counts.blocked++;
				break;
			case 'skipped':
				counts.skipped++;
				break;
		}
	});

	return counts;
}

/**
 * Delete all components for an organization
 * 
 * @param organizationId - The database ID (UUID) of the organization
 */
export async function deleteAllComponents(organizationId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('salesforce_components')
		.delete()
		.eq('organization_id', organizationId);

	if (error) {
		console.error('Error deleting components:', error);
		throw error;
	}
}

/**
 * Check if components are cached for an organization
 *
 * @param organizationId - The database ID (UUID) of the organization
 * @returns True if components are cached
 */
export async function hasComponentsCache(organizationId: string): Promise<boolean> {
	const { count, error } = await supabaseAdmin
		.from('salesforce_components')
		.select('*', { count: 'exact', head: true })
		.eq('organization_id', organizationId);

	if (error) {
		console.error('Error checking components cache:', error);
		throw error;
	}

	return (count || 0) > 0;
}

/**
 * Save components in batch for an organization
 *
 * This is an alias for cacheComponents() to maintain backward compatibility.
 *
 * @param organizationId - The database ID (UUID) of the organization
 * @param components - Array of components to save
 */
export async function saveComponentsBatch(
	organizationId: string,
	components: Omit<ComponentInsert, 'organization_id'>[]
): Promise<void> {
	return cacheComponents(organizationId, components);
}

