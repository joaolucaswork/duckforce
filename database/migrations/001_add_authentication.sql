-- Migration: Add Supabase Authentication Support
-- This migration updates the schema to use Supabase Auth instead of plain text user_id

-- ============================================================================
-- STEP 1: Enable Supabase Auth (if not already enabled)
-- ============================================================================
-- This is typically done via Supabase Dashboard: Authentication → Settings
-- Or via Supabase CLI: supabase auth enable

-- ============================================================================
-- STEP 2: Backup existing data (IMPORTANT!)
-- ============================================================================
-- Before running this migration, backup your data:
-- pg_dump -h <host> -U postgres -d postgres -t organizations -t salesforce_components -t active_session > backup.sql

-- ============================================================================
-- STEP 3: Create temporary tables to preserve data
-- ============================================================================
CREATE TABLE organizations_backup AS SELECT * FROM organizations;
CREATE TABLE salesforce_components_backup AS SELECT * FROM salesforce_components;
CREATE TABLE active_session_backup AS SELECT * FROM active_session;

-- ============================================================================
-- STEP 4: Drop existing RLS policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can insert their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can update their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can delete their own organizations" ON organizations;

DROP POLICY IF EXISTS "Users can view components from their organizations" ON salesforce_components;
DROP POLICY IF EXISTS "Users can insert components to their organizations" ON salesforce_components;
DROP POLICY IF EXISTS "Users can update components from their organizations" ON salesforce_components;
DROP POLICY IF EXISTS "Users can delete components from their organizations" ON salesforce_components;

DROP POLICY IF EXISTS "Users can view their own session" ON active_session;
DROP POLICY IF EXISTS "Users can manage their own session" ON active_session;

-- ============================================================================
-- STEP 5: Drop existing tables
-- ============================================================================
DROP TABLE IF EXISTS salesforce_components CASCADE;
DROP TABLE IF EXISTS active_session CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================================================
-- STEP 6: Recreate ORGANIZATIONS table with proper user_id reference
-- ============================================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Salesforce Org Identity
  org_id TEXT NOT NULL,
  instance_url TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('production', 'sandbox', 'developer', 'scratch')),
  
  -- UI Customization
  color TEXT,
  icon TEXT,
  
  -- OAuth Tokens (encrypted in production - see Step 9)
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
-- STEP 7: Recreate SALESFORCE_COMPONENTS table
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
-- STEP 8: Recreate ACTIVE_SESSION table
-- ============================================================================
CREATE TABLE active_session (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  access_token TEXT,
  refresh_token TEXT,
  instance_url TEXT,
  
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 9: Enable Row Level Security
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 10: Create NEW RLS Policies using auth.uid()
-- ============================================================================

-- Organizations Policies
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organizations"
  ON organizations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organizations"
  ON organizations FOR DELETE
  USING (auth.uid() = user_id);

-- Salesforce Components Policies
CREATE POLICY "Users can view components from their organizations"
  ON salesforce_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert components to their organizations"
  ON salesforce_components FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update components from their organizations"
  ON salesforce_components FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete components from their organizations"
  ON salesforce_components FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id = auth.uid()
    )
  );

-- Active Session Policies
CREATE POLICY "Users can view their own session"
  ON active_session FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own session"
  ON active_session FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own session"
  ON active_session FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own session"
  ON active_session FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STEP 11: Restore data (MANUAL STEP - requires user mapping)
-- ============================================================================
-- You'll need to manually map 'demo-user' to actual auth.users UUIDs
-- Example:
-- INSERT INTO organizations (user_id, org_id, instance_url, ...)
-- SELECT 
--   '<actual-user-uuid>'::uuid,  -- Replace with real user UUID from auth.users
--   org_id,
--   instance_url,
--   ...
-- FROM organizations_backup
-- WHERE user_id = 'demo-user';

-- ============================================================================
-- STEP 12: Clean up backup tables (after verifying data)
-- ============================================================================
-- DROP TABLE organizations_backup;
-- DROP TABLE salesforce_components_backup;
-- DROP TABLE active_session_backup;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Run this migration in a transaction for safety
-- 2. Test RLS policies work correctly before deploying to production
-- 3. Consider encrypting access_token and refresh_token columns
-- 4. Enable Supabase Auth email confirmation in production
-- 5. Set up proper email templates for password reset, etc.

