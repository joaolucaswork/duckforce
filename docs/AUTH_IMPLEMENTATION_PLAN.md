# Multi-User Authentication Implementation Plan

## 📊 Current State Analysis

### What's Missing

1. **No User Authentication**
   - All endpoints use hardcoded `userId = 'demo-user'`
   - No login/signup pages
   - No session management
   - No authentication middleware

2. **RLS Not Enforced**
   - Using `supabaseAdmin` (service role key) bypasses all RLS policies
   - RLS policies exist but are never applied
   - Any user could access any data if they knew the API

3. **Wrong Schema**
   - `user_id TEXT` instead of `user_id UUID REFERENCES auth.users(id)`
   - RLS policies use `current_user` (PostgreSQL) instead of `auth.uid()` (Supabase Auth)
   - No connection to Supabase Auth system

4. **Security Vulnerabilities**
   - Salesforce tokens stored as plain text
   - No encryption of sensitive data
   - Service role key used for all operations

---

## 🎯 Recommended Authentication Approach

### **Supabase Auth with Email/Password**

**Architecture:**
```
┌─────────────────────────────────────────────────────────────┐
│                     DuckForce User                          │
│                  (Supabase Auth)                            │
│                                                             │
│  Email: user@example.com                                   │
│  Password: ********                                        │
│  User ID: 550e8400-e29b-41d4-a716-446655440000            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ owns
                          ▼
        ┌─────────────────────────────────────┐
        │     Salesforce Organizations        │
        │                                     │
        │  ┌─────────────────────────────┐  │
        │  │ Org 1: Production           │  │
        │  │ OAuth Tokens (encrypted)    │  │
        │  └─────────────────────────────┘  │
        │                                     │
        │  ┌─────────────────────────────┐  │
        │  │ Org 2: Sandbox              │  │
        │  │ OAuth Tokens (encrypted)    │  │
        │  └─────────────────────────────┘  │
        └─────────────────────────────────────┘
```

**Why This Approach?**
- ✅ One DuckForce account can manage multiple Salesforce orgs
- ✅ Salesforce OAuth is for connecting orgs, NOT user identity
- ✅ Built-in user management via `auth.users` table
- ✅ Seamless RLS integration with `auth.uid()`
- ✅ Session management handled by Supabase
- ✅ Can add OAuth providers later (Google, GitHub, etc.)

---

## 🔧 Required Changes

### 1. Database Schema Migration

**File:** `database/migrations/001_add_authentication.sql` ✅ Created

**Changes:**
- Change `user_id TEXT` → `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- Update RLS policies to use `auth.uid()` instead of `current_user`
- Preserve existing data during migration

**Run Migration:**
```bash
# Via Supabase Dashboard: SQL Editor → Paste migration → Run
# Or via Supabase CLI:
supabase db push
```

---

### 2. Environment Variables

**Add to `.env`:**
```bash
# Existing variables
SUPABASE_URL=https://ucoererotujfwjhhoxec.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...  # Keep for admin operations

# NEW: Add anon key for client-side auth
SUPABASE_ANON_KEY=eyJhbGci...  # Get from Supabase Dashboard → Settings → API
```

**Add to `src/env.d.ts`:**
```typescript
declare module '$env/static/private' {
  export const SUPABASE_URL: string;
  export const SUPABASE_SERVICE_KEY: string;
  export const SUPABASE_ANON_KEY: string;  // NEW
  // ... other vars
}

declare module '$env/static/public' {
  export const PUBLIC_SUPABASE_URL: string;  // NEW
  export const PUBLIC_SUPABASE_ANON_KEY: string;  // NEW
}
```

---

### 3. Supabase Client Updates

**Create:** `src/lib/server/supabase/auth.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Database } from './database.types';
import type { Cookies } from '@sveltejs/kit';

/**
 * Create a Supabase client for server-side auth operations
 * This client respects RLS policies
 */
export function createServerSupabaseClient(cookies: Cookies) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    global: {
      headers: {
        cookie: cookies.getAll().map(c => `${c.name}=${c.value}`).join('; ')
      }
    }
  });
}

/**
 * Get the authenticated user from the session
 */
export async function getAuthenticatedUser(cookies: Cookies) {
  const supabase = createServerSupabaseClient(cookies);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
```

**Create:** `src/lib/supabase.ts` (client-side)
```typescript
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/server/supabase/database.types';

export const supabase = createClient<Database>(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true
    }
  }
);
```

---

### 4. Authentication Middleware

**Create:** `src/hooks.server.ts`
```typescript
import { createServerSupabaseClient } from '$lib/server/supabase/auth';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Create Supabase client
  const supabase = createServerSupabaseClient(event.cookies);
  
  // Get user session
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Attach user to locals
  event.locals.supabase = supabase;
  event.locals.session = session;
  event.locals.user = session?.user ?? null;
  
  // Protected routes
  const protectedRoutes = ['/wizard', '/api/orgs'];
  const isProtectedRoute = protectedRoutes.some(route => 
    event.url.pathname.startsWith(route)
  );
  
  // Redirect to login if accessing protected route without auth
  if (isProtectedRoute && !session) {
    throw redirect(303, '/login');
  }
  
  // Public auth routes (redirect to wizard if already logged in)
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.includes(event.url.pathname);
  
  if (isAuthRoute && session) {
    throw redirect(303, '/wizard');
  }
  
  return resolve(event);
};
```

**Update:** `src/app.d.ts`
```typescript
import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '$lib/server/supabase/database.types';

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      session: Session | null;
      user: User | null;
    }
    interface PageData {
      session: Session | null;
    }
  }
}

export {};
```

---

### 5. Update All API Endpoints

**Pattern to replace:**
```typescript
// OLD (INSECURE)
const userId = (locals as any).user?.id || 'demo-user';

// NEW (SECURE)
const userId = locals.user?.id;
if (!userId) {
  throw error(401, 'Unauthorized');
}
```

**Files to update:**
- `src/routes/api/orgs/+server.ts`
- `src/routes/api/orgs/[orgId]/+server.ts`
- `src/routes/api/orgs/[orgId]/activate/+server.ts`
- `src/routes/api/orgs/[orgId]/sync/+server.ts`
- `src/routes/api/auth/salesforce/callback/+server.ts`
- `src/routes/api/auth/salesforce/status/+server.ts`
- `src/routes/api/auth/salesforce/logout/+server.ts`

**Example update for `/api/orgs/+server.ts`:**
```typescript
export const GET: RequestHandler = async ({ locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    throw error(401, 'Unauthorized');
  }

  try {
    const organizations = await getUserOrganizations(userId);
    // ... rest of code
  }
}
```

---

### 6. Authentication UI Components

**Create:** `src/routes/login/+page.svelte`
**Create:** `src/routes/signup/+page.svelte`
**Create:** `src/lib/components/auth/LoginForm.svelte`
**Create:** `src/lib/components/auth/SignupForm.svelte`

See next section for full implementation.

---

### 7. Session Management

**Create:** `src/routes/+layout.server.ts`
```typescript
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    session: locals.session,
    user: locals.user
  };
};
```

---

## 🔒 Security Considerations

### 1. Data Isolation
- ✅ RLS policies ensure users only see their own data
- ✅ `auth.uid()` automatically filters queries
- ✅ Service role key only used for admin operations

### 2. Token Security
- ⚠️ **TODO**: Encrypt `access_token` and `refresh_token` columns
- Use PostgreSQL `pgcrypto` extension
- Encrypt before INSERT, decrypt on SELECT

### 3. Session Security
- ✅ HTTP-only cookies for session tokens
- ✅ PKCE flow for OAuth
- ✅ CSRF protection via Supabase

### 4. API Security
- ✅ All endpoints check `locals.user?.id`
- ✅ Return 401 if not authenticated
- ✅ RLS provides defense-in-depth

---

## 📝 Implementation Checklist

### Phase 1: Database & Backend (2-3 hours)
- [ ] Run schema migration (`001_add_authentication.sql`)
- [ ] Enable Supabase Auth in dashboard
- [ ] Add `SUPABASE_ANON_KEY` to `.env`
- [ ] Update `src/env.d.ts` with new env vars
- [ ] Create `src/lib/server/supabase/auth.ts`
- [ ] Create `src/lib/supabase.ts` (client-side)
- [ ] Create `src/hooks.server.ts`
- [ ] Update `src/app.d.ts`

### Phase 2: API Endpoints (1-2 hours)
- [ ] Update all `/api/orgs/*` endpoints to use `locals.user?.id`
- [ ] Update `/api/auth/salesforce/*` endpoints
- [ ] Test RLS policies work correctly
- [ ] Verify unauthorized access returns 401

### Phase 3: Authentication UI (2-3 hours)
- [ ] Create login page (`/login`)
- [ ] Create signup page (`/signup`)
- [ ] Create auth components
- [ ] Add logout button to header
- [ ] Test full auth flow

### Phase 4: Testing & Security (1-2 hours)
- [ ] Test user registration
- [ ] Test login/logout
- [ ] Test RLS isolation (create 2 users, verify data separation)
- [ ] Test protected routes redirect to login
- [ ] Test Salesforce OAuth flow with authenticated user
- [ ] Verify tokens are not exposed in API responses

---

## 🚀 Next Steps

1. **Review this plan** and ask questions
2. **Run the migration** in a development environment first
3. **Implement Phase 1** (database & backend)
4. **Test RLS policies** thoroughly
5. **Implement remaining phases** incrementally

Would you like me to proceed with implementing any specific phase?

