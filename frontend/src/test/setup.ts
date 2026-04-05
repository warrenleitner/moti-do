/**
 * Test setup file for Vitest with React Testing Library.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll, vi } from 'vitest';

// Define global constants that Vite injects at build time
// These are used for version display in the UI
(globalThis as Record<string, unknown>).__APP_VERSION__ = '0.8.0';
(globalThis as Record<string, unknown>).__BUILD_TIMESTAMP__ = new Date().toISOString();

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

// Mock window.matchMedia for Mantine responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver for React Flow
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(window, 'ResizeObserver', {
  value: ResizeObserverMock,
});

// Mock scrollIntoView for jsdom (Mantine Combobox uses it)
Element.prototype.scrollIntoView = vi.fn() as unknown as typeof Element.prototype.scrollIntoView;

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
