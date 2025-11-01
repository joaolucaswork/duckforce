<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import * as Card from '$lib/components/ui/card';
	import { AlertCircle, Loader2, Mail } from '@lucide/svelte';
	import Logo from '$lib/components/Logo.svelte';
	import OTPInput from '$lib/components/auth/OTPInput.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);
	let showOTPScreen = $state(false);
	let otpInputRef = $state<any>(null);
	let resendCooldown = $state(0);
	let resendInterval: any;

	async function handleSignup(e: Event) {
		e.preventDefault();

		if (!email || !password || !confirmPassword) {
			error = 'Please fill in all fields';
			return;
		}

		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			return;
		}

		if (password.length < 6) {
			error = 'Password must be at least 6 characters long';
			return;
		}

		loading = true;
		error = null;

		try {
			// Sign up with email OTP
			const { data: authData, error: signUpError } = await data.supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: undefined, // Disable email link
					data: {
						email_confirm_otp: true // Request OTP instead of link
					}
				}
			});

			if (signUpError) {
				throw signUpError;
			}

			if (data.user) {
				// Check if email already exists
				if (data.user.identities && data.user.identities.length === 0) {
					error = 'This email is already registered. Please sign in instead.';
					loading = false;
					return;
				}

				// Show OTP verification screen
				showOTPScreen = true;
				startResendCooldown();
			}
		} catch (err: any) {
			console.error('Signup error:', err);
			error = err.message || 'An error occurred during signup';
		} finally {
			loading = false;
		}
	}

	async function handleVerifyOTP(code: string) {
		loading = true;
		error = null;

		try {
			const { data: verifyData, error: verifyError } = await data.supabase.auth.verifyOtp({
				email,
				token: code,
				type: 'signup'
			});

			if (verifyError) {
				throw verifyError;
			}

			if (verifyData.session) {
				// Successfully verified, redirect to wizard
				await goto('/wizard');
			}
		} catch (err: any) {
			console.error('OTP verification error:', err);
			error = err.message || 'Invalid verification code. Please try again.';
			otpInputRef?.clear();
		} finally {
			loading = false;
		}
	}

	async function handleResendCode() {
		if (resendCooldown > 0) return;

		loading = true;
		error = null;

		try {
			const { error: resendError } = await data.supabase.auth.signUp({
				email,
				password,
				options: {
					emailRedirectTo: undefined,
					data: {
						email_confirm_otp: true
					}
				}
			});

			if (resendError) {
				throw resendError;
			}

			startResendCooldown();
		} catch (err: any) {
			console.error('Resend error:', err);
			error = err.message || 'Failed to resend code. Please try again.';
		} finally {
			loading = false;
		}
	}

	function startResendCooldown() {
		resendCooldown = 60; // 60 seconds cooldown
		if (resendInterval) clearInterval(resendInterval);

		resendInterval = setInterval(() => {
			resendCooldown--;
			if (resendCooldown <= 0) {
				clearInterval(resendInterval);
			}
		}, 1000);
	}

	async function handleGoogleSignup() {
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
			console.error('Google signup error:', err);
			error = err.message || 'Failed to sign up with Google.';
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
					Create your account
				</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Or
					<a href="/login" class="font-medium text-primary hover:underline">
						sign in to your existing account
					</a>
				</p>
			</div>
		</div>

		<!-- Signup Card -->
		<Card.Root>
			<Card.Content class="pt-6">
				{#if showOTPScreen}
					<!-- OTP Verification Screen -->
					<div class="space-y-6">
						<div class="text-center space-y-2">
							<div class="mx-auto w-16 h-16 bg-gradient-to-br from-orange-400 via-pink-500 to-purple-500 rounded-full flex items-center justify-center mb-4">
								<Mail class="w-8 h-8 text-white" />
							</div>
							<h3 class="text-xl font-semibold">Verificação de Email</h3>
							<p class="text-sm text-muted-foreground">
								Insira o código de verificação de 6 dígitos enviado para
							</p>
							<p class="text-sm font-medium">{email}</p>
						</div>

						{#if error}
							<Alert.Root variant="destructive">
								<AlertCircle class="h-4 w-4" />
								<Alert.Description>{error}</Alert.Description>
							</Alert.Root>
						{/if}

						<div class="space-y-4">
							<OTPInput
								bind:this={otpInputRef}
								length={6}
								onComplete={handleVerifyOTP}
								disabled={loading}
							/>

							<div class="text-center space-y-2">
								<button
									type="button"
									onclick={handleResendCode}
									disabled={resendCooldown > 0 || loading}
									class="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
								>
									{#if resendCooldown > 0}
										Reenviar código em {resendCooldown}s
									{:else}
										Reenviar código
									{/if}
								</button>

								<button
									type="button"
									onclick={() => {
										showOTPScreen = false;
										error = null;
									}}
									class="block w-full text-sm text-muted-foreground hover:text-primary"
								>
									Usar um email diferente
								</button>
							</div>
						</div>
					</div>
				{:else}
					<form onsubmit={handleSignup} class="space-y-4">
						{#if error}
							<Alert.Root variant="destructive">
								<AlertCircle class="h-4 w-4" />
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
								autocomplete="new-password"
							/>
							<p class="text-xs text-muted-foreground">Must be at least 6 characters</p>
						</div>

						<div class="space-y-2">
							<Label for="confirm-password">Confirm Password</Label>
							<Input
								id="confirm-password"
								type="password"
								placeholder="••••••••"
								bind:value={confirmPassword}
								required
								disabled={loading}
								autocomplete="new-password"
							/>
						</div>

						<Button type="submit" class="w-full" disabled={loading}>
							{#if loading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								Creating account...
							{:else}
								Create account
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
							onclick={handleGoogleSignup}
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
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Footer -->
		<p class="text-center text-sm text-muted-foreground">
			Already have an account?
			<a href="/login" class="font-medium text-primary hover:underline">Sign in</a>
		</p>
	</div>
</div>

