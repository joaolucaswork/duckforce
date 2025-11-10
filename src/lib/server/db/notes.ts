/**
 * Database operations for component notes
 * 
 * This module provides functions for managing component notes
 * in the Supabase database.
 */

import { supabaseAdmin } from '../supabase/client';
import type { ComponentNote, ComponentNoteInsert, ComponentNoteUpdate } from './types';

/**
 * Upsert a component note
 * 
 * Creates a new note or updates an existing one based on the unique constraint (user_id, component_id).
 * 
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID this note is associated with
 * @param content - The note content
 * @param isTodo - Whether this note is marked as a to-do item
 * @returns The saved note record
 */
export async function upsertComponentNote(
	userId: string,
	componentId: string,
	content: string,
	isTodo: boolean
): Promise<ComponentNote> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.upsert(
			{
				user_id: userId,
				component_id: componentId,
				content,
				is_todo: isTodo,
				updated_at: new Date().toISOString()
			},
			{
				onConflict: 'user_id,component_id'
			}
		)
		.select()
		.single();

	if (error) {
		console.error('Error upserting component note:', error);
		throw error;
	}

	return data;
}

/**
 * Get a single component note
 * 
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID to fetch the note for
 * @returns The note record or null if not found
 */
export async function getComponentNote(
	userId: string,
	componentId: string
): Promise<ComponentNote | null> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.select('*')
		.eq('user_id', userId)
		.eq('component_id', componentId)
		.single();

	if (error) {
		// PGRST116 means no rows returned
		if (error.code === 'PGRST116') {
			return null;
		}
		console.error('Error fetching component note:', error);
		throw error;
	}

	return data;
}

/**
 * Get multiple component notes
 * 
 * @param userId - The user ID who owns these notes
 * @param componentIds - Array of component IDs to fetch notes for
 * @returns Array of note records
 */
export async function getComponentNotes(
	userId: string,
	componentIds: string[]
): Promise<ComponentNote[]> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.select('*')
		.eq('user_id', userId)
		.in('component_id', componentIds);

	if (error) {
		console.error('Error fetching component notes:', error);
		throw error;
	}

	return data || [];
}

/**
 * Delete a component note
 * 
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID to delete the note for
 */
export async function deleteComponentNote(
	userId: string,
	componentId: string
): Promise<void> {
	const { error } = await supabaseAdmin
		.from('component_notes')
		.delete()
		.eq('user_id', userId)
		.eq('component_id', componentId);

	if (error) {
		console.error('Error deleting component note:', error);
		throw error;
	}
}

/**
 * Update the to-do status of a component note
 *
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID to update
 * @param isTodo - The new to-do status
 */
export async function updateNoteTodoStatus(
	userId: string,
	componentId: string,
	isTodo: boolean
): Promise<void> {
	const { error } = await supabaseAdmin
		.from('component_notes')
		.update({
			is_todo: isTodo,
			updated_at: new Date().toISOString()
		})
		.eq('user_id', userId)
		.eq('component_id', componentId);

	if (error) {
		console.error('Error updating note to-do status:', error);
		throw error;
	}
}

/**
 * Get the active (non-archived) note for a component
 *
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID to fetch the note for
 * @returns The active note record or null if not found
 */
export async function getActiveNote(
	userId: string,
	componentId: string
): Promise<ComponentNote | null> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.select('*')
		.eq('user_id', userId)
		.eq('component_id', componentId)
		.eq('is_archived', false)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		console.error('Error fetching active note:', error);
		throw error;
	}

	return data;
}

/**
 * Get all notes (including history) for a component
 *
 * @param userId - The user ID who owns these notes
 * @param componentId - The component ID to fetch notes for
 * @returns Array of note records ordered by creation date (newest first)
 */
export async function getNoteHistory(
	userId: string,
	componentId: string
): Promise<ComponentNote[]> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.select('*')
		.eq('user_id', userId)
		.eq('component_id', componentId)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error fetching note history:', error);
		throw error;
	}

	return data || [];
}

/**
 * Archive a note (mark as historical)
 *
 * @param userId - The user ID who owns this note
 * @param noteId - The note ID to archive
 */
export async function archiveNote(
	userId: string,
	noteId: string
): Promise<void> {
	const { error } = await supabaseAdmin
		.from('component_notes')
		.update({
			is_archived: true,
			archived_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.eq('id', noteId)
		.eq('user_id', userId);

	if (error) {
		console.error('Error archiving note:', error);
		throw error;
	}
}

/**
 * Create a new note entry
 *
 * @param userId - The user ID who owns this note
 * @param componentId - The component ID this note is associated with
 * @param content - The note content
 * @param isTodo - Whether this note is marked as a to-do item
 * @returns The created note record
 */
export async function createNewNote(
	userId: string,
	componentId: string,
	content: string,
	isTodo: boolean
): Promise<ComponentNote> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.insert({
			user_id: userId,
			component_id: componentId,
			content,
			is_todo: isTodo,
			is_archived: false
		})
		.select()
		.single();

	if (error) {
		console.error('Error creating new note:', error);
		throw error;
	}

	return data;
}

/**
 * Update an existing note's content and todo status
 *
 * @param userId - The user ID who owns this note
 * @param noteId - The note ID to update
 * @param content - The new note content
 * @param isTodo - The new to-do status
 * @returns The updated note record
 */
export async function updateNote(
	userId: string,
	noteId: string,
	content: string,
	isTodo: boolean
): Promise<ComponentNote> {
	const { data, error } = await supabaseAdmin
		.from('component_notes')
		.update({
			content,
			is_todo: isTodo,
			updated_at: new Date().toISOString()
		})
		.eq('id', noteId)
		.eq('user_id', userId)
		.select()
		.single();

	if (error) {
		console.error('Error updating note:', error);
		throw error;
	}

	return data;
}
