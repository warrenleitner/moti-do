/**
 * Base fixture extending Playwright test with common setup.
 */
import { test as base, type Page } from '@playwright/test';

/**
 * Custom test fixtures for Moti-Do E2E tests.
 */
export interface MotiDoFixtures {
  /** Authenticated page with valid session */
  authenticatedPage: Page;
}

/**
 * Extended test with Moti-Do specific fixtures.
 */
export const test = base.extend<MotiDoFixtures>({
  /**
   * Provides an authenticated page for tests that require login.
   * Uses a saved auth state for faster test execution.
   */
  authenticatedPage: async ({ page }, use) => {
    // Check if we have a stored auth state
    const authState = process.env.E2E_AUTH_TOKEN;

    if (authState) {
      // Use stored auth token
      await page.addInitScript((token) => {
        window.localStorage.setItem('auth_token', token);
      }, authState);
    } else {
      // Perform login
      await page.goto('/login');

      // Fill login form
      await page.fill('input[name="username"], input[type="text"]', 'default_user');
      await page.fill('input[type="password"]', 'testpassword123');

      // Submit and wait for navigation
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    }

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
