# Authentication System Migration Plan

## Executive Summary

This document outlines the migration from the current **dual-org authentication model** to a new **single-login model with persistent organization data caching**. The new model will allow users to log into any Salesforce organization, cache its data locally, and switch between organizations without losing previously fetched data.

---

## Current Implementation Analysis

### Architecture Overview

The current system implements a **dual-org authentication model** where:
- Users must authenticate to **two separate organizations** simultaneously (source and target)
- Each org has its own set of cookies: `sf_source_*` and `sf_target_*`
- Sessions are managed via httpOnly cookies with 30-day expiration
- OAuth flow uses PKCE for enhanced security

### Current Cookie Structure

```
Source Org Cookies:
- sf_source_access_token
- sf_source_refresh_token
- sf_source_instance_url
- sf_source_org_id
- sf_source_org_name
- sf_source_org_type
- sf_source_color
- sf_source_icon

Target Org Cookies:
- sf_target_access_token
- sf_target_refresh_token
- sf_target_instance_url
- sf_target_org_id
- sf_target_org_name
- sf_target_org_type
- sf_target_color
- sf_target_icon
```

### Identified Issues and Complexity

#### 1. **Cross-Org OAuth Restriction**
**Problem**: Salesforce blocks OAuth flows between different organizations when using the same Connected App.

**Current Workaround**: Requires creating separate Connected Apps in each org with different Client IDs:
- `SALESFORCE_SOURCE_CLIENT_ID` for source org
- `SALESFORCE_TARGET_CLIENT_ID` for target org

**Complexity**: 
- Users must create and configure Connected Apps in both orgs
- Configuration management becomes complex
- Error-prone setup process

#### 2. **Cookie Namespace Collision**
**Problem**: The hardcoded `source` and `target` cookie namespaces limit flexibility.

**Issues**:
- Cannot connect to more than 2 orgs
- Cannot switch which org is "source" vs "target"
- Cookie management logic is tightly coupled to the dual-org concept

#### 3. **No Data Persistence**
**Problem**: When a user logs out of an org, all cached data is lost.

**Impact**:
- Users must re-fetch all data when switching back to a previously connected org
- No historical data available for comparison
- Poor user experience for multi-org workflows

#### 4. **Rigid Workflow**
**Problem**: The wizard assumes a linear source → target migration flow.

**Limitations**:
- Cannot compare data across multiple orgs
- Cannot migrate from multiple sources to one target
- Cannot perform exploratory analysis across orgs

#### 5. **State Management Complexity**
**Problem**: The wizard store maintains separate state for `sourceOrg` and `targetOrg`.

**Issues**:
- Duplicated logic for connection management
- Difficult to extend to more than 2 orgs
- Tight coupling between UI and authentication layer

---

## Proposed Solution: Single-Login with Persistent Caching

### New Architecture Principles

1. **Single Active Session**: Only one Salesforce org is authenticated at a time
2. **Persistent Data Cache**: All fetched org data is stored in a database (Supabase)
3. **Organization History**: Users can access data from previously connected orgs
4. **Flexible Workflows**: Support any number of orgs and any migration pattern

### High-Level Flow

```
1. User logs into Org A
   ↓
2. Application fetches and caches Org A data in Supabase
   ↓
3. User logs out of Org A
   ↓
4. User logs into Org B
   ↓
5. Application fetches and caches Org B data in Supabase
   ↓
6. User can now access BOTH Org A and Org B data from cache
   ↓
7. User can select any cached org as source/target for migration
```

### Key Benefits

✅ **Simplified Authentication**: Only one OAuth flow at a time
✅ **No Cross-Org Issues**: Each login is independent
✅ **Data Persistence**: Historical data available even after logout
✅ **Scalability**: Support unlimited number of orgs
✅ **Flexibility**: Any org can be source or target
✅ **Better UX**: No need to maintain multiple simultaneous sessions

---

## Database Schema Design

### Supabase Tables

#### 1. `organizations` Table
Stores metadata about connected Salesforce organizations.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Salesforce Org Identity
  org_id TEXT NOT NULL UNIQUE, -- Salesforce 15 or 18 char org ID
  instance_url TEXT NOT NULL,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL CHECK (org_type IN ('production', 'sandbox', 'developer', 'scratch')),
  
  -- UI Customization
  color TEXT,
  icon TEXT,
  
  -- OAuth Tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Metadata
  api_version TEXT DEFAULT '60.0',
  last_connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Composite unique constraint
  UNIQUE(user_id, org_id)
);

CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_org_id ON organizations(org_id);
CREATE INDEX idx_organizations_last_connected ON organizations(user_id, last_connected_at DESC);
```

#### 2. `salesforce_components` Table
Stores cached Salesforce component metadata.

```sql
CREATE TABLE salesforce_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Component Identity
  component_id TEXT NOT NULL, -- Unique within org
  api_name TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lwc', 'field', 'object', 'apex', 'trigger', 'visualforce', 'flow')),
  
  -- Component Details
  description TEXT,
  namespace TEXT,
  metadata JSONB, -- Full metadata from Salesforce
  
  -- Dependencies (stored as JSONB arrays)
  dependencies JSONB DEFAULT '[]'::jsonb,
  dependents JSONB DEFAULT '[]'::jsonb,
  
  -- Migration Status
  migration_status TEXT DEFAULT 'pending' CHECK (migration_status IN ('pending', 'in-progress', 'completed', 'blocked', 'skipped')),
  migration_date TIMESTAMPTZ,
  migration_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id, component_id)
);

CREATE INDEX idx_components_org_id ON salesforce_components(organization_id);
CREATE INDEX idx_components_type ON salesforce_components(organization_id, type);
CREATE INDEX idx_components_api_name ON salesforce_components(organization_id, api_name);
```

#### 3. `active_session` Table
Tracks the currently active Salesforce session.

```sql
CREATE TABLE active_session (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Session cookies (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  instance_url TEXT,
  
  -- Session metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `migration_projects` Table (Optional - for future use)
Stores migration project configurations.

```sql
CREATE TABLE migration_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  
  source_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  target_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  -- Selected components for migration
  selected_component_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Migration status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'in-progress', 'completed', 'failed')),
  completion_percentage INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Implementation Plan

### Phase 1: Database Setup

**Tasks:**
1. Set up Supabase project (if not already done)
2. Create database tables using the schema above
3. Set up Row Level Security (RLS) policies
4. Create database helper functions for common queries

**RLS Policies Example:**
```sql
-- Organizations table RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own organizations"
  ON organizations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organizations"
  ON organizations FOR UPDATE
  USING (auth.uid() = user_id);
```

### Phase 2: Backend Refactoring

**Tasks:**
1. Create Supabase client utilities
2. Implement organization data persistence layer
3. Refactor authentication to use single-session model
4. Update cookie management for single active session
5. Create API endpoints for org management

**New API Endpoints:**
```
GET  /api/orgs                    - List all cached organizations
GET  /api/orgs/:orgId             - Get specific org details
POST /api/orgs/connect            - Connect to new org (OAuth)
POST /api/orgs/:orgId/activate    - Switch to cached org
POST /api/orgs/:orgId/sync        - Re-sync org data
DELETE /api/orgs/:orgId           - Remove cached org

GET  /api/orgs/:orgId/components  - Get cached components
POST /api/orgs/:orgId/fetch       - Fetch fresh component data
```

### Phase 3: Frontend Updates

**Tasks:**
1. Update wizard store to support multiple orgs
2. Create org selector component
3. Update ConfigureOrgs step to show org history
4. Implement org switching UI
5. Update component selection to work with cached data

### Phase 4: Migration & Testing

**Tasks:**
1. Create migration script for existing users
2. Test OAuth flow with single session
3. Test org switching functionality
4. Test data persistence across sessions
5. Performance testing with large datasets

---

## Next Steps

Would you like me to:
1. **Implement the database schema** in Supabase?
2. **Create the backend API endpoints** for org management?
3. **Refactor the authentication system** to use single-session model?
4. **Update the frontend** to support org switching?

Please let me know which phase you'd like to start with, and I'll provide detailed implementation code.

