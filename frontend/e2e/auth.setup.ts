/**
 * Authentication setup that runs before all tests.
 * Logs in once and saves authentication state for reuse.
 */
import { test as setup, expect } from '@playwright/test';

const AUTH_FILE = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');
  await page.getByRole('img', { name: 'Motodo' }).waitFor({ timeout: 10000 });

  // Login with test credentials
  await page.getByRole('textbox', { name: 'Username' }).fill('default_user');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('testpassword123');
  await page.locator('button[type="submit"]').click();

  // Wait for successful login (redirect away from login page)
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15000,
  });

  // Verify we're on the dashboard (main heading is "Welcome back!")
  // Extended timeout to handle slow initial data load
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible({ timeout: 10000 });

  // Save authentication state
  await page.context().storageState({ path: AUTH_FILE });
});
