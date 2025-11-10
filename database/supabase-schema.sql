-- DuckForce Database Schema
-- Supabase Project: ucoererotujfwjhhoxec
-- Region: sa-east-1
-- Created: 2025-10-31

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS TABLE
-- Stores metadata about connected Salesforce organizations
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Salesforce Org Identity
  org_id TEXT NOT NULL,
  instance_url TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('production', 'sandbox', 'developer', 'scratch')),
  
  -- UI Customization
  color TEXT,
  icon TEXT,
  
  -- OAuth Tokens (should be encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  api_version TEXT DEFAULT '60.0',
  last_connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, org_id)
);

-- Indexes for organizations
CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_org_id ON organizations(org_id);
CREATE INDEX idx_organizations_last_connected ON organizations(user_id, last_connected_at DESC);

-- ============================================================================
-- SALESFORCE_COMPONENTS TABLE
-- Stores cached Salesforce component metadata
-- ============================================================================
CREATE TABLE salesforce_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  component_id TEXT NOT NULL,
  api_name TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lwc', 'field', 'object', 'apex', 'trigger', 'visualforce', 'flow')),
  
  description TEXT,
  namespace TEXT,
  metadata JSONB,
  
  dependencies JSONB DEFAULT '[]'::jsonb,
  dependents JSONB DEFAULT '[]'::jsonb,
  
  migration_status TEXT DEFAULT 'pending' CHECK (migration_status IN ('pending', 'in-progress', 'completed', 'blocked', 'skipped')),
  migration_date TIMESTAMPTZ,
  migration_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, component_id)
);

-- Indexes for components
CREATE INDEX idx_components_org_id ON salesforce_components(organization_id);
CREATE INDEX idx_components_type ON salesforce_components(organization_id, type);
CREATE INDEX idx_components_api_name ON salesforce_components(organization_id, api_name);

-- ============================================================================
-- ACTIVE_SESSION TABLE
-- Tracks the currently active Salesforce session
-- ============================================================================
CREATE TABLE active_session (
  user_id TEXT PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  access_token TEXT,
  refresh_token TEXT,
  instance_url TEXT,
  
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (user_id = current_user);

CREATE POLICY "Users can insert their own organizations"
  ON organizations FOR INSERT
  WITH CHECK (user_id = current_user);

CREATE POLICY "Users can update their own organizations"
  ON organizations FOR UPDATE
  USING (user_id = current_user);

CREATE POLICY "Users can delete their own organizations"
  ON organizations FOR DELETE
  USING (user_id = current_user);

-- RLS Policies for salesforce_components
CREATE POLICY "Users can view components from their organizations"
  ON salesforce_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = current_user
    )
  );

CREATE POLICY "Users can insert components to their organizations"
  ON salesforce_components FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = current_user
    )
  );

CREATE POLICY "Users can update components from their organizations"
  ON salesforce_components FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = current_user
    )
  );

CREATE POLICY "Users can delete components from their organizations"
  ON salesforce_components FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = current_user
    )
  );

-- RLS Policies for active_session
CREATE POLICY "Users can view their own session"
  ON active_session FOR SELECT
  USING (user_id = current_user);

CREATE POLICY "Users can manage their own session"
  ON active_session FOR ALL
  USING (user_id = current_user);

-- ============================================================================
-- COMPONENT_NOTES TABLE
-- Stores user notes for components with to-do functionality and history
-- ============================================================================
CREATE TABLE component_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  component_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_todo BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for component_notes
CREATE INDEX idx_component_notes_user_id ON component_notes(user_id);
CREATE INDEX idx_component_notes_component_id ON component_notes(user_id, component_id);
CREATE INDEX idx_component_notes_is_todo ON component_notes(user_id, is_todo);
CREATE INDEX idx_component_notes_active ON component_notes(user_id, component_id, is_archived) WHERE is_archived = false;
CREATE INDEX idx_component_notes_history ON component_notes(user_id, component_id, created_at DESC);

-- Enable RLS on component_notes
ALTER TABLE component_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for component_notes
CREATE POLICY "Users can view their own component notes"
  ON component_notes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own component notes"
  ON component_notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own component notes"
  ON component_notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own component notes"
  ON component_notes FOR DELETE
  USING (auth.uid() = user_id);

