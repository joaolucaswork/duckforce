import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKanbanBoard, upsertKanbanBoard, deleteKanbanBoard } from '$lib/server/db/kanban';
import type { KanbanBoardResponse } from '$lib/server/db/types';

/**
 * GET /api/kanban
 *
 * Fetch the user's kanban board state
 *
 * Returns:
 * {
 *   columns: Array<{ columnId: string, componentIds: string[] }>
 * }
 */
export const GET: RequestHandler = async ({ locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const board = await getKanbanBoard(userId);

		// If no board exists, return default empty columns
		if (!board) {
			return json({
				columns: [
					{ columnId: 'nao-iniciado', componentIds: [] },
					{ columnId: 'em-andamento', componentIds: [] },
					{ columnId: 'concluido', componentIds: [] }
				]
			});
		}

		return json({
			columns: board.columns
		});
	} catch (err) {
		console.error('Error fetching kanban board:', err);
		throw error(500, 'Failed to fetch kanban board');
	}
};

/**
 * POST /api/kanban
 *
 * Save/update the user's kanban board state
 *
 * Request Body:
 * {
 *   columns: Array<{ columnId: string, componentIds: string[] }>
 * }
 *
 * Returns:
 * {
 *   columns: Array<{ columnId: string, componentIds: string[] }>,
 *   updated_at: string
 * }
 */
export const POST: RequestHandler = async ({ locals, request }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		const body = await request.json();
		const { columns } = body;

		// Validate columns array
		if (!Array.isArray(columns)) {
			throw error(400, 'columns must be an array');
		}

		// Validate each column has required fields
		for (const column of columns) {
			if (!column.columnId || typeof column.columnId !== 'string') {
				throw error(400, 'Each column must have a columnId string');
			}
			if (!Array.isArray(column.componentIds)) {
				throw error(400, 'Each column must have a componentIds array');
			}
		}

		const board = await upsertKanbanBoard(userId, columns);

		const response: KanbanBoardResponse = {
			id: board.id,
			columns: board.columns as any,
			updated_at: board.updated_at
		};

		return json(response);
	} catch (err) {
		console.error('Error saving kanban board:', err);
		if (err instanceof Error && err.message.includes('must be')) {
			throw err; // Re-throw validation errors
		}
		throw error(500, 'Failed to save kanban board');
	}
};

/**
 * DELETE /api/kanban
 *
 * Delete the user's kanban board (reset to empty)
 *
 * Returns:
 * {
 *   success: true
 * }
 */
export const DELETE: RequestHandler = async ({ locals }) => {
	const userId = locals.user?.id;
	if (!userId) {
		throw error(401, 'Unauthorized');
	}

	try {
		await deleteKanbanBoard(userId);

		return json({ success: true });
	} catch (err) {
		console.error('Error deleting kanban board:', err);
		throw error(500, 'Failed to delete kanban board');
	}
};

