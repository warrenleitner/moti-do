import { beforeEach, describe, expect, it, vi } from 'vitest';

const registerSWMock = vi.fn();
const replaceCurrentLocationMock = vi.fn();

vi.mock('virtual:pwa-register', () => ({
  registerSW: registerSWMock,
}));

vi.mock('../utils/navigation', () => ({
  replaceCurrentLocation: replaceCurrentLocationMock,
}));

describe('appUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([]),
        serviceWorker: {
          getRegistrations: vi.fn().mockResolvedValue([]),
        },
      },
    });

    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: vi.fn().mockResolvedValue([]),
        delete: vi.fn().mockResolvedValue(true),
      },
    });
  });

  it('tracks when a service worker update is waiting', async () => {
    let onNeedRefresh: (() => void) | undefined;
    registerSWMock.mockImplementation((options?: { onNeedRefresh?: () => void }) => {
      onNeedRefresh = options?.onNeedRefresh;
      return vi.fn().mockResolvedValue(undefined);
    });

    const appUpdate = await import('./appUpdate');
    const listener = vi.fn();

    appUpdate.initializeAppUpdate();
    const unsubscribe = appUpdate.subscribeToAppUpdate(listener);

    expect(listener).toHaveBeenCalledWith(false);

    onNeedRefresh?.();

    expect(appUpdate.isAppUpdateAvailable()).toBe(true);
    expect(listener).toHaveBeenLastCalledWith(true);

    unsubscribe();
  });

  it('applies a waiting service worker update before falling back to a hard reload', async () => {
    let onNeedRefresh: (() => void) | undefined;
    const updateServiceWorker = vi.fn().mockResolvedValue(undefined);
    const updateRegistration = vi.fn().mockResolvedValue(undefined);

    registerSWMock.mockImplementation((options?: { onNeedRefresh?: () => void; onRegisteredSW?: (_swUrl: string, registration: ServiceWorkerRegistration | undefined) => void }) => {
      onNeedRefresh = options?.onNeedRefresh;
      options?.onRegisteredSW?.('__SW__', {
        update: updateRegistration,
        waiting: {} as ServiceWorker,
      } as ServiceWorkerRegistration);
      return updateServiceWorker;
    });

    const appUpdate = await import('./appUpdate');

    appUpdate.initializeAppUpdate();
    onNeedRefresh?.();

    await appUpdate.forceAppUpdate();

    expect(updateRegistration).toHaveBeenCalledTimes(1);
    expect(updateServiceWorker).toHaveBeenCalledWith(true);
    expect(replaceCurrentLocationMock).not.toHaveBeenCalled();
  });

  it('falls back to a cache-busted hard reload when no waiting update exists', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const updateRegistration = vi.fn().mockResolvedValue(undefined);
    const cacheKeys = vi.fn().mockResolvedValue(['workbox-precache', 'api-cache']);
    const cacheDelete = vi.fn().mockResolvedValue(true);

    Object.defineProperty(globalThis.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        getRegistrations: vi.fn().mockResolvedValue([
          {
            unregister,
          },
        ]),
      },
    });

    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: cacheDelete,
      },
    });

    registerSWMock.mockImplementation((options?: { onRegisteredSW?: (_swUrl: string, registration: ServiceWorkerRegistration | undefined) => void }) => {
      options?.onRegisteredSW?.('__SW__', {
        update: updateRegistration,
      } as ServiceWorkerRegistration);
      return vi.fn().mockResolvedValue(undefined);
    });

    const appUpdate = await import('./appUpdate');

    appUpdate.initializeAppUpdate();
    await appUpdate.forceAppUpdate();

    expect(updateRegistration).toHaveBeenCalledTimes(1);
    expect(cacheKeys).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith('workbox-precache');
    expect(cacheDelete).toHaveBeenCalledWith('api-cache');
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(replaceCurrentLocationMock).toHaveBeenCalledTimes(1);
    expect(replaceCurrentLocationMock.mock.calls[0][0]).toMatch(/__motido_update__=/);
  });

  it('falls back cleanly when service workers and Cache Storage are unavailable', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    delete (window as Window & Record<string, unknown>).caches;

    const appUpdate = await import('./appUpdate');

    appUpdate.initializeAppUpdate();
    await appUpdate.forceAppUpdate();

    expect(registerSWMock).not.toHaveBeenCalled();
    expect(replaceCurrentLocationMock).toHaveBeenCalledTimes(1);
  });

  it('registers the PWA update hook only once and surfaces registration errors', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let onRegisterError: ((error: unknown) => void) | undefined;

    registerSWMock.mockImplementation(
      (options?: { onRegisterError?: (error: unknown) => void }) => {
        onRegisterError = options?.onRegisterError;
        return vi.fn().mockResolvedValue(undefined);
      }
    );

    const appUpdate = await import('./appUpdate');

    appUpdate.initializeAppUpdate();
    appUpdate.initializeAppUpdate();
    onRegisterError?.(new Error('registration failed'));

    expect(registerSWMock).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to register app update service worker:',
      expect.any(Error)
    );
  });
});