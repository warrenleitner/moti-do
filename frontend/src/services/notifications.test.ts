/**
 * Tests for the notification service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNotificationEnabled,
  setNotificationEnabled,
  getNotificationTime,
  setNotificationTime,
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  buildNotificationBody,
  showDailyNotification,
  startNotificationScheduler,
  stopNotificationScheduler,
} from './notifications';
import type { NotificationSummary } from './api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('notification settings', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('defaults to disabled', () => {
    expect(getNotificationEnabled()).toBe(false);
  });

  it('persists enabled state', () => {
    setNotificationEnabled(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('motido-notifications-enabled', 'true');
    expect(getNotificationEnabled()).toBe(true);
  });

  it('defaults time to 09:00', () => {
    expect(getNotificationTime()).toBe('09:00');
  });

  it('persists custom time', () => {
    setNotificationTime('14:30');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('motido-notifications-time', '14:30');
    expect(getNotificationTime()).toBe('14:30');
  });
});

describe('notification support detection', () => {
  it('returns true when Notification API exists', () => {
    // The global Notification may or may not exist in the test environment
    if ('Notification' in window) {
      expect(isNotificationSupported()).toBe(true);
    }
  });

  it('returns unsupported when Notification API is missing', () => {
    const original = window.Notification;
    // @ts-expect-error - intentionally removing for test
    delete window.Notification;
    expect(isNotificationSupported()).toBe(false);
    expect(getNotificationPermission()).toBe('unsupported');
    window.Notification = original;
  });
});

describe('requestNotificationPermission', () => {
  it('returns unsupported when Notification API is missing', async () => {
    const original = window.Notification;
    // @ts-expect-error - intentionally removing for test
    delete window.Notification;
    const result = await requestNotificationPermission();
    expect(result).toBe('unsupported');
    window.Notification = original;
  });

  it('requests permission and returns result', async () => {
    const mockRequestPermission = vi.fn().mockResolvedValue('granted');
    // @ts-expect-error - mock
    window.Notification = class { static permission = 'default'; static requestPermission = mockRequestPermission; };
    const result = await requestNotificationPermission();
    expect(result).toBe('granted');
    expect(mockRequestPermission).toHaveBeenCalled();
  });
});

describe('buildNotificationBody', () => {
  it('builds body with all fields populated', () => {
    const summary: NotificationSummary = {
      completed_today: 3,
      tasks_due_today: 5,
      xp_gained_today: 100,
      points_at_risk: 50,
      processing_date: '2025-01-08',
      current_date: '2025-01-09',
      days_behind: 1,
    };
    const body = buildNotificationBody(summary);
    expect(body).toContain('3 tasks completed');
    expect(body).toContain('5 tasks still due');
    expect(body).toContain('100 XP earned');
    expect(body).toContain('50 XP at risk');
    expect(body).toContain('1 day behind');
  });

  it('shows singular form for 1 task', () => {
    const summary: NotificationSummary = {
      completed_today: 1,
      tasks_due_today: 1,
      xp_gained_today: 10,
      points_at_risk: 5,
      processing_date: '2025-01-08',
      current_date: '2025-01-08',
      days_behind: 0,
    };
    const body = buildNotificationBody(summary);
    expect(body).toContain('1 task completed');
    expect(body).toContain('1 task still due');
    expect(body).not.toContain('behind');
  });

  it('handles zero tasks due', () => {
    const summary: NotificationSummary = {
      completed_today: 0,
      tasks_due_today: 0,
      xp_gained_today: 0,
      points_at_risk: 0,
      processing_date: '2025-01-08',
      current_date: '2025-01-08',
      days_behind: 0,
    };
    const body = buildNotificationBody(summary);
    expect(body).toContain('No tasks due');
    expect(body).not.toContain('completed');
    expect(body).not.toContain('XP earned');
    expect(body).not.toContain('at risk');
  });

  it('shows plural days behind', () => {
    const summary: NotificationSummary = {
      completed_today: 0,
      tasks_due_today: 0,
      xp_gained_today: 0,
      points_at_risk: 0,
      processing_date: '2025-01-05',
      current_date: '2025-01-08',
      days_behind: 3,
    };
    const body = buildNotificationBody(summary);
    expect(body).toContain('3 days behind');
  });
});

describe('showDailyNotification', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns false when notifications not supported', async () => {
    const original = window.Notification;
    // @ts-expect-error - intentionally removing for test
    delete window.Notification;
    const result = await showDailyNotification();
    expect(result).toBe(false);
    window.Notification = original;
  });

  it('returns false when permission not granted', async () => {
    // @ts-expect-error - mock
    window.Notification = class { static permission = 'denied'; };
    const result = await showDailyNotification();
    expect(result).toBe(false);
  });

  it('creates notification when permission granted', async () => {
    const mockConstructor = vi.fn();
    // @ts-expect-error - mock
    window.Notification = class {
      static permission = 'granted';
      constructor(...args: unknown[]) { mockConstructor(...args); }
    };

    // Mock the API call
    const { userApi } = await import('./api');
    vi.spyOn(userApi, 'getNotificationSummary').mockResolvedValue({
      completed_today: 2,
      tasks_due_today: 3,
      xp_gained_today: 50,
      points_at_risk: 20,
      processing_date: '2025-01-08',
      current_date: '2025-01-08',
      days_behind: 0,
    });

    const result = await showDailyNotification();
    expect(result).toBe(true);
    expect(mockConstructor).toHaveBeenCalledWith('Moti-Do Daily Check-in', expect.objectContaining({
      tag: 'motido-daily-checkin',
      icon: '/pwa-192x192.png',
    }));
  });

  it('returns false when API call fails', async () => {
    // @ts-expect-error - mock
    window.Notification = class { static permission = 'granted'; };

    const { userApi } = await import('./api');
    vi.spyOn(userApi, 'getNotificationSummary').mockRejectedValue(new Error('Network error'));

    const result = await showDailyNotification();
    expect(result).toBe(false);
  });
});

describe('notification scheduler', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopNotificationScheduler();
    vi.useRealTimers();
  });

  it('starts and stops without error', () => {
    startNotificationScheduler();
    stopNotificationScheduler();
  });

  it('can be started multiple times safely', () => {
    startNotificationScheduler();
    startNotificationScheduler();
    stopNotificationScheduler();
  });

  it('stopping when not started is safe', () => {
    stopNotificationScheduler();
  });
});
