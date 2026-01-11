/**
 * Global setup for Playwright E2E tests.
 * Waits for backend to be available before running tests.
 */
import { type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test credentials that will be used across all E2E tests
const TEST_USERNAME = 'default_user';
const TEST_PASSWORD = 'testpassword123';

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
 * Reset user data by deleting the users.json file (for JSON backend only).
 * This ensures tests start with a clean slate when using JSON storage.
 *
 * Note: PostgreSQL reset is handled by scripts/verify.py which always starts
 * a fresh Docker container with an empty database.
 */
function resetUserData(): void {
  // Skip reset if using PostgreSQL (DATABASE_URL is set)
  // PostgreSQL is reset by scripts/verify.py before this script runs
  if (process.env.DATABASE_URL) {
    console.log('Using PostgreSQL backend - database reset handled by scripts/verify.py');
    return;
  }

  // Path to the users.json file (relative to project root)
  const projectRoot = path.resolve(__dirname, '../../..');
  const usersJsonPath = path.join(projectRoot, 'src/motido/data/motido_data/users.json');

  if (fs.existsSync(usersJsonPath)) {
    console.log(`Deleting existing users.json at: ${usersJsonPath}`);
    fs.unlinkSync(usersJsonPath);
    console.log('User data reset complete.');
  } else {
    console.log('No existing users.json found, starting fresh.');
  }
}

/**
 * Register the test user with known credentials.
 * Includes retry logic for transient database startup issues.
 */
async function registerTestUser(retries: number = 3): Promise<void> {
  console.log(`Registering test user: ${TEST_USERNAME}`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: TEST_USERNAME,
          password: TEST_PASSWORD,
        }),
      });

      if (response.ok) {
        console.log('Test user registered successfully.');
        return;
      }

      // Try to parse as JSON, but handle non-JSON responses gracefully
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        // If user already exists, that's fine - we'll try to login
        if (error.detail?.includes('already registered')) {
          console.log('Test user already registered, will use existing credentials.');
          return;
        } else {
          console.warn(`Failed to register test user: ${error.detail}`);
        }
      } else {
        // Non-JSON response (e.g., "Internal Server Error")
        const text = await response.text();
        console.warn(`Failed to register test user (attempt ${attempt}/${retries}, status ${response.status}): ${text}`);

        // If this is a 500 error, wait and retry (database might still be initializing)
        if (response.status >= 500 && attempt < retries) {
          console.log(`Waiting 2 seconds before retry...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      }
    } catch (error) {
      console.warn(`Failed to register test user (attempt ${attempt}/${retries}):`, error);
      if (attempt < retries) {
        console.log(`Waiting 2 seconds before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }
    }

    // If we get here without returning, something failed
    if (attempt === retries) {
      console.warn(`All ${retries} attempts to register test user failed.`);
    }
  }
}

/**
 * Global setup function run once before all tests.
 */
async function globalSetup(_config: FullConfig): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
  console.log('Running global setup...');

  // Log database backend for debugging
  const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'JSON (local)';
  console.log(`Database backend: ${dbType}`);

  // Wait for backend to be ready
  console.log('Waiting for backend server...');
  await waitForUrl('http://localhost:8000/api/health', 120000);

  // Wait for frontend to be ready
  console.log('Waiting for frontend server...');
  await waitForUrl('http://localhost:5173', 120000);

  // Reset user data to ensure clean test state (only for JSON backend)
  resetUserData();

  // Register the test user with known credentials
  await registerTestUser();

  console.log('All servers ready. Starting tests.');
}

export default globalSetup;
