import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_KEY } from '$env/static/private';
import type { Database } from './database.types';

/**
 * Server-side Supabase client with service role key
 * Use this for server-side operations that bypass RLS
 * 
 * IMPORTANT: This client has full access to the database.
 * Only use it in server-side code, never expose it to the client.
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

