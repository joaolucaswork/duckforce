/**
 * Database operations for kanban boards
 * 
 * This module provides functions for managing kanban board state
 * in the Supabase database.
 */

import { supabaseAdmin } from '../supabase/client';
import type { KanbanBoard } from './types';

export interface KanbanColumnData {
	columnId: string;
	componentIds: string[];
}

/**
 * Get a user's kanban board
 * 
 * @param userId - The user ID who owns this kanban board
 * @returns The kanban board record or null if not found
 */
export async function getKanbanBoard(userId: string): Promise<KanbanBoard | null> {
	const { data, error } = await supabaseAdmin
		.from('kanban_boards')
		.select('*')
		.eq('user_id', userId)
		.maybeSingle();

	if (error) {
		console.error('Error fetching kanban board:', error);
		throw error;
	}

	return data;
}

/**
 * Upsert a kanban board
 * 
 * Creates a new kanban board or updates an existing one based on the unique constraint (user_id).
 * 
 * @param userId - The user ID who owns this kanban board
 * @param columns - The kanban column structure with component IDs
 * @returns The saved kanban board record
 */
export async function upsertKanbanBoard(
	userId: string,
	columns: KanbanColumnData[]
): Promise<KanbanBoard> {
	const { data, error } = await supabaseAdmin
		.from('kanban_boards')
		.upsert(
			{
				user_id: userId,
				columns: columns as any,
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'user_id'
			}
		)
		.select()
		.single();

	if (error) {
		console.error('Error upserting kanban board:', error);
		throw error;
	}

	return data;
}

/**
 * Delete a user's kanban board
 * 
 * @param userId - The user ID who owns this kanban board
 */
export async function deleteKanbanBoard(userId: string): Promise<void> {
	const { error } = await supabaseAdmin
		.from('kanban_boards')
		.delete()
		.eq('user_id', userId);

	if (error) {
		console.error('Error deleting kanban board:', error);
		throw error;
	}
}

