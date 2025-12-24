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
 * Reset user data by deleting the users.json file.
 * This ensures tests start with a clean slate.
 */
function resetUserData(): void {
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
 */
async function registerTestUser(): Promise<void> {
  console.log(`Registering test user: ${TEST_USERNAME}`);

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
    } else {
      const error = await response.json();
      // If user already exists, that's fine - we'll try to login
      if (error.detail?.includes('already registered')) {
        console.log('Test user already registered, will use existing credentials.');
      } else {
        console.warn(`Failed to register test user: ${error.detail}`);
      }
    }
  } catch (error) {
    console.warn('Failed to register test user:', error);
  }
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

  // Reset user data to ensure clean test state
  resetUserData();

  // Register the test user with known credentials
  await registerTestUser();

  console.log('All servers ready. Starting tests.');
}

export default globalSetup;
