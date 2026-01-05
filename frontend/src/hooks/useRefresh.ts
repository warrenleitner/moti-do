/**
 * Hook for manually refreshing app data.
 * Used by the refresh button and pull-to-refresh gesture.
 */

import { useState, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';

interface UseRefreshResult {
  refresh: () => Promise<void>;
  isRefreshing: boolean;
}

/**
 * Hook that provides a refresh function to reload tasks and user data from the API.
 * Manages loading state during the refresh operation.
 */
export function useRefresh(): UseRefreshResult {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const initializeUser = useUserStore((state) => state.initializeUser);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([fetchTasks(), initializeUser()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchTasks, initializeUser]);

  return { refresh, isRefreshing };
}

export default useRefresh;
