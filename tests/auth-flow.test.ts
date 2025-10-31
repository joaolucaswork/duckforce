/**
 * Authentication Flow Tests
 * Tests user signup, login, and authentication middleware
 */

import { test, expect } from '@playwright/test';

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';
const BASE_URL = 'http://localhost:5175';

test.describe('Authentication Flow', () => {
	test.describe.configure({ mode: 'serial' });

	test('should display signup page', async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		await expect(page.locator('h1, h2').filter({ hasText: /sign up|create account/i })).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('should validate password requirements on signup', async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		
		// Fill in email
		await page.fill('input[type="email"]', TEST_EMAIL);
		
		// Try short password
		await page.fill('input[type="password"]', '12345');
		
		// Look for password inputs (there should be 2: password and confirm password)
		const passwordInputs = page.locator('input[type="password"]');
		const count = await passwordInputs.count();
		
		if (count >= 2) {
			await passwordInputs.nth(1).fill('12345');
		}
		
		// Try to submit
		await page.click('button[type="submit"]');
		
		// Should show error about password length
		await expect(page.locator('text=/password.*at least.*6.*characters/i')).toBeVisible({ timeout: 5000 });
	});

	test('should validate password match on signup', async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		
		await page.fill('input[type="email"]', TEST_EMAIL);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill('Password123!');
		await passwordInputs.nth(1).fill('DifferentPassword123!');
		
		await page.click('button[type="submit"]');
		
		// Should show error about passwords not matching
		await expect(page.locator('text=/passwords.*do not match/i')).toBeVisible({ timeout: 5000 });
	});

	test('should successfully sign up a new user', async ({ page }) => {
		await page.goto(`${BASE_URL}/signup`);
		
		await page.fill('input[type="email"]', TEST_EMAIL);
		
		const passwordInputs = page.locator('input[type="password"]');
		await passwordInputs.nth(0).fill(TEST_PASSWORD);
		await passwordInputs.nth(1).fill(TEST_PASSWORD);
		
		await page.click('button[type="submit"]');
		
		// Wait for either redirect to wizard or confirmation message
		await page.waitForURL(/\/(wizard|signup)/, { timeout: 10000 });
		
		const currentUrl = page.url();
		
		// If email confirmation is disabled, should redirect to wizard
		// If enabled, should show success message
		if (currentUrl.includes('/wizard')) {
			console.log('✓ Auto-login successful (email confirmation disabled)');
		} else {
			await expect(page.locator('text=/check.*email|confirmation.*sent/i')).toBeVisible();
			console.log('✓ Signup successful (email confirmation required)');
		}
	});

	test('should display login page', async ({ page }) => {
		await page.goto(`${BASE_URL}/login`);
		await expect(page.locator('h1, h2').filter({ hasText: /sign in|log in/i })).toBeVisible();
		await expect(page.locator('input[type="email"]')).toBeVisible();
		await expect(page.locator('input[type="password"]')).toBeVisible();
	});

	test('should show error for invalid credentials', async ({ page }) => {
		await page.goto(`${BASE_URL}/login`);
		
		await page.fill('input[type="email"]', 'nonexistent@example.com');
		await page.fill('input[type="password"]', 'WrongPassword123!');
		
		await page.click('button[type="submit"]');
		
		// Should show error message
		await expect(page.locator('text=/invalid.*credentials|incorrect.*password|email.*password/i')).toBeVisible({ timeout: 5000 });
	});

	test('should successfully log in with valid credentials', async ({ page }) => {
		// First, ensure we're logged out
		await page.goto(`${BASE_URL}/login`);
		
		await page.fill('input[type="email"]', TEST_EMAIL);
		await page.fill('input[type="password"]', TEST_PASSWORD);
		
		await page.click('button[type="submit"]');
		
		// Should redirect to wizard
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		expect(page.url()).toContain('/wizard');
		console.log('✓ Login successful, redirected to wizard');
	});

	test('should redirect authenticated users away from login page', async ({ page }) => {
		// Login first
		await page.goto(`${BASE_URL}/login`);
		await page.fill('input[type="email"]', TEST_EMAIL);
		await page.fill('input[type="password"]', TEST_PASSWORD);
		await page.click('button[type="submit"]');
		await page.waitForURL(/\/wizard/, { timeout: 10000 });
		
		// Try to access login page again
		await page.goto(`${BASE_URL}/login`);
		
		// Should redirect to wizard
		await page.waitForURL(/\/wizard/, { timeout: 5000 });
		expect(page.url()).toContain('/wizard');
		console.log('✓ Authenticated user redirected away from login page');
	});

	test('should redirect authenticated users away from signup page', async ({ page }) => {
		// Assuming still logged in from previous test
		await page.goto(`${BASE_URL}/signup`);
		
		// Should redirect to wizard
		await page.waitForURL(/\/wizard/, { timeout: 5000 });
		expect(page.url()).toContain('/wizard');
		console.log('✓ Authenticated user redirected away from signup page');
	});
});

