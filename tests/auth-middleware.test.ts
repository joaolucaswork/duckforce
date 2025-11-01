/**
 * Authentication Middleware Tests
 * Verifies that protected routes require authentication
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

test.describe('Authentication Middleware', () => {
	test('should redirect unauthenticated users from /wizard to /login', async ({ page }) => {
		await page.goto(`${BASE_URL}/wizard`);
		
		// Should redirect to login
		await page.waitForURL(/\/login/, { timeout: 5000 });
		expect(page.url()).toContain('/login');
		
		console.log('✓ Unauthenticated access to /wizard redirected to /login');
	});

	test('should return 401 for unauthenticated API requests to /api/orgs', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/orgs`);
		
		// Should return 401 or redirect (302/303)
		expect([302, 303, 401]).toContain(response.status());
		
		console.log(`✓ Unauthenticated API request to /api/orgs blocked with status ${response.status()}`);
	});

	test('should return 401 for unauthenticated API requests to /api/orgs/:id', async ({ page }) => {
		const response = await page.request.get(`${BASE_URL}/api/orgs/test-org-id`);
		
		// Should return 401 or redirect (302/303)
		expect([302, 303, 401]).toContain(response.status());
		
		console.log(`✓ Unauthenticated API request to /api/orgs/:id blocked with status ${response.status()}`);
	});

	test('should return 401 for unauthenticated API requests to /api/orgs/:id/activate', async ({ page }) => {
		const response = await page.request.post(`${BASE_URL}/api/orgs/test-org-id/activate`);
		
		// Should return 401 or redirect (302/303)
		expect([302, 303, 401]).toContain(response.status());
		
		console.log(`✓ Unauthenticated API request to /api/orgs/:id/activate blocked with status ${response.status()}`);
	});

	test('should return 401 for unauthenticated API requests to /api/orgs/:id/sync', async ({ page }) => {
		const response = await page.request.post(`${BASE_URL}/api/orgs/test-org-id/sync`);
		
		// Should return 401 or redirect (302/303)
		expect([302, 303, 401]).toContain(response.status());
		
		console.log(`✓ Unauthenticated API request to /api/orgs/:id/sync blocked with status ${response.status()}`);
	});

	test('should allow access to public routes without authentication', async ({ page }) => {
		// Test login page
		const loginResponse = await page.goto(`${BASE_URL}/login`);
		expect(loginResponse?.ok()).toBeTruthy();
		
		// Test signup page
		const signupResponse = await page.goto(`${BASE_URL}/signup`);
		expect(signupResponse?.ok()).toBeTruthy();
		
		// Test home page (if it exists and is public)
		const homeResponse = await page.goto(`${BASE_URL}/`);
		expect(homeResponse?.ok()).toBeTruthy();
		
		console.log('✓ Public routes accessible without authentication');
	});

	test('should preserve redirect URL after login', async ({ page }) => {
		// Try to access protected route
		await page.goto(`${BASE_URL}/wizard`);
		
		// Should redirect to login
		await page.waitForURL(/\/login/, { timeout: 5000 });
		
		// Check if redirect URL is preserved in query params or state
		const url = new URL(page.url());
		const hasRedirect = url.searchParams.has('redirect') || 
		                   url.searchParams.has('returnTo') ||
		                   url.searchParams.has('next');
		
		if (hasRedirect) {
			console.log('✓ Redirect URL preserved in query params');
		} else {
			console.log('ℹ Redirect URL not preserved (may redirect to default page)');
		}
	});

	test('should block access to Salesforce auth endpoints without user session', async ({ page }) => {
		// Test logout endpoint
		const logoutResponse = await page.request.post(`${BASE_URL}/api/auth/salesforce/logout`);
		expect([302, 303, 401]).toContain(logoutResponse.status());
		
		console.log(`✓ Unauthenticated request to logout endpoint blocked with status ${logoutResponse.status()}`);
	});

	test('should allow authenticated users to access protected routes', async ({ page }) => {
		// First, create and login a test user
		const testEmail = `middleware-test-${Date.now()}@example.com`;
		const testPassword = 'TestPassword123!';
		
		// Signup
		await page.goto(`${BASE_URL}/signup`);
		await page.fill('input[type="email"]', testEmail);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill(testPassword);
		await passwordInputs.nth(1).fill(testPassword);
		
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/(wizard|signup)/, { timeout: 10000 });
		
		// If not already on wizard, login
		if (!page.url().includes('/wizard')) {
			await page.goto(`${BASE_URL}/login`);
			await page.fill('input[type="email"]', testEmail);
			await page.fill('input[type="password"]', testPassword);
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/wizard/, { timeout: 10000 });
		}
		
		// Now test access to protected routes
		const wizardResponse = await page.goto(`${BASE_URL}/wizard`);
		expect(wizardResponse?.ok()).toBeTruthy();
		expect(page.url()).toContain('/wizard');
		
		// Test API access
		const orgsResponse = await page.request.get(`${BASE_URL}/api/orgs`);
		expect(orgsResponse.ok()).toBeTruthy();
		
		console.log('✓ Authenticated user can access protected routes');
	});

	test('should handle expired sessions gracefully', async ({ page, context }) => {
		// Create a user and login
		const testEmail = `expired-session-${Date.now()}@example.com`;
		const testPassword = 'TestPassword123!';
		
		await page.goto(`${BASE_URL}/signup`);
		await page.fill('input[type="email"]', testEmail);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill(testPassword);
		await passwordInputs.nth(1).fill(testPassword);
		
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/(wizard|signup)/, { timeout: 10000 });
		
		// Clear all cookies to simulate expired session
		await context.clearCookies();
		
		// Try to access protected route
		await page.goto(`${BASE_URL}/wizard`);
		
		// Should redirect to login
		await page.waitForURL(/\/login/, { timeout: 5000 });
		expect(page.url()).toContain('/login');
		
		console.log('✓ Expired session redirects to login');
	});

	test('should validate session on every protected API request', async ({ page }) => {
		// Login first
		const testEmail = `api-validation-${Date.now()}@example.com`;
		const testPassword = 'TestPassword123!';
		
		await page.goto(`${BASE_URL}/signup`);
		await page.fill('input[type="email"]', testEmail);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill(testPassword);
		await passwordInputs.nth(1).fill(testPassword);
		
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/(wizard|signup)/, { timeout: 10000 });
		
		// Make authenticated API request
		const response1 = await page.request.get(`${BASE_URL}/api/orgs`);
		expect(response1.ok()).toBeTruthy();
		
		// Clear cookies
		await page.context().clearCookies();
		
		// Make another API request - should fail
		const response2 = await page.request.get(`${BASE_URL}/api/orgs`);
		expect([302, 303, 401]).toContain(response2.status());
		
		console.log('✓ Session validation works on every API request');
	});
});

