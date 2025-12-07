/**
 * Hook for initializing the app by fetching data from the API.
 */

import { useEffect, useState, useCallback } from 'react';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';

interface InitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Hook that initializes the app by fetching tasks and user data from the API.
 * Should be called once at the app root level.
 */
export function useAppInitialization(): InitializationState {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const initializeUser = useUserStore((state) => state.initializeUser);

  const initialize = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch tasks and user data in parallel
      await Promise.all([
        fetchTasks(),
        initializeUser(),
      ]);

      setIsInitialized(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize app';
      setError(message);
      console.error('App initialization failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchTasks, initializeUser]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const retry = useCallback(() => {
    initialize();
  }, [initialize]);

  return {
    isInitialized,
    isLoading,
    error,
    retry,
  };
}

export default useAppInitialization;
