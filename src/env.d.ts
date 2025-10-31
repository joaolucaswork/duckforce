// Type definitions for SvelteKit environment variables
// This file augments the $env/static/private module to provide strict type checking
// for environment variables at compile time.

declare module '$env/static/private' {
	export const SALESFORCE_CLIENT_ID: string;
	// Client Secret is optional when using PKCE
	export const SALESFORCE_CLIENT_SECRET: string | undefined;
	export const SALESFORCE_CALLBACK_URL: string;
	export const SALESFORCE_LOGIN_URL: string;

	// Supabase configuration (server-side only)
	export const SUPABASE_URL: string;
	export const SUPABASE_SERVICE_KEY: string;
}

declare module '$env/static/public' {
	// Public Supabase configuration (client-side)
	export const PUBLIC_SUPABASE_URL: string;
	export const PUBLIC_SUPABASE_ANON_KEY: string;
}

