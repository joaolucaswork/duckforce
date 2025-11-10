import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	upsertComponentNote,
	getComponentNotes,
	deleteComponentNote,
	getActiveNote,
	getNoteHistory,
	archiveNote,
	createNewNote,
	updateNote,
	deleteNoteById
} from '$lib/server/db/notes';
import { createServerSupabaseClient } from '$lib/server/supabase/auth';
import type { ComponentNoteResponse } from '$lib/server/db/types';

/**
 * GET /api/notes?componentIds=id1,id2,id3
 * GET /api/notes?componentId=id&includeHistory=true
 *
 * Fetch component notes for the current user
 *
 * Query Parameters:
 * - componentIds: Comma-separated list of component IDs (for bulk fetch)
 * - componentId: Single component ID (for fetching with history)
 * - includeHistory: If true, returns all notes including archived ones
 *
 * Returns:
 * {
 *   notes: ComponentNoteResponse[] // For bulk fetch
 *   activeNote: ComponentNoteResponse | null // For single fetch with history
 *   history: ComponentNoteResponse[] // For single fetch with history
 * }
 */
export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const componentIdsParam = url.searchParams.get('componentIds');
		const componentId = url.searchParams.get('componentId');
		const includeHistory = url.searchParams.get('includeHistory') === 'true';

		// Get user metadata
		const supabase = createServerSupabaseClient(cookies);
		const { data: userData } = await supabase.auth.getUser();
		const userEmail = userData?.user?.email || '';
		const userName = userData?.user?.user_metadata?.full_name || null;

		// Single component with history
		if (componentId && includeHistory) {
			const allNotes = await getNoteHistory(userId, componentId);
			const activeNote = allNotes.find(note => !note.is_archived) || null;
			const archivedNotes = allNotes.filter(note => note.is_archived);

			return json({
				activeNote: activeNote ? {
					id: activeNote.id,
					component_id: activeNote.component_id,
					content: activeNote.content,
					is_todo: activeNote.is_todo,
					created_at: activeNote.created_at,
					updated_at: activeNote.updated_at,
					user_email: userEmail,
					user_name: userName
				} : null,
				history: archivedNotes.map(note => ({
					id: note.id,
					component_id: note.component_id,
					content: note.content,
					is_todo: note.is_todo,
					created_at: note.created_at,
					updated_at: note.updated_at,
					user_email: userEmail,
					user_name: userName
				}))
			});
		}

		// Bulk fetch (existing behavior - only active notes)
		if (componentIdsParam) {
			const componentIds = componentIdsParam.split(',').filter(Boolean);
			if (componentIds.length === 0) {
				return json({ notes: [] });
			}

			const notes = await getComponentNotes(userId, componentIds);
			const activeNotes = notes.filter(note => !note.is_archived);

			const noteResponses: ComponentNoteResponse[] = activeNotes.map((note) => ({
				id: note.id,
				component_id: note.component_id,
				content: note.content,
				is_todo: note.is_todo,
				created_at: note.created_at,
				updated_at: note.updated_at,
				user_email: userEmail,
				user_name: userName
			}));

			return json({ notes: noteResponses });
		}

		throw error(400, 'Either componentIds or componentId parameter is required');
	} catch (err) {
		console.error('Error fetching component notes:', err);
		throw error(500, 'Failed to fetch component notes');
	}
};

/**
 * POST /api/notes
 *
 * Create or update a component note
 *
 * Request Body:
 * {
 *   componentId: string,
 *   content: string,
 *   isTodo: boolean,
 *   noteId?: string, // If provided, updates existing note
 *   archiveCurrentAndCreateNew?: boolean // If true, archives current note and creates new one
 * }
 *
 * Returns:
 * {
 *   note: ComponentNoteResponse
 * }
 */
export const POST: RequestHandler = async ({ locals, request, cookies }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { componentId, content, isTodo, noteId, archiveCurrentAndCreateNew } = body;

		if (!componentId || typeof componentId !== 'string') {
			throw error(400, 'componentId is required');
		}

		if (!content || typeof content !== 'string') {
			throw error(400, 'content is required');
		}

		if (typeof isTodo !== 'boolean') {
			throw error(400, 'isTodo must be a boolean');
		}

		let note;

		// Archive current note and create new one
		if (archiveCurrentAndCreateNew) {
			const activeNote = await getActiveNote(userId, componentId);
			if (activeNote) {
				await archiveNote(userId, activeNote.id);
			}
			note = await createNewNote(userId, componentId, content, isTodo);
		}
		// Update existing note
		else if (noteId) {
			note = await updateNote(userId, noteId, content, isTodo);
		}
		// Create or update (legacy behavior for auto-save)
		else {
			const activeNote = await getActiveNote(userId, componentId);
			if (activeNote) {
				note = await updateNote(userId, activeNote.id, content, isTodo);
			} else {
				note = await createNewNote(userId, componentId, content, isTodo);
			}
		}

		// Get user metadata
		const supabase = createServerSupabaseClient(cookies);
		const { data: userData } = await supabase.auth.getUser();

		const userEmail = userData?.user?.email || '';
		const userName = userData?.user?.user_metadata?.full_name || null;

		// Transform to response format
		const noteResponse: ComponentNoteResponse = {
			id: note.id,
			component_id: note.component_id,
			content: note.content,
			is_todo: note.is_todo,
			created_at: note.created_at,
			updated_at: note.updated_at,
			user_email: userEmail,
			user_name: userName
		};

		return json({ note: noteResponse });
	} catch (err) {
		console.error('Error saving component note:', err);
		throw error(500, 'Failed to save component note');
	}
};

/**
 * DELETE /api/notes?componentId=id
 * DELETE /api/notes?noteId=id
 *
 * Delete a component note
 *
 * Query Parameters:
 * - componentId: The component ID to delete the note for (deletes all notes for component)
 * - noteId: The specific note ID to delete (deletes single note by ID)
 *
 * Returns:
 * {
 *   success: true
 * }
 */
export const DELETE: RequestHandler = async ({ locals, url }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const componentId = url.searchParams.get('componentId');
		const noteId = url.searchParams.get('noteId');

		if (!componentId && !noteId) {
			throw error(400, 'Either componentId or noteId parameter is required');
		}

		if (noteId) {
			await deleteNoteById(userId, noteId);
		} else if (componentId) {
			await deleteComponentNote(userId, componentId);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting component note:', err);
		throw error(500, 'Failed to delete component note');
	}
};

