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

      // Try to login with short password - manually fill to avoid helper's waits
      await loginPage.usernameInput.fill('default_user');
      await loginPage.passwordInput.fill('short');
      await loginPage.submitButton.click();

      // Verify error message appears
      await expect(loginPage.errorAlert).toBeVisible({ timeout: 5000 });
      const errorText = await loginPage.errorAlert.textContent();
      expect(errorText?.toLowerCase()).toContain('8 characters');
    });

    test('should login successfully with valid credentials', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login with default_user (already registered in single-user mode)
      await loginPage.login('default_user', 'testpassword123');

      // Wait for redirect to dashboard
      await page.waitForURL('/', { timeout: 10000 });
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

      // Initially on login tab - confirm password should not be visible
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

      // Verify error message appears (client-side validation)
      await expect(loginPage.errorAlert).toBeVisible({ timeout: 5000 });
      const errorText = await loginPage.errorAlert.textContent();
      expect(errorText?.toLowerCase()).toContain('match');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session after page reload', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login with default_user (already registered in single-user mode)
      await loginPage.login('default_user', 'testpassword123');
      await page.waitForURL('/', { timeout: 10000 });
      await expect(page).toHaveURL('/');

      // Reload the page
      await page.reload();

      // Should still be on dashboard (not redirected to login)
      await expect(page).toHaveURL('/');
    });

    test('should logout and redirect to login', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login with default_user (already registered in single-user mode)
      await loginPage.login('default_user', 'testpassword123');
      await page.waitForURL('/', { timeout: 10000 });
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
