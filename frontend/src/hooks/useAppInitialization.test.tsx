/**
 * Tests for useAppInitialization hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppInitialization } from './useAppInitialization';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import { authApi } from '../services/api';

// Mock the stores
vi.mock('../store/taskStore', () => ({
  useTaskStore: vi.fn(),
}));

vi.mock('../store/userStore', () => ({
  useUserStore: vi.fn(),
}));

// Mock the authApi
vi.mock('../services/api', () => ({
  authApi: {
    isAuthenticated: vi.fn(),
  },
}));

// Wrapper with Router context for the hook
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('useAppInitialization', () => {
  const mockFetchTasks = vi.fn();
  const mockInitializeUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(useTaskStore).mockImplementation((selector) => {
      return selector({ fetchTasks: mockFetchTasks });
    });

    vi.mocked(useUserStore).mockImplementation((selector) => {
      return selector({ initializeUser: mockInitializeUser });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not initialize if user is not authenticated', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(false);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockFetchTasks).not.toHaveBeenCalled();
    expect(mockInitializeUser).not.toHaveBeenCalled();
  });

  it('should initialize successfully when authenticated', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isInitialized).toBe(false);

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    expect(mockInitializeUser).toHaveBeenCalledTimes(1);
  });

  it('should handle initialization error from fetchTasks', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    const error = new Error('Failed to fetch tasks');
    mockFetchTasks.mockRejectedValue(error);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Failed to fetch tasks');
    });

    expect(mockFetchTasks).toHaveBeenCalled();
  });

  it('should handle initialization error from initializeUser', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    mockFetchTasks.mockResolvedValue(undefined);
    const error = new Error('Failed to initialize user');
    mockInitializeUser.mockRejectedValue(error);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(false);
      expect(result.current.error).toBe('Failed to initialize user');
    });

    expect(mockInitializeUser).toHaveBeenCalled();
  });

  it('should handle unknown error type', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    mockFetchTasks.mockRejectedValue('String error');
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Failed to initialize app');
    });
  });

  it('should allow retry after error', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    const error = new Error('Network error');
    mockFetchTasks.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    // Wait for initial error
    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
      expect(result.current.isInitialized).toBe(false);
    });

    // Retry should work - wrap in act
    await waitFor(async () => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockFetchTasks).toHaveBeenCalledTimes(2);
  });

  it('should not initialize multiple times concurrently', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    let resolveInit: () => void;
    const initPromise = new Promise<void>((resolve) => {
      resolveInit = resolve;
    });
    mockFetchTasks.mockReturnValue(initPromise);
    mockInitializeUser.mockResolvedValue(undefined);

    renderHook(() => useAppInitialization(), { wrapper });

    // Wait a bit to ensure initialization started
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Should only be called once even though hook is still loading
    expect(mockFetchTasks).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolveInit!();

    await waitFor(() => {
      expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    });
  });

  it('should return consistent retry function', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAppInitialization(), { wrapper });

    const retryFn1 = result.current.retry;

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    const retryFn2 = result.current.retry;

    // Retry function should be stable (same reference)
    expect(retryFn1).toBe(retryFn2);
  });

  it('should only call initialize once even on re-renders', async () => {
    vi.mocked(authApi.isAuthenticated).mockReturnValue(true);
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useAppInitialization(), { wrapper });

    await waitFor(() => {
      expect(result.current.isInitialized).toBe(true);
    });

    // Re-render the hook
    rerender();

    // Should still only be called once
    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    expect(mockInitializeUser).toHaveBeenCalledTimes(1);
  });
});
