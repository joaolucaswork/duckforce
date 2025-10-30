<script lang="ts">
	import '../app.css';
	import Logo from '$lib/components/Logo.svelte';
	import { page } from '$app/stores';

	// Pages that should hide the global header (they have their own)
	const pagesWithCustomHeader = ['/', '/wizard'];

	$: showGlobalHeader = !pagesWithCustomHeader.includes($page.url.pathname);
</script>

{#if showGlobalHeader}
	<header class="border-b bg-background sticky top-0 z-50">
		<div class="container mx-auto px-6 py-4">
			<a href="/" class="inline-block">
				<Logo size="md" />
			</a>
		</div>
	</header>
{/if}

<slot />

