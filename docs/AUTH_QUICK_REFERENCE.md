# Authentication Quick Reference Guide

## 🚀 Quick Start (30 minutes)

### Step 1: Enable Supabase Auth (5 min)
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **DuckForce - Salesforce Migration**
3. Navigate to **Authentication** → **Providers**
4. Enable **Email** provider
5. (Optional) Enable **Google** provider for OAuth

### Step 2: Get Your Anon Key (2 min)
1. Go to **Settings** → **API**
2. Copy the **anon** **public** key
3. Add to `.env`:
```bash
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Run Database Migration (5 min)
1. Open Supabase Dashboard → **SQL Editor**
2. Copy contents of `database/migrations/001_add_authentication.sql`
3. Paste and click **Run**
4. Verify tables were recreated successfully

### Step 4: Update Environment Variables (3 min)
Add to `.env`:
```bash
# Existing
SUPABASE_URL=https://ucoererotujfwjhhoxec.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...

# NEW - Add these
SUPABASE_ANON_KEY=eyJhbGci...
PUBLIC_SUPABASE_URL=https://ucoererotujfwjhhoxec.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

### Step 5: Install Dependencies (2 min)
```bash
pnpm install
# All dependencies already installed, just verify
```

### Step 6: Create Required Files (10 min)
See detailed code in `docs/AUTH_IMPLEMENTATION_PLAN.md`, but here's the checklist:

- [ ] `src/hooks.server.ts` - Authentication middleware
- [ ] `src/lib/server/supabase/auth.ts` - Server auth utilities
- [ ] `src/lib/supabase.ts` - Client-side Supabase client
- [ ] `src/routes/+layout.server.ts` - Session loader
- [ ] `src/routes/login/+page.svelte` - Login page
- [ ] `src/routes/signup/+page.svelte` - Signup page
- [ ] Update `src/app.d.ts` - Add Locals interface
- [ ] Update `src/env.d.ts` - Add new env vars

### Step 7: Update API Endpoints (5 min)
Replace in ALL files in `src/routes/api/`:
```typescript
// OLD
const userId = (locals as any).user?.id || 'demo-user';

// NEW
const userId = locals.user?.id;
if (!userId) {
  throw error(401, 'Unauthorized');
}
```

### Step 8: Test (3 min)
```bash
pnpm dev
# Visit http://localhost:5173/signup
# Create an account
# Login
# Connect a Salesforce org
```

---

## 📝 Code Snippets

### hooks.server.ts (Complete)
```typescript
import { createServerSupabaseClient } from '$lib/server/supabase/auth';
import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const supabase = createServerSupabaseClient(event.cookies);
  const { data: { session } } = await supabase.auth.getSession();
  
  event.locals.supabase = supabase;
  event.locals.session = session;
  event.locals.user = session?.user ?? null;
  
  // Protected routes
  const protectedRoutes = ['/wizard', '/api/orgs'];
  const isProtected = protectedRoutes.some(r => event.url.pathname.startsWith(r));
  
  if (isProtected && !session) {
    throw redirect(303, '/login');
  }
  
  // Auth routes (redirect if already logged in)
  const authRoutes = ['/login', '/signup'];
  if (authRoutes.includes(event.url.pathname) && session) {
    throw redirect(303, '/wizard');
  }
  
  return resolve(event);
};
```

### src/lib/server/supabase/auth.ts (Complete)
```typescript
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Database } from './database.types';
import type { Cookies } from '@sveltejs/kit';

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
```

### src/lib/supabase.ts (Complete)
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

### src/app.d.ts (Update)
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

### src/env.d.ts (Update)
```typescript
declare module '$env/static/private' {
  export const SALESFORCE_CLIENT_ID: string;
  export const SALESFORCE_CLIENT_SECRET: string | undefined;
  export const SALESFORCE_CALLBACK_URL: string;
  export const SALESFORCE_LOGIN_URL: string;
  export const SUPABASE_URL: string;
  export const SUPABASE_SERVICE_KEY: string;
  export const SUPABASE_ANON_KEY: string; // NEW
}

declare module '$env/static/public' {
  export const PUBLIC_SUPABASE_URL: string; // NEW
  export const PUBLIC_SUPABASE_ANON_KEY: string; // NEW
}
```

### src/routes/+layout.server.ts (Create)
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

## 🔍 Testing Checklist

### Manual Testing
- [ ] Visit `/signup` - should show signup form
- [ ] Create account with email/password
- [ ] Check email for confirmation (if enabled)
- [ ] Visit `/login` - should show login form
- [ ] Login with credentials
- [ ] Should redirect to `/wizard`
- [ ] Visit `/wizard` without login - should redirect to `/login`
- [ ] Connect a Salesforce org
- [ ] Logout
- [ ] Login again - should see cached org

### Multi-User Testing
- [ ] Create User A account
- [ ] User A connects Org 1
- [ ] Logout
- [ ] Create User B account
- [ ] User B connects Org 2
- [ ] User B should NOT see Org 1
- [ ] Logout
- [ ] Login as User A
- [ ] User A should NOT see Org 2
- [ ] User A should only see Org 1

### RLS Testing
```sql
-- Run in Supabase SQL Editor
-- Should return only current user's orgs
SELECT * FROM organizations;

-- Should return 0 rows (can't see other users' data)
SELECT * FROM organizations WHERE user_id != auth.uid();
```

---

## 🐛 Troubleshooting

### "Invalid API key" error
- Check that `SUPABASE_ANON_KEY` is set correctly
- Verify you're using the **anon** key, not the service role key

### "Unauthorized" on all API calls
- Check that `hooks.server.ts` is created and working
- Verify session is being set in `locals`
- Check browser cookies for Supabase session

### RLS policies not working
- Verify migration ran successfully
- Check that you're using `createServerSupabaseClient` (anon key)
- Don't use `supabaseAdmin` for user operations

### Can't login after signup
- Check if email confirmation is enabled
- If enabled, check spam folder for confirmation email
- Or disable email confirmation in Supabase Dashboard

### Session not persisting
- Check that `persistSession: true` in client-side Supabase client
- Verify cookies are being set (check browser DevTools)
- Check that `flowType: 'pkce'` is set

---

## 📚 Key Concepts

### Service Role vs Anon Key
```typescript
// ❌ WRONG - Bypasses RLS
import { supabaseAdmin } from '$lib/server/supabase/client';
const orgs = await supabaseAdmin.from('organizations').select('*');

// ✅ CORRECT - Respects RLS
const supabase = createServerSupabaseClient(cookies);
const orgs = await supabase.from('organizations').select('*');
```

### RLS Policy Syntax
```sql
-- ❌ WRONG - PostgreSQL syntax
CREATE POLICY "policy_name" ON table_name
  USING (user_id = current_user);

-- ✅ CORRECT - Supabase Auth syntax
CREATE POLICY "policy_name" ON table_name
  USING (user_id = auth.uid());
```

### User ID Type
```sql
-- ❌ WRONG - Plain text
user_id TEXT NOT NULL

-- ✅ CORRECT - References auth.users
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

---

## 🎯 Success Criteria

You'll know it's working when:
1. ✅ Can signup and login
2. ✅ Protected routes redirect to login
3. ✅ Each user only sees their own orgs
4. ✅ RLS policies enforce data isolation
5. ✅ Session persists across page refreshes
6. ✅ Logout clears session

---

## 📞 Need Help?

Refer to:
- `docs/AUTH_IMPLEMENTATION_PLAN.md` - Detailed implementation guide
- `docs/AUTH_IMPLEMENTATION_SUMMARY.md` - Overview and analysis
- `database/migrations/001_add_authentication.sql` - Database migration
- `src/lib/components/auth/` - UI component examples

