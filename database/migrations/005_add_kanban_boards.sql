-- Migration: Add kanban_boards table for persisting kanban board state
-- Created: 2025-01-11
-- Description: Stores which components are in which kanban columns per user

-- Create kanban_boards table
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kanban_boards_user_id_unique UNIQUE (user_id)
);

-- Create index on user_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user_id ON public.kanban_boards(user_id);

-- Enable Row Level Security
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can select their own kanban board
CREATE POLICY "Users can view their own kanban board"
  ON public.kanban_boards
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own kanban board
CREATE POLICY "Users can create their own kanban board"
  ON public.kanban_boards
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own kanban board
CREATE POLICY "Users can update their own kanban board"
  ON public.kanban_boards
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own kanban board
CREATE POLICY "Users can delete their own kanban board"
  ON public.kanban_boards
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments
COMMENT ON TABLE public.kanban_boards IS 'Stores kanban board state (component organization in columns) for each user in To-Do Mode';
COMMENT ON COLUMN public.kanban_boards.columns IS 'JSONB array of columns with structure: [{columnId: string, componentIds: string[]}]';

