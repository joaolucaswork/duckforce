import { redirect, type Handle } from '@sveltejs/kit';
import { createServerSupabaseClient } from '$lib/server/supabase/auth';

/**
 * SvelteKit server hooks for authentication
 * This runs on every request to:
 * 1. Create a Supabase client with the user's session
 * 2. Protect routes that require authentication
 * 3. Redirect authenticated users away from auth pages
 */
export const handle: Handle = async ({ event, resolve }) => {
	// Create Supabase client for this request
	const supabase = createServerSupabaseClient(event.cookies);

	// Get the current session
	const {
		data: { session }
	} = await supabase.auth.getSession();

	// Attach Supabase client and session to event.locals
	event.locals.supabase = supabase;
	event.locals.session = session;
	event.locals.user = session?.user ?? null;

	// Protected routes - require authentication
	const protectedRoutes = ['/wizard', '/api/orgs'];
	const isProtected = protectedRoutes.some((route) => event.url.pathname.startsWith(route));

	if (isProtected && !session) {
		throw redirect(303, '/login');
	}

	// Auth routes - redirect if already logged in
	const authRoutes = ['/login', '/signup'];
	if (authRoutes.includes(event.url.pathname) && session) {
		throw redirect(303, '/wizard');
	}

	return resolve(event);
};

