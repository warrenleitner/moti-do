/**
 * Hook for initializing the app by fetching data from the API.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
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
  const initializingRef = useRef(false);

  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const initializeUser = useUserStore((state) => state.initializeUser);

  const initialize = async () => {
    // Prevent concurrent initialization
    if (initializingRef.current) return;
    initializingRef.current = true;

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
      initializingRef.current = false;
    }
  };

  useEffect(() => {
    // Only initialize once
    if (!initializingRef.current) {
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retry = useCallback(() => {
    initializingRef.current = false;
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
    retry,
  };
}

export default useAppInitialization;
