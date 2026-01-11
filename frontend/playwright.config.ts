import { defineConfig, devices } from '@playwright/test';
import os from 'os';

/**
 * Playwright configuration for Moti-Do E2E tests.
 * See https://playwright.dev/docs/test-configuration
 *
 * Parallelization Strategy:
 * - Tests use unique identifiers (timestamps, random strings) for test data isolation
 * - Most tests can run in parallel safely since they don't share state
 * - Worker count is based on CPU cores (max 4 to avoid overwhelming the backend)
 */

// Determine optimal worker count based on environment
const getWorkerCount = (): number | string => {
  if (process.env.CI) {
    // In CI, use 2 workers for stability (shared resources)
    return 2;
  }
  // Locally, use half of CPU cores (max 4) to balance speed and stability
  return Math.min(Math.floor(os.cpus().length / 2), 4) || 1;
};

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  /* Enable parallel execution - tests use unique identifiers for isolation */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Dynamic worker count based on environment */
  workers: getWorkerCount(),

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video recording on failure */
    video: 'on-first-retry',
  },

  /* Configure projects - setup runs first, then tests use saved auth state */
  projects: [
    // Setup project - authenticates and saves state
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      testDir: './e2e',
    },

    // Auth tests run without pre-authenticated state (testing login/register)
    {
      name: 'auth-tests',
      testMatch: /auth\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },

    // Main test project - CRUD, navigation, habits, kanban, graph, calendar, cross-cutting
    // Cross-cutting tests now include performance metrics collection
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Use saved authentication state
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.spec\.ts/],
    },
  ],

  /* Run local dev server before starting the tests */
  /* Note: When running via `npx playwright test` directly, DATABASE_URL is cleared
   * to use local JSON storage. When running via `./scripts/run-e2e.sh`, the script
   * starts the backend with PostgreSQL and sets DATABASE_URL - Playwright will
   * reuse that existing server. */
  webServer: [
    {
      command: 'cd .. && env DATABASE_URL= poetry run uvicorn motido.api.main:app --host 0.0.0.0 --port 8000',
      url: 'http://localhost:8000/api/health',
      reuseExistingServer: true, // Reuse existing server (e.g., when run-e2e.sh starts PostgreSQL backend)
      timeout: 120 * 1000,
      env: {
        ...process.env,
        DATABASE_URL: '', // Clear DATABASE_URL to use local JSON storage (when starting fresh)
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
