# Quick Start Guide: Implementing the New Authentication System

This guide provides step-by-step instructions for implementing the new single-login authentication model with persistent organization data caching.

---

## Prerequisites

Before starting, ensure you have:

- ✅ A Supabase project (free tier is fine)
- ✅ Supabase URL and service role key
- ✅ Basic understanding of SvelteKit and TypeScript
- ✅ Access to your Salesforce Connected App credentials

---

## Phase 1: Database Setup (30 minutes)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project (or use existing)
3. Copy your project URL and service role key

### Step 2: Run Database Migrations

Execute the following SQL in your Supabase SQL Editor:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
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

-- Salesforce Components table
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

-- Active Session table
CREATE TABLE active_session (
  user_id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  
  access_token TEXT,
  refresh_token TEXT,
  instance_url TEXT,
  
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_user_id ON organizations(user_id);
CREATE INDEX idx_organizations_org_id ON organizations(org_id);
CREATE INDEX idx_organizations_last_connected ON organizations(user_id, last_connected_at DESC);
CREATE INDEX idx_components_org_id ON salesforce_components(organization_id);
CREATE INDEX idx_components_type ON salesforce_components(organization_id, type);
CREATE INDEX idx_components_api_name ON salesforce_components(organization_id, api_name);

-- Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE salesforce_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_session ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organizations"
  ON organizations FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can insert their own organizations"
  ON organizations FOR INSERT
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Users can update their own organizations"
  ON organizations FOR UPDATE
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can delete their own organizations"
  ON organizations FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- RLS Policies for components
CREATE POLICY "Users can view components from their organizations"
  ON salesforce_components FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert components to their organizations"
  ON salesforce_components FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM organizations
      WHERE organizations.id = salesforce_components.organization_id
      AND organizations.user_id::text = auth.uid()::text
    )
  );

-- RLS Policies for active_session
CREATE POLICY "Users can view their own session"
  ON active_session FOR SELECT
  USING (user_id::text = auth.uid()::text);

CREATE POLICY "Users can manage their own session"
  ON active_session FOR ALL
  USING (user_id::text = auth.uid()::text);
```

### Step 3: Install Supabase Client

```bash
pnpm add @supabase/supabase-js
```

### Step 4: Add Environment Variables

Add to your `.env` file:

```bash
# Existing Salesforce variables
SALESFORCE_CLIENT_ID=your_client_id
SALESFORCE_CALLBACK_URL=http://localhost:5173/api/auth/salesforce/callback
SALESFORCE_LOGIN_URL=https://login.salesforce.com

# New Supabase variables
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
```

---

## Phase 2: Backend Implementation (2-3 hours)

### Step 1: Create Supabase Client

Create `src/lib/server/supabase/client.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
```

### Step 2: Create Database Helper Functions

Create `src/lib/server/db/organizations.ts` - see `IMPLEMENTATION_EXAMPLES.md` for full code.

### Step 3: Update OAuth Callback

Modify `src/routes/api/auth/salesforce/callback/+server.ts` to:
1. Save organization to database
2. Set active session
3. Optionally fetch and cache components

See `IMPLEMENTATION_EXAMPLES.md` for complete example.

### Step 4: Create New API Endpoints

Create these new endpoints:

```
src/routes/api/orgs/
├── +server.ts                    (GET: list all orgs)
├── [orgId]/
│   ├── +server.ts                (GET: org details, DELETE: remove org)
│   ├── activate/+server.ts       (POST: switch to this org)
│   ├── sync/+server.ts           (POST: re-sync data)
│   └── components/+server.ts     (GET: cached components)
```

---

## Phase 3: Frontend Updates (2-3 hours)

### Step 1: Update Type Definitions

Modify `src/lib/types/salesforce.ts`:

```typescript
export interface CachedOrganization {
  id: string;
  org_id: string;
  org_name: string;
  instance_url: string;
  org_type: 'production' | 'sandbox' | 'developer' | 'scratch';
  color?: string;
  icon?: string;
  last_connected_at: string;
  last_synced_at?: string;
  is_active: boolean; // Currently active session
}
```

### Step 2: Update Wizard Store

Modify `src/lib/stores/wizard.svelte.ts`:

```typescript
class WizardStore {
  state = $state<WizardState>({
    currentStep: 'configure-orgs',
    completedSteps: new Set(),
    
    // NEW: List of all cached orgs
    cachedOrgs: [] as CachedOrganization[],
    activeOrg: null as CachedOrganization | null,
    
    // NEW: Selected orgs for migration
    selectedSourceOrgId: null as string | null,
    selectedTargetOrgId: null as string | null,
    
    componentSelection: { /* ... */ },
    dependencyReview: { /* ... */ },
    migrationExecution: { /* ... */ }
  });
  
  // NEW: Load cached organizations
  async loadCachedOrgs() {
    const response = await fetch('/api/orgs');
    const orgs = await response.json();
    this.state.cachedOrgs = orgs;
  }
  
  // NEW: Switch active org
  async switchToOrg(orgId: string) {
    const response = await fetch(`/api/orgs/${orgId}/activate`, {
      method: 'POST'
    });
    if (response.ok) {
      await this.loadCachedOrgs();
    }
  }
}
```

### Step 3: Update ConfigureOrgs Component

Modify `src/lib/components/wizard/steps/ConfigureOrgs.svelte`:

1. Show list of cached organizations
2. Add "Connect New Org" button
3. Add org selector for source/target
4. Remove dual-login UI

Example structure:

```svelte
<script lang="ts">
  import { wizardStore } from '$lib/stores/wizard.svelte';
  import { onMount } from 'svelte';
  
  onMount(async () => {
    await wizardStore.loadCachedOrgs();
  });
  
  function handleConnectNewOrg() {
    window.location.href = '/api/auth/salesforce/login';
  }
</script>

<div class="org-selector">
  <h2>Cached Organizations</h2>
  
  {#each wizardStore.state.cachedOrgs as org}
    <div class="org-card" class:active={org.is_active}>
      <h3>{org.org_name}</h3>
      <p>{org.instance_url}</p>
      <button on:click={() => wizardStore.switchToOrg(org.id)}>
        {org.is_active ? 'Active' : 'Switch to this org'}
      </button>
    </div>
  {/each}
  
  <button on:click={handleConnectNewOrg}>
    Connect New Organization
  </button>
</div>

<div class="migration-setup">
  <h2>Select Organizations for Migration</h2>
  
  <label>
    Source Org:
    <select bind:value={wizardStore.state.selectedSourceOrgId}>
      {#each wizardStore.state.cachedOrgs as org}
        <option value={org.id}>{org.org_name}</option>
      {/each}
    </select>
  </label>
  
  <label>
    Target Org:
    <select bind:value={wizardStore.state.selectedTargetOrgId}>
      {#each wizardStore.state.cachedOrgs as org}
        <option value={org.id}>{org.org_name}</option>
      {/each}
    </select>
  </label>
</div>
```

---

## Phase 4: Testing (1 hour)

### Test Checklist

- [ ] Connect to first Salesforce org
- [ ] Verify org is saved to database
- [ ] Verify components are cached
- [ ] Log out
- [ ] Connect to second Salesforce org
- [ ] Verify both orgs appear in cached list
- [ ] Switch between orgs
- [ ] Verify cached data loads instantly
- [ ] Select source and target orgs
- [ ] Proceed with migration wizard

---

## Migration Strategy for Existing Users

If you have existing users with the old dual-org system:

1. **Keep old endpoints temporarily** for backward compatibility
2. **Add migration script** to convert cookie data to database
3. **Show migration prompt** to users on first login
4. **Deprecate old system** after 30 days

---

## Benefits You'll See Immediately

✅ **Faster org switching** - Instant instead of re-authenticating
✅ **Data persistence** - Logout doesn't lose data
✅ **Better UX** - Can compare multiple orgs side-by-side
✅ **Simpler setup** - Only one Connected App needed
✅ **Scalability** - Support unlimited orgs
✅ **Offline capability** - View cached data anytime

---

## Need Help?

Refer to these documents:
- `AUTHENTICATION_MIGRATION_PLAN.md` - Complete architecture overview
- `IMPLEMENTATION_EXAMPLES.md` - Detailed code examples
- `CURRENT_SYSTEM_ISSUES.md` - Problems being solved

---

## Estimated Timeline

- **Phase 1** (Database): 30 minutes
- **Phase 2** (Backend): 2-3 hours
- **Phase 3** (Frontend): 2-3 hours
- **Phase 4** (Testing): 1 hour

**Total: 6-8 hours** for complete implementation

