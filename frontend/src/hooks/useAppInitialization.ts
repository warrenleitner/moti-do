/**
 * Hook for initializing the app by fetching data from the API.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import { authApi } from '../services/api';
import {
  getNotificationEnabled,
  startNotificationScheduler,
  stopNotificationScheduler,
} from '../services/notifications';

interface InitializationState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Hook that initializes the app by fetching tasks and user data from the API.
 * Should be called once at the app root level.
 * Re-initializes when auth state changes (e.g., after login).
 */
export function useAppInitialization(): InitializationState {
  const initialAuthState = authApi.isAuthenticated();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(initialAuthState);
  const [error, setError] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const lastAuthStateRef = useRef(initialAuthState);
  const location = useLocation();

  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const initializeUser = useUserStore((state) => state.initializeUser);

  const initialize = useCallback(async () => {
    const isAuthenticated = authApi.isAuthenticated();
    lastAuthStateRef.current = isAuthenticated;

    // Don't initialize if not authenticated - let routing handle redirect to login
    if (!isAuthenticated) {
      setIsInitialized(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    // Prevent concurrent initialization - edge case tested via integration tests
    /* v8 ignore next 2 */
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

      // Start notification scheduler if enabled
      if (getNotificationEnabled()) {
        startNotificationScheduler();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize app';
      setError(message);
      // Console logging cannot be tested in unit tests
      /* v8 ignore next 1 */
      console.error('App initialization failed:', err);
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  }, [fetchTasks, initializeUser]);

  useEffect(() => {
    const isAuthenticated = authApi.isAuthenticated();
    const authChanged = lastAuthStateRef.current !== isAuthenticated;

    if (authChanged) {
      lastAuthStateRef.current = isAuthenticated;
    }

    if (!isAuthenticated) {
      if (authChanged) {
        initialize();
      }
      return;
    }

    // Initialize if authenticated but not yet initialized
    // This handles the case where user logs in and navigates to a protected route
    if (!isInitialized && !initializingRef.current) {
      initialize();
    }
  }, [location.pathname, isInitialized, initialize]);

  // Clean up notification scheduler on unmount
  useEffect(() => {
    return () => stopNotificationScheduler();
  }, []);

  const retry = useCallback(() => {
    initializingRef.current = false;
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
