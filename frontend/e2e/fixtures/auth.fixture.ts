/**
 * Authentication fixtures and helpers for E2E tests.
 */
import { type Page } from '@playwright/test';

/**
 * Test credentials used across E2E tests.
 */
export const TEST_CREDENTIALS = {
  username: 'default_user',
  password: 'testpassword123',
};

/**
 * Login helper function.
 * @param page - Playwright page object
 * @param username - Username to login with
 * @param password - Password to login with
 */
export async function login(
  page: Page,
  username: string = TEST_CREDENTIALS.username,
  password: string = TEST_CREDENTIALS.password
): Promise<void> {
  await page.goto('/login');

  // Ensure we're on login page
  await page.waitForSelector('text=Moti-Do');

  // Fill credentials
  await page.fill('input[value="default_user"]', username);
  await page.fill('input[type="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/');
}

/**
 * Register a new user.
 * @param page - Playwright page object
 * @param username - Username to register
 * @param password - Password to register
 */
export async function register(
  page: Page,
  username: string,
  password: string
): Promise<void> {
  await page.goto('/login');

  // Switch to register mode
  await page.click('button:has-text("Register")');

  // Fill registration form
  await page.fill('input[value="default_user"]', username);
  await page.fill('input[type="password"]:first-of-type', password);
  await page.fill('input[type="password"]:nth-of-type(2)', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('/');
}

/**
 * Logout the current user.
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  // Clear auth token from localStorage
  await page.evaluate(() => {
    localStorage.removeItem('auth_token');
  });

  // Navigate to login
  await page.goto('/login');
}

/**
 * Check if user is authenticated.
 * @param page - Playwright page object
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    return !!localStorage.getItem('auth_token');
  });
}

/**
 * Set auth token directly for faster test setup.
 * @param page - Playwright page object
 * @param token - JWT auth token
 */
export async function setAuthToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((authToken) => {
    window.localStorage.setItem('auth_token', authToken);
  }, token);
}
