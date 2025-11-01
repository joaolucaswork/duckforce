<script lang="ts">
	import { supabase } from '$lib/supabase';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription } from '$lib/components/ui/alert';
	import { AlertCircle, Loader2, CheckCircle2 } from '@lucide/svelte';

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let success = $state(false);

	async function handleSignup(e: Event) {
		e.preventDefault();
		isLoading = true;
		error = null;
		success = false;

		// Validate passwords match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			isLoading = false;
			return;
		}

		// Validate password strength
		if (password.length < 8) {
			error = 'Password must be at least 8 characters long';
			isLoading = false;
			return;
		}

		try {
			const { data, error: signUpError } = await supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: `${window.location.origin}/wizard`
				}
			});

			if (signUpError) {
				throw signUpError;
			}

			if (data.user) {
				// Check if email confirmation is required
				if (data.user.identities && data.user.identities.length === 0) {
					error = 'An account with this email already exists.';
				} else if (data.session) {
					// Auto-login if email confirmation is disabled
					await goto('/wizard');
				} else {
					// Email confirmation required
					success = true;
				}
			}
		} catch (err: any) {
			console.error('Signup error:', err);
			error = err.message || 'Failed to create account. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function handleGoogleSignup() {
		isLoading = true;
		error = null;

		try {
			const { error: signInError } = await supabase.auth.signInWithOAuth({
				provider: 'google',
				options: {
					redirectTo: `${window.location.origin}/wizard`
				}
			});

			if (signInError) {
				throw signInError;
			}
		} catch (err: any) {
			console.error('Google signup error:', err);
			error = err.message || 'Failed to sign up with Google.';
			isLoading = false;
		}
	}
</script>

<form onsubmit={handleSignup} class="space-y-4">
	{#if error}
		<Alert variant="destructive">
			<AlertCircle class="h-4 w-4" />
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if success}
		<Alert>
			<CheckCircle2 class="h-4 w-4" />
			<AlertDescription>
				Account created successfully! Please check your email to confirm your account.
			</AlertDescription>
		</Alert>
	{/if}

	<div class="space-y-2">
		<Label for="email">Email</Label>
		<Input
			id="email"
			type="email"
			placeholder="you@example.com"
			bind:value={email}
			required
			disabled={isLoading || success}
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
			disabled={isLoading || success}
		/>
		<p class="text-xs text-muted-foreground">Must be at least 8 characters long</p>
	</div>

	<div class="space-y-2">
		<Label for="confirm-password">Confirm Password</Label>
		<Input
			id="confirm-password"
			type="password"
			placeholder="••••••••"
			bind:value={confirmPassword}
			required
			disabled={isLoading || success}
		/>
	</div>

	<Button type="submit" class="w-full" disabled={isLoading || success}>
		{#if isLoading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			Creating account...
		{:else}
			Create account
		{/if}
	</Button>

	{#if !success}
		<div class="relative">
			<div class="absolute inset-0 flex items-center">
				<span class="w-full border-t" />
			</div>
			<div class="relative flex justify-center text-xs uppercase">
				<span class="bg-background px-2 text-muted-foreground">Or continue with</span>
			</div>
		</div>

		<Button
			type="button"
			variant="outline"
			class="w-full"
			onclick={handleGoogleSignup}
			disabled={isLoading}
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
	{/if}

	<p class="text-center text-sm text-muted-foreground">
		Already have an account?
		<a href="/login" class="font-medium text-primary hover:underline">Sign in</a>
	</p>

	<p class="text-center text-xs text-muted-foreground">
		By creating an account, you agree to our
		<a href="/terms" class="underline hover:text-primary">Terms of Service</a>
		and
		<a href="/privacy" class="underline hover:text-primary">Privacy Policy</a>
	</p>
</form>

