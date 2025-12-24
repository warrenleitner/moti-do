/**
 * Base fixture extending Playwright test with common setup.
 */
import { test as base, type Page } from '@playwright/test';
import { login, TEST_CREDENTIALS } from './auth.fixture';

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
   * Handles login flow automatically.
   */
  authenticatedPage: async ({ page }, use) => {
    // Check if we have a stored auth state
    const authToken = process.env.E2E_AUTH_TOKEN;

    if (authToken) {
      // Use stored auth token for faster test execution
      await page.addInitScript((token) => {
        window.localStorage.setItem('auth_token', token);
      }, authToken);
      await page.goto('/');
    } else {
      // Perform login via UI
      await login(page, TEST_CREDENTIALS.username, TEST_CREDENTIALS.password);
    }

    // Verify we're authenticated by checking we're not on login page
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 10000,
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
