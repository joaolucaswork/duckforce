import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from '$lib/server/supabase/database.types';

/**
 * Client-side Supabase client for authentication
 * This client is used in the browser for auth operations
 */
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
	auth: {
		flowType: 'pkce',
		autoRefreshToken: true,
		detectSessionInUrl: true,
		persistSession: true,
		storage: typeof window !== 'undefined' ? window.localStorage : undefined
	}
});

