/**
 * Test setup file for Vitest with React Testing Library.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Mock localStorage for Zustand persist middleware
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Import MSW server conditionally
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let server: any = null;

try {
  // Dynamic import to handle cases where msw might not be needed
  const { server: mswServer } = await import('./mocks/server');
  server = mswServer;
} catch {
  // MSW not available, tests will run without mocking
  console.warn('MSW server not available');
}

// Setup MSW before all tests if available
beforeAll(() => {
  if (server) {
    server.listen({ onUnhandledRequest: 'warn' });
  }
});

// Reset any request handlers after each test
afterEach(() => {
  cleanup();
  if (server) {
    server.resetHandlers();
  }
  // Clear localStorage mock
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
});

// Clean up after all tests
afterAll(() => {
  if (server) {
    server.close();
  }
});
