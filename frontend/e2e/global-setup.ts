/**
 * Global setup for Playwright E2E tests.
 * Waits for backend to be available before running tests.
 */
import { type FullConfig } from '@playwright/test';

/**
 * Wait for a URL to be accessible.
 */
async function waitForUrl(url: string, timeout: number = 60000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`Server ready at ${url}`);
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Server at ${url} did not become available within ${timeout}ms`);
}

/**
 * Global setup function run once before all tests.
 */
async function globalSetup(_config: FullConfig): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
  console.log('Running global setup...');

  // Wait for backend to be ready
  console.log('Waiting for backend server...');
  await waitForUrl('http://localhost:8000/api/health', 120000);

  // Wait for frontend to be ready
  console.log('Waiting for frontend server...');
  await waitForUrl('http://localhost:5173', 120000);

  console.log('All servers ready. Starting tests.');
}

export default globalSetup;
