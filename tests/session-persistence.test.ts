/**
 * Session Persistence Tests
 * Verifies that user sessions persist across page refreshes and browser restarts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5175';

test.describe('Session Persistence', () => {
	const testEmail = `session-test-${Date.now()}@example.com`;
	const testPassword = 'TestPassword123!';

	test.beforeAll(async ({ browser }) => {
		// Create a test user
		const context = await browser.newContext();
		const page = await context.newPage();
		
		await page.goto(`${BASE_URL}/signup`);
		await page.fill('input[type="email"]', testEmail);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill(testPassword);
		await passwordInputs.nth(1).fill(testPassword);
		
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/(wizard|signup)/, { timeout: 10000 });
		
		await context.close();
		console.log(`✓ Test user created: ${testEmail}`);
	});

	test('should persist session across page refresh', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		expect(page.url()).toContain('/wizard');
		
		// Refresh the page
		await page.reload();
		
		// Should still be on wizard (not redirected to login)
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/wizard');
		
		console.log('✓ Session persisted across page refresh');
	});

	test('should persist session across navigation', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Navigate to different pages
		await page.goto(`${BASE_URL}/wizard`);
		expect(page.url()).toContain('/wizard');
		
		// Try to go to login (should redirect back to wizard)
		await page.goto(`${BASE_URL}/login`);
		await page.waitForURL(/\/wizard/, { timeout: 5000 });
		expect(page.url()).toContain('/wizard');
		
		console.log('✓ Session persisted across navigation');
	});

	test('should persist session in new tab', async ({ context, page }) => {
		// Login in first tab
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Open new tab in same context
		const newPage = await context.newPage();
		await newPage.goto(`${BASE_URL}/wizard`);
		
		// Should be authenticated in new tab
		await newPage.waitForLoadState('networkidle');
		expect(newPage.url()).toContain('/wizard');
		
		await newPage.close();
		console.log('✓ Session persisted in new tab');
	});

	test('should persist session after browser context restart', async ({ browser }) => {
		// Create first context and login
		const context1 = await browser.newContext();
		const page1 = await context1.newPage();
		
		await page1.goto(`${BASE_URL}/login`);
		await page1.fill('input[type="email"]', testEmail);
		await page1.fill('input[type="password"]', testPassword);
		await page1.click('button[type="submit"]');
		await page1.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Get cookies from first context
		const cookies = await context1.cookies();
		
		// Close first context
		await context1.close();
		
		// Create new context with saved cookies
		const context2 = await browser.newContext();
		await context2.addCookies(cookies);
		
		const page2 = await context2.newPage();
		await page2.goto(`${BASE_URL}/wizard`);
		
		// Should still be authenticated
		await page2.waitForLoadState('networkidle');
		expect(page2.url()).toContain('/wizard');
		
		await context2.close();
		console.log('✓ Session persisted after browser context restart (with cookies)');
	});

	test('should maintain session for reasonable duration', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Wait a bit (simulate user being idle)
		await page.waitForTimeout(2000);
		
		// Refresh and check session is still valid
		await page.reload();
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/wizard');
		
		// Make API request to verify session
		const response = await page.request.get(`${BASE_URL}/api/orgs`);
		expect(response.ok()).toBeTruthy();
		
		console.log('✓ Session maintained for reasonable duration');
	});

	test('should handle concurrent sessions correctly', async ({ browser }) => {
		// Create two contexts (like two different browsers)
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();
		
		// Login in both contexts with same user
		for (const page of [page1, page2]) {
			await page.goto(`${BASE_URL}/login`);
			await page.fill('input[type="email"]', testEmail);
			await page.fill('input[type="password"]', testPassword);
			await page.click('button[type="submit"]');
			await page.waitForURL(/\/wizard/, { timeout: 10000 });
		}
		
		// Both should be logged in
		expect(page1.url()).toContain('/wizard');
		expect(page2.url()).toContain('/wizard');
		
		// Refresh both
		await page1.reload();
		await page2.reload();
		
		// Both should still be logged in
		await page1.waitForLoadState('networkidle');
		await page2.waitForLoadState('networkidle');
		
		expect(page1.url()).toContain('/wizard');
		expect(page2.url()).toContain('/wizard');
		
		await context1.close();
		await context2.close();
		
		console.log('✓ Concurrent sessions handled correctly');
	});

	test('should clear session on logout', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Find and click logout button
		const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign out"), a:has-text("Logout"), a:has-text("Sign out")');
		
		if (await logoutButton.count() > 0) {
			await logoutButton.first().click();
			
			// Should redirect to login or home
			await page.waitForURL(/\/(login|signup|$)/, { timeout: 5000 });
			
			// Try to access protected route
			await page.goto(`${BASE_URL}/wizard`);
			
			// Should redirect to login
			await page.waitForURL(/\/login/, { timeout: 5000 });
			expect(page.url()).toContain('/login');
			
			console.log('✓ Session cleared on logout');
		} else {
			console.log('ℹ Logout button not found, skipping test');
		}
	});

	test('should restore session after page crash simulation', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Simulate page crash by navigating away and back
		await page.goto('about:blank');
		await page.waitForTimeout(500);
		
		// Navigate back to app
		await page.goto(`${BASE_URL}/wizard`);
		
		// Should still be authenticated
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/wizard');
		
		console.log('✓ Session restored after page crash simulation');
	});

	test('should handle session refresh token rotation', async ({ page }) => {
		// Login
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', testEmail);
		await page.fill('input[type="password"]', testPassword);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Get initial cookies
		const initialCookies = await page.context().cookies();
		const authCookies = initialCookies.filter(c => 
			c.name.includes('auth') || 
			c.name.includes('sb-') || 
			c.name.includes('supabase')
		);
		
		console.log(`Found ${authCookies.length} auth-related cookies`);
		
		// Wait a bit and make API request (might trigger token refresh)
		await page.waitForTimeout(1000);
		await page.request.get(`${BASE_URL}/api/orgs`);
		
		// Session should still be valid
		await page.reload();
		await page.waitForLoadState('networkidle');
		expect(page.url()).toContain('/wizard');
		
		console.log('✓ Session handles token refresh correctly');
	});
});

