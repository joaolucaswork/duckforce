import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import type { Database } from './database.types';
import type { Cookies } from '@sveltejs/kit';

/**
 * Create a Supabase client for server-side auth operations
 * This client respects RLS policies and uses the user's session
 * 
 * @param cookies - SvelteKit cookies object
 * @returns Supabase client configured for server-side auth
 */
export function createServerSupabaseClient(cookies: Cookies) {
	// Get all cookies and format them for the request
	const cookieString = cookies
		.getAll()
		.map((c) => `${c.name}=${c.value}`)
		.join('; ');

	return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
		auth: {
			flowType: 'pkce',
			autoRefreshToken: false,
			detectSessionInUrl: false,
			persistSession: false
		},
		global: {
			headers: {
				cookie: cookieString
			}
		}
	});
}

/**
 * Get the authenticated user from the session
 * 
 * @param cookies - SvelteKit cookies object
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthenticatedUser(cookies: Cookies) {
	const supabase = createServerSupabaseClient(cookies);
	const {
		data: { user },
		error
	} = await supabase.auth.getUser();

	if (error || !user) {
		return null;
	}

	return user;
}

