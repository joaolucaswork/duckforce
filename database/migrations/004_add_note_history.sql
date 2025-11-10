-- Migration: Add Note History Support
-- This migration modifies component_notes to support multiple historical entries per component

-- ============================================================================
-- STEP 1: Drop the unique constraint on (user_id, component_id)
-- ============================================================================
ALTER TABLE component_notes DROP CONSTRAINT IF EXISTS component_notes_user_id_component_id_key;

-- ============================================================================
-- STEP 2: Add new columns for note history
-- ============================================================================
ALTER TABLE component_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE component_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 3: Create new indexes for efficient queries
-- ============================================================================
-- Index for getting active (non-archived) notes
CREATE INDEX IF NOT EXISTS idx_component_notes_active ON component_notes(user_id, component_id, is_archived) 
  WHERE is_archived = false;

-- Index for getting all notes (including history) for a component
CREATE INDEX IF NOT EXISTS idx_component_notes_history ON component_notes(user_id, component_id, created_at DESC);

-- ============================================================================
-- STEP 4: Update existing data
-- ============================================================================
-- Mark all existing notes as non-archived (they already default to false, but being explicit)
UPDATE component_notes SET is_archived = false WHERE is_archived IS NULL;

-- Migration complete: component_notes now supports note history

