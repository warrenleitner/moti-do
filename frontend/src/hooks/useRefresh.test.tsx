/**
 * Tests for useRefresh hook.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useRefresh } from './useRefresh';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';

// Mock the stores
vi.mock('../store/taskStore', () => ({
  useTaskStore: vi.fn(),
}));

vi.mock('../store/userStore', () => ({
  useUserStore: vi.fn(),
}));

describe('useRefresh', () => {
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

  it('should return isRefreshing false initially', () => {
    const { result } = renderHook(() => useRefresh());
    expect(result.current.isRefreshing).toBe(false);
  });

  it('should call fetchTasks and initializeUser on refresh', async () => {
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    expect(mockInitializeUser).toHaveBeenCalledTimes(1);
  });

  it('should set isRefreshing true during refresh', async () => {
    let resolveRefresh: () => void;
    const refreshPromise = new Promise<void>((resolve) => {
      resolveRefresh = resolve;
    });
    mockFetchTasks.mockReturnValue(refreshPromise);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRefresh());

    // Start refresh but don't await
    act(() => {
      result.current.refresh();
    });

    // Should be refreshing
    expect(result.current.isRefreshing).toBe(true);

    // Resolve the promise
    await act(async () => {
      resolveRefresh!();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('should set isRefreshing false even on error', async () => {
    mockFetchTasks.mockRejectedValue(new Error('Network error'));
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      // Catch the error to prevent test failure
      try {
        await result.current.refresh();
      } catch {
        // Expected error
      }
    });

    expect(result.current.isRefreshing).toBe(false);
  });

  it('should return stable refresh function reference', async () => {
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result, rerender } = renderHook(() => useRefresh());

    const refreshFn1 = result.current.refresh;

    rerender();

    const refreshFn2 = result.current.refresh;

    // Refresh function should be stable (same reference)
    expect(refreshFn1).toBe(refreshFn2);
  });

  it('should allow multiple sequential refreshes', async () => {
    mockFetchTasks.mockResolvedValue(undefined);
    mockInitializeUser.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRefresh());

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchTasks).toHaveBeenCalledTimes(1);
    expect(result.current.isRefreshing).toBe(false);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockFetchTasks).toHaveBeenCalledTimes(2);
    expect(result.current.isRefreshing).toBe(false);
  });
});
