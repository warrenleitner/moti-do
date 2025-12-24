/**
 * Global teardown for Playwright E2E tests.
 * Cleanup tasks after all tests complete.
 */
import { type FullConfig } from '@playwright/test';

/**
 * Global teardown function run once after all tests.
 */
async function globalTeardown(_config: FullConfig): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
  console.log('Running global teardown...');

  // Any cleanup tasks can be added here
  // For example: cleaning up test data, stopping services, etc.

  console.log('Global teardown complete.');
}

export default globalTeardown;
