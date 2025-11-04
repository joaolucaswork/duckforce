<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { CircleAlert, LoaderCircle } from '@lucide/svelte';
	import Logo from '$lib/components/Logo.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();

		if (!email || !password) {
			error = 'Please enter both email and password';
			return;
		}

		loading = true;
		error = null;

		try {
			const { data: authData, error: signInError } = await data.supabase.auth.signInWithPassword({
				email,
				password
			});

			if (signInError) {
				throw signInError;
			}

			// Only checking if session exists to confirm login success
			// Actual user validation happens server-side via safeGetSession()
			if (authData.session) {
				// Invalidate auth to sync the session with the server
				await invalidate('supabase:auth');
				// Redirect to wizard after successful login
				await goto('/wizard');
			}
		} catch (err: any) {
			console.error('Login error:', err);
			error = err.message || 'Failed to login. Please check your credentials.';
		} finally {
			loading = false;
		}
	}

	async function handleGoogleLogin() {
		loading = true;
		error = null;

		try {
			const { error: signInError } = await data.supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/wizard`
				}
			});

			if (signInError) {
				throw signInError;
			}
		} catch (err: any) {
			console.error('Google login error:', err);
			error = err.message || 'Failed to login with Google.';
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-sm space-y-12">
		<!-- Logo and Title -->
		<div class="text-center space-y-6">
			<div class="flex justify-center">
				<Logo size="lg" />
			</div>
			<div>
				<h2 class="text-3xl font-bold tracking-tight">
					Sign in to DuckForce
				</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Or
					<a href="/signup" class="font-medium text-primary hover:underline">
						create a new account
					</a>
				</p>
			</div>
		</div>

		<!-- Login Card -->
		<Card.Root>
			<Card.Content class="pt-6">
				<form onsubmit={handleLogin} class="space-y-4">
					{#if error}
						<Alert.Root variant="destructive">
							<CircleAlert class="h-4 w-4" />
							<Alert.Description>{error}</Alert.Description>
						</Alert.Root>
					{/if}

					<div class="space-y-2">
						<Label for="email">Email</Label>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
							disabled={loading}
							autocomplete="email"
						/>
					</div>

					<div class="space-y-2">
						<Label for="password">Password</Label>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
							disabled={loading}
							autocomplete="current-password"
						/>
					</div>

					<div class="flex items-center justify-between">
						<a href="/forgot-password" class="text-sm text-muted-foreground hover:text-primary">
							Forgot password?
						</a>
					</div>

					<Button type="submit" class="w-full" disabled={loading}>
						{#if loading}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Signing in...
						{:else}
							Sign in
						{/if}
					</Button>

					<div class="relative">
						<div class="absolute inset-0 flex items-center">
							<span class="w-full border-t"></span>
						</div>
						<div class="relative flex justify-center text-xs uppercase">
							<span class="bg-card px-2 text-muted-foreground">Or continue with</span>
						</div>
					</div>

					<Button
						type="button"
						variant="outline"
						class="w-full"
						onclick={handleGoogleLogin}
						disabled={loading}
					>
						<svg class="mr-2 h-4 w-4" viewBox="0 0 24 24">
							<path
								fill="currentColor"
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								fill="currentColor"
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								fill="currentColor"
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								fill="currentColor"
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Google
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<!-- Footer -->
		<p class="text-center text-sm text-muted-foreground">
			Don't have an account?
			<a href="/signup" class="font-medium text-primary hover:underline">Sign up</a>
		</p>
	</div>
</div>

