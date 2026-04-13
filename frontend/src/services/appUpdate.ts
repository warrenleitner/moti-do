import { registerSW } from 'virtual:pwa-register';
import { replaceCurrentLocation } from '../utils/navigation';

type UpdateAvailabilityListener = (isUpdateAvailable: boolean) => void;

const FORCE_UPDATE_QUERY_PARAM = '__motido_update__';

let isInitialized = false;
let isUpdateAvailable = false;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let applyServiceWorkerUpdate: ReturnType<typeof registerSW> | null = null;

const listeners = new Set<UpdateAvailabilityListener>();

const setUpdateAvailable = (value: boolean): void => {
  isUpdateAvailable = value;
  listeners.forEach((listener) => {
    listener(value);
  });
};

const buildForceUpdateUrl = (): string => {
  const nextUrl = new URL(window.location.href);
  nextUrl.searchParams.set(FORCE_UPDATE_QUERY_PARAM, Date.now().toString());
  return nextUrl.toString();
};

const clearBrowserCaches = async (): Promise<void> => {
  if (!('caches' in window)) {
    return;
  }

  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((cacheKey) => caches.delete(cacheKey)));
};

const unregisterServiceWorkers = async (): Promise<void> => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
};

const hardReloadFromNetwork = async (): Promise<void> => {
  await Promise.all([clearBrowserCaches(), unregisterServiceWorkers()]);
  replaceCurrentLocation(buildForceUpdateUrl());
};

export const initializeAppUpdate = (): void => {
  if (isInitialized || !('serviceWorker' in navigator)) {
    return;
  }

  isInitialized = true;
  applyServiceWorkerUpdate = registerSW({
    immediate: true,
    onNeedRefresh() {
      setUpdateAvailable(true);
    },
    onRegisteredSW(_swScriptUrl, registration) {
      serviceWorkerRegistration = registration;
    },
    onRegisterError(error) {
      console.error('Failed to register app update service worker:', error);
    },
  });
};

export const isAppUpdateAvailable = (): boolean => isUpdateAvailable;

export const subscribeToAppUpdate = (
  listener: UpdateAvailabilityListener
): (() => void) => {
  listeners.add(listener);
  listener(isUpdateAvailable);

  return () => {
    listeners.delete(listener);
  };
};

export const forceAppUpdate = async (): Promise<void> => {
  initializeAppUpdate();

  if (serviceWorkerRegistration) {
    await serviceWorkerRegistration.update();
  }

  if ((isUpdateAvailable || serviceWorkerRegistration?.waiting) && applyServiceWorkerUpdate) {
    setUpdateAvailable(false);
    await applyServiceWorkerUpdate(true);
    return;
  }

  await hardReloadFromNetwork();
};