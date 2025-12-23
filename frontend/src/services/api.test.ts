/**
 * Tests for API service helpers (not thin wrappers).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authApi } from './api';

describe('authApi helpers', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  // Store original values
  const originalLocalStorage = global.localStorage;
  const originalLocation = global.window.location;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global.window as any).location;
    global.window.location = { ...originalLocation, href: '' } as Location;

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original values
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    global.window.location = originalLocation;
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');

      const result = authApi.isAuthenticated();

      expect(result).toBe(true);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });

    it('should return false when token does not exist', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = authApi.isAuthenticated();

      expect(result).toBe(false);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('logout', () => {
    it('should remove token and redirect to login', () => {
      authApi.logout();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(global.window.location.href).toBe('/login');
    });
  });
});
