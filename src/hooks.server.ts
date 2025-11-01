import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createServerSupabaseClient } from '$lib/server/supabase/auth';

/**
 * Supabase client setup hook
 * Creates a Supabase client for each request and validates the session
 */
const supabaseHandle: Handle = async ({ event, resolve }) => {
	// Create Supabase client for this request
	event.locals.supabase = createServerSupabaseClient(event.cookies);

	/**
	 * Unlike supabase.auth.getSession(), which returns the session without
	 * validating the JWT, this function also calls getUser() to validate the
	 * JWT before returning the session.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			// JWT validation has failed
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			// Supabase needs these headers
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

/**
 * Authentication guard hook
 * Protects routes and redirects based on auth state
 */
const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

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

export const handle: Handle = sequence(supabaseHandle, authGuard);

