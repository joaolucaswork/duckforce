import { createServerClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '$env/static/private';
import type { Database } from './database.types';
import type { Cookies } from '@sveltejs/kit';

/**
 * Create a Supabase client for server-side auth operations
 * This client respects RLS policies and uses the user's session
 *
 * Uses @supabase/ssr to properly manage auth cookies
 *
 * @param cookies - SvelteKit cookies object
 * @returns Supabase client configured for server-side auth
 */
export function createServerSupabaseClient(cookies: Cookies) {
	return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});
}

