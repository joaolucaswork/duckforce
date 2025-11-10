-- Migration: Add Component Notes Table
-- This migration adds support for component notes with to-do functionality

-- ============================================================================
-- STEP 1: Create component_notes table
-- ============================================================================
CREATE TABLE component_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_todo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, component_id)
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================
CREATE INDEX idx_component_notes_user_id ON component_notes(user_id);
CREATE INDEX idx_component_notes_component_id ON component_notes(user_id, component_id);
CREATE INDEX idx_component_notes_is_todo ON component_notes(user_id, is_todo);

-- ============================================================================
-- STEP 3: Enable Row Level Security
-- ============================================================================
ALTER TABLE component_notes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 4: Create RLS Policies
-- ============================================================================

-- Users can view their own notes
CREATE POLICY "Users can view their own component notes"
  ON component_notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own notes
CREATE POLICY "Users can insert their own component notes"
  ON component_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notes
CREATE POLICY "Users can update their own component notes"
  ON component_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notes
CREATE POLICY "Users can delete their own component notes"
  ON component_notes FOR DELETE
  USING (auth.uid() = user_id);

-- Migration complete: component_notes table created

