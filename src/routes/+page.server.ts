import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * Handle redirects for authenticated users
 * Email confirmation is handled client-side by Supabase
 */
export const load: PageServerLoad = async ({ url, locals }) => {
	// Check for error from Supabase
	const error = url.searchParams.get('error');
	const errorDescription = url.searchParams.get('error_description');

	// Handle error from Supabase
	if (error) {
		console.error('Auth error:', error, errorDescription);
		throw redirect(303, `/login?error=${encodeURIComponent(errorDescription || error)}`);
	}

	// If user is already logged in, redirect to wizard
	if (locals.user) {
		throw redirect(303, '/wizard');
	}

	// Otherwise, show the landing page
	// Email confirmation code will be handled client-side by Supabase
	return {};
};

