<script lang="ts">
	import '../app.css';
	import Logo from '$lib/components/Logo.svelte';
	import { page } from '$app/stores';
	import { goto, invalidate } from '$app/navigation';
	import type { LayoutData } from './$types';
	import { onMount } from 'svelte';

	export let data: LayoutData;

	// Pages that should hide the global header (they have their own)
	const pagesWithCustomHeader = ['/', '/wizard', '/login', '/signup'];
	// Public pages that don't require authentication
	const publicPages = ['/login', '/signup'];

	$: showGlobalHeader = !pagesWithCustomHeader.includes($page.url.pathname);
	$: isPublicPage = publicPages.includes($page.url.pathname);
	$: ({ supabase, session, user } = data);

	// Handle client-side redirects only
	onMount(() => {
		// Redirect to login if not authenticated and not on a public page
		if (!user && !isPublicPage) {
			goto('/login');
		}

		// Safe to use onAuthStateChange on client-side
		// The session is validated server-side via safeGetSession() in hooks.server.ts
		// We only use newSession.expires_at for comparison, not for authentication
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((_event, newSession) => {
			// Only comparing expires_at timestamp - not using user object from session
			if (newSession?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});

	async function handleLogout() {
		const { error } = await supabase.auth.signOut();
		if (!error) {
			goto('/login');
		}
	}
</script>

{#if showGlobalHeader}
	<header class="border-b bg-background sticky top-0 z-50">
		<div class="container mx-auto px-6 py-4 flex justify-between items-center">
			<a href="/" class="inline-block">
				<Logo size="md" />
			</a>
			{#if user}
				<div class="flex items-center gap-4">
					<span class="text-sm text-gray-600">{user.email}</span>
					<button
						on:click={handleLogout}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Logout
					</button>
				</div>
			{/if}
		</div>
	</header>
{/if}

<slot />

