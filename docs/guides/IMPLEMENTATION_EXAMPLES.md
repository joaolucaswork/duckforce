# Implementation Examples for New Authentication System

This document provides concrete code examples for implementing the new single-login authentication model with persistent organization data caching.

---

## 1. Supabase Client Setup

### `src/lib/server/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import type { Database } from './database.types';

/**
 * Server-side Supabase client with service role key
 * Use this for server-side operations that bypass RLS
 */
export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Create a Supabase client for a specific user
 * This respects RLS policies
 */
export function createUserSupabaseClient(userId: string) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      headers: {
        'sb-user-id': userId
      }
    }
  });
}
```

---

## 2. Organization Data Layer

### `src/lib/server/db/organizations.ts`

```typescript
import { supabaseAdmin } from '../supabase/client';
import type { Organization, OrganizationInsert, OrganizationUpdate } from './types';

/**
 * Save or update organization data
 */
export async function upsertOrganization(
  userId: string,
  orgData: OrganizationInsert
): Promise<Organization> {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .upsert({
      user_id: userId,
      org_id: orgData.org_id,
      instance_url: orgData.instance_url,
      org_name: orgData.org_name,
      org_type: orgData.org_type,
      color: orgData.color,
      icon: orgData.icon,
      access_token: orgData.access_token, // Should be encrypted
      refresh_token: orgData.refresh_token, // Should be encrypted
      api_version: orgData.api_version,
      last_connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,org_id'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('user_id', userId)
    .order('last_connected_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get a specific organization
 */
export async function getOrganization(
  userId: string,
  orgId: string
): Promise<Organization | null> {
  const { data, error } = await supabaseAdmin
    .from('organizations')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Delete an organization and all its cached data
 */
export async function deleteOrganization(
  userId: string,
  orgId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('organizations')
    .delete()
    .eq('user_id', userId)
    .eq('org_id', orgId);

  if (error) throw error;
}

/**
 * Update organization tokens
 */
export async function updateOrganizationTokens(
  userId: string,
  orgId: string,
  accessToken: string,
  refreshToken?: string
): Promise<void> {
  const updateData: any = {
    access_token: accessToken,
    updated_at: new Date().toISOString()
  };

  if (refreshToken) {
    updateData.refresh_token = refreshToken;
  }

  const { error } = await supabaseAdmin
    .from('organizations')
    .update(updateData)
    .eq('user_id', userId)
    .eq('org_id', orgId);

  if (error) throw error;
}
```

---

## 3. Active Session Management

### `src/lib/server/db/session.ts`

```typescript
import { supabaseAdmin } from '../supabase/client';
import type { ActiveSession } from './types';

/**
 * Set the active session for a user
 */
export async function setActiveSession(
  userId: string,
  organizationId: string,
  sessionData: {
    accessToken: string;
    refreshToken: string;
    instanceUrl: string;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('active_session')
    .upsert({
      user_id: userId,
      organization_id: organizationId,
      access_token: sessionData.accessToken,
      refresh_token: sessionData.refreshToken,
      instance_url: sessionData.instanceUrl,
      connected_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) throw error;
}

/**
 * Get the active session for a user
 */
export async function getActiveSession(userId: string): Promise<ActiveSession | null> {
  const { data, error } = await supabaseAdmin
    .from('active_session')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Clear the active session
 */
export async function clearActiveSession(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('active_session')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
```

---

## 4. Component Caching

### `src/lib/server/db/components.ts`

```typescript
import { supabaseAdmin } from '../supabase/client';
import type { SalesforceComponent, ComponentInsert } from './types';

/**
 * Cache components for an organization
 */
export async function cacheComponents(
  organizationId: string,
  components: ComponentInsert[]
): Promise<void> {
  // First, delete existing components for this org
  await supabaseAdmin
    .from('salesforce_components')
    .delete()
    .eq('organization_id', organizationId);

  // Then insert new components
  const { error } = await supabaseAdmin
    .from('salesforce_components')
    .insert(
      components.map(comp => ({
        organization_id: organizationId,
        component_id: comp.component_id,
        api_name: comp.api_name,
        name: comp.name,
        type: comp.type,
        description: comp.description,
        namespace: comp.namespace,
        metadata: comp.metadata,
        dependencies: comp.dependencies,
        dependents: comp.dependents,
        migration_status: 'pending'
      }))
    );

  if (error) throw error;

  // Update last_synced_at for the organization
  await supabaseAdmin
    .from('organizations')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', organizationId);
}

/**
 * Get cached components for an organization
 */
export async function getCachedComponents(
  organizationId: string,
  filters?: {
    type?: string;
    search?: string;
  }
): Promise<SalesforceComponent[]> {
  let query = supabaseAdmin
    .from('salesforce_components')
    .select('*')
    .eq('organization_id', organizationId);

  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,api_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Update component migration status
 */
export async function updateComponentMigrationStatus(
  componentId: string,
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'skipped',
  notes?: string
): Promise<void> {
  const updateData: any = {
    migration_status: status,
    updated_at: new Date().toISOString()
  };

  if (status === 'completed') {
    updateData.migration_date = new Date().toISOString();
  }

  if (notes) {
    updateData.migration_notes = notes;
  }

  const { error } = await supabaseAdmin
    .from('salesforce_components')
    .update(updateData)
    .eq('id', componentId);

  if (error) throw error;
}
```

---

## 5. New Authentication Flow

### `src/routes/api/auth/salesforce/callback/+server.ts` (Updated)

```typescript
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { exchangeCodeForTokens } from '$lib/server/salesforce/oauth';
import { upsertOrganization } from '$lib/server/db/organizations';
import { setActiveSession } from '$lib/server/db/session';
import { Connection } from '@jsforce/jsforce-node';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  
  // Validate OAuth callback...
  
  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(oauth2, code, codeVerifier);
  
  // Get org info using jsforce
  const conn = new Connection({
    instanceUrl: tokens.instanceUrl,
    accessToken: tokens.accessToken
  });
  
  const identity = await conn.identity();
  const orgId = identity.organization_id;
  const orgName = identity.organization_name || 'Salesforce Org';
  
  // Get user ID from session (you'll need to implement user auth)
  const userId = locals.user?.id;
  if (!userId) {
    throw redirect(302, '/login');
  }
  
  // Save organization to database
  const organization = await upsertOrganization(userId, {
    org_id: orgId,
    instance_url: tokens.instanceUrl,
    org_name: orgName,
    org_type: 'production', // Detect from instanceUrl
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    api_version: '60.0'
  });
  
  // Set as active session
  await setActiveSession(userId, organization.id, {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    instanceUrl: tokens.instanceUrl
  });
  
  // Redirect to dashboard
  throw redirect(302, '/dashboard?org_connected=true');
};
```

---

## 6. Organization Switching

### `src/routes/api/orgs/[orgId]/activate/+server.ts`

```typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOrganization } from '$lib/server/db/organizations';
import { setActiveSession } from '$lib/server/db/session';

export const POST: RequestHandler = async ({ params, locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, 'Unauthorized');
  }
  
  const orgId = params.orgId;
  
  // Get organization from cache
  const org = await getOrganization(userId, orgId);
  if (!org) {
    throw error(404, 'Organization not found');
  }
  
  // Set as active session
  await setActiveSession(userId, org.id, {
    accessToken: org.access_token,
    refreshToken: org.refresh_token,
    instanceUrl: org.instance_url
  });
  
  return json({
    success: true,
    organization: {
      id: org.id,
      org_id: org.org_id,
      org_name: org.org_name,
      instance_url: org.instance_url
    }
  });
};
```

---

## Next Steps

This provides the foundation for the new authentication system. The key changes are:

1. **Single session management** - Only one active Salesforce connection at a time
2. **Persistent storage** - All org data saved to Supabase
3. **Flexible switching** - Users can switch between cached orgs instantly
4. **Data preservation** - Logout doesn't delete cached data

Would you like me to implement any of these components in your codebase?

