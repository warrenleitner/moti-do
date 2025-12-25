/**
 * Authentication fixtures and helpers for E2E tests.
 */
import { type Page } from '@playwright/test';

/**
 * Test credentials used across E2E tests.
 * NOTE: In dev mode (MOTIDO_DEV_MODE=true), authentication is bypassed.
 * These credentials are used when running with actual authentication.
 */
export const TEST_CREDENTIALS = {
  username: 'default_user',
  password: 'testpassword123',
};

/**
 * Login helper function.
 * Uses actual UI selectors from LoginPage component.
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

  // Wait for login page to load
  await page.getByRole('heading', { name: 'Motodo' }).waitFor({ timeout: 10000 });

  // Fill credentials using MUI TextField textbox roles
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);

  // Click submit button
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard (away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
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

  // Wait for login page to load
  await page.getByRole('heading', { name: 'Motodo' }).waitFor({ timeout: 10000 });

  // Switch to register mode using the ToggleButton
  await page.getByRole('button', { name: 'Register', exact: true }).click();

  // Wait for confirm password field to appear
  await page.getByRole('textbox', { name: 'Confirm Password' }).waitFor({ timeout: 5000 });

  // Fill registration form using MUI TextField textbox roles
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(password);
  await page.getByRole('textbox', { name: 'Confirm Password' }).fill(password);

  // Submit
  await page.locator('button[type="submit"]').click();

  // Wait for redirect to dashboard
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
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

  // Wait for login page
  await page.getByRole('heading', { name: 'Motodo' }).waitFor({ timeout: 10000 });
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

/**
 * Navigate to a page that requires authentication.
 * Will handle redirect to login if needed.
 * @param page - Playwright page object
 * @param path - Path to navigate to
 */
export async function navigateAuthenticated(page: Page, path: string): Promise<void> {
  await page.goto(path);

  // Check if we're redirected to login
  if (page.url().includes('/login')) {
    // Need to login first
    await login(page);
    // Now navigate to intended page
    await page.goto(path);
  }
}
