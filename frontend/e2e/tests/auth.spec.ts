/**
 * Authentication E2E tests for Moti-Do.
 * Tests login, registration, and protected route functionality.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page correctly', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Verify page elements
      await expect(loginPage.heading).toBeVisible();
      await expect(loginPage.loginTab).toBeVisible();
      await expect(loginPage.registerTab).toBeVisible();
      await expect(loginPage.usernameInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Try to login with short password
      await loginPage.login('default_user', 'short');

      // Verify error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('at least 8 characters');
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // First, we need to register (or the user might already exist)
      // For a fresh test database, register first
      await loginPage.register('default_user', 'testpassword123');

      // Should redirect to dashboard
      await expect(page).toHaveURL('/');
    });

    test('should redirect to login when accessing protected route without auth', async ({
      page,
    }) => {
      // Clear any existing auth token
      await page.goto('/login');
      await page.evaluate(() => localStorage.removeItem('auth_token'));

      // Try to access dashboard
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('Registration Flow', () => {
    test('should switch between login and register tabs', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Initially on login tab
      await expect(loginPage.confirmPasswordInput).not.toBeVisible();

      // Switch to register
      await loginPage.switchToRegister();
      await expect(loginPage.confirmPasswordInput).toBeVisible();

      // Switch back to login
      await loginPage.switchToLogin();
      await expect(loginPage.confirmPasswordInput).not.toBeVisible();
    });

    test('should show error when passwords do not match', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();
      await loginPage.switchToRegister();

      // Fill form with mismatched passwords
      await loginPage.usernameInput.fill('newuser');
      await loginPage.passwordInput.fill('password123');
      await loginPage.confirmPasswordInput.fill('differentpassword');
      await loginPage.submitButton.click();

      // Verify error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('do not match');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page reload', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Register/login
      await loginPage.register('sessiontest', 'testpassword123');
      await expect(page).toHaveURL('/');

      // Reload the page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL('/');
    });

    test('should logout and redirect to login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login first
      await loginPage.register('logouttest', 'testpassword123');
      await expect(page).toHaveURL('/');

      // Clear auth token (simulating logout)
      await page.evaluate(() => {
        localStorage.removeItem('auth_token');
      });

      // Navigate to dashboard
      await page.goto('/');

      // Should redirect to login
      await expect(page).toHaveURL('/login');
    });
  });
});
