/**
 * Browser notification service for daily check-in reminders.
 *
 * Uses the Web Notifications API to show scheduled reminders.
 * Settings (enabled, time) are persisted in localStorage.
 * The schedule is based on the user's local time, not the processing date.
 */

import { userApi, type NotificationSummary } from './api';

// --- localStorage keys ---
const STORAGE_KEY_ENABLED = 'motido-notifications-enabled';
const STORAGE_KEY_TIME = 'motido-notifications-time';
const STORAGE_KEY_LAST_SHOWN = 'motido-notifications-last-shown';

// --- Default values ---
const DEFAULT_TIME = '09:00'; // 9 AM local time
const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

// --- Settings helpers ---

export function getNotificationEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY_ENABLED) === 'true';
}

export function setNotificationEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
}

export function getNotificationTime(): string {
  return localStorage.getItem(STORAGE_KEY_TIME) || DEFAULT_TIME;
}

export function setNotificationTime(time: string): void {
  localStorage.setItem(STORAGE_KEY_TIME, time);
}

function getLastShownDate(): string | null {
  return localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
}

function setLastShownDate(date: string): void {
  localStorage.setItem(STORAGE_KEY_LAST_SHOWN, date);
}

// --- Permission helpers ---

export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported';
  const result = await Notification.requestPermission();
  return result;
}

// --- Notification content ---

export function buildNotificationBody(summary: NotificationSummary): string {
  const lines: string[] = [];

  if (summary.completed_today > 0) {
    lines.push(`✅ ${summary.completed_today} task${summary.completed_today !== 1 ? 's' : ''} completed`);
  }

  if (summary.tasks_due_today > 0) {
    lines.push(`📋 ${summary.tasks_due_today} task${summary.tasks_due_today !== 1 ? 's' : ''} still due`);
  } else {
    lines.push('📋 No tasks due — nice!');
  }

  if (summary.xp_gained_today > 0) {
    lines.push(`⭐ ${summary.xp_gained_today} XP earned`);
  }

  if (summary.points_at_risk > 0) {
    lines.push(`⚠️ ${summary.points_at_risk} XP at risk if due tasks aren't completed`);
  }

  if (summary.days_behind > 0) {
    lines.push(`📅 Processing date is ${summary.days_behind} day${summary.days_behind !== 1 ? 's' : ''} behind`);
  }

  return lines.join('\n');
}

// --- Show notification ---

export async function showDailyNotification(): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  try {
    const summary = await userApi.getNotificationSummary();
    const body = buildNotificationBody(summary);

    new Notification('Moti-Do Daily Check-in', {
      body,
      icon: '/pwa-192x192.png',
      tag: 'motido-daily-checkin',
    });

    return true;
  } catch {
    // API call failed — silently skip this notification
    return false;
  }
}

// --- Scheduler ---

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

function getLocalDateString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function shouldShowNotification(): boolean {
  if (!getNotificationEnabled()) return false;
  if (!isNotificationSupported() || Notification.permission !== 'granted') return false;

  const now = new Date();

  // Already shown today?
  if (getLastShownDate() === getLocalDateString(now)) return false;

  // Is it past the scheduled time?
  const scheduledTime = getNotificationTime(); // "HH:MM"
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = hours * 60 + minutes;

  return currentMinutes >= scheduledMinutes;
}

async function checkAndNotify(): Promise<void> {
  if (!shouldShowNotification()) return;

  const shown = await showDailyNotification();
  if (shown) {
    setLastShownDate(getLocalDateString());
  }
}

export function startNotificationScheduler(): void {
  // Clear any existing scheduler
  stopNotificationScheduler();

  // Check immediately on start
  checkAndNotify();

  // Then check periodically
  schedulerInterval = setInterval(checkAndNotify, CHECK_INTERVAL_MS);
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval !== null) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
