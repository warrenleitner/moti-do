/**
 * Types for complex recurrence patterns.
 * These map to RFC 5545 (iCalendar) rrule format.
 */

export type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type Weekday = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type WeekdayPosition = 1 | 2 | 3 | 4 | -1; // 1st, 2nd, 3rd, 4th, or last

export type MonthlyMode = 'day_of_month' | 'weekday_of_month';

/**
 * Represents a recurrence pattern that can be converted to/from rrule format.
 */
export interface RecurrencePattern {
  /** The frequency of recurrence (DAILY, WEEKLY, MONTHLY, YEARLY) */
  frequency: Frequency;

  /** Interval between occurrences (e.g., 2 for "every 2 weeks") */
  interval: number;

  /** Days of the week for weekly recurrence (e.g., ['MO', 'WE', 'FR']) */
  byDay?: Weekday[];

  /** Days of the month for monthly recurrence (e.g., [1, 15, -1 for last day]) */
  byMonthDay?: number[];

  /** Position for "Nth weekday" patterns (e.g., 2 for "2nd Tuesday") */
  bySetPos?: WeekdayPosition;

  /** Single weekday for "Nth weekday of month" patterns */
  byWeekday?: Weekday;

  /** Mode for monthly recurrence: by day of month or by weekday */
  monthlyMode?: MonthlyMode;
}

/**
 * Labels for weekdays used in the UI.
 */
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MO: 'Mon',
  TU: 'Tue',
  WE: 'Wed',
  TH: 'Thu',
  FR: 'Fri',
  SA: 'Sat',
  SU: 'Sun',
};

/**
 * Full weekday names for accessibility.
 */
export const WEEKDAY_FULL_NAMES: Record<Weekday, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
};

/**
 * All weekdays in order (Monday first).
 */
export const WEEKDAYS: Weekday[] = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

/**
 * Labels for weekday positions.
 */
export const POSITION_LABELS: Record<WeekdayPosition, string> = {
  1: '1st',
  2: '2nd',
  3: '3rd',
  4: '4th',
  '-1': 'Last',
};

/**
 * Labels for frequency options.
 */
export const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: 'Day',
  WEEKLY: 'Week',
  MONTHLY: 'Month',
  YEARLY: 'Year',
};

/**
 * Plural labels for frequency options.
 */
export const FREQUENCY_LABELS_PLURAL: Record<Frequency, string> = {
  DAILY: 'Days',
  WEEKLY: 'Weeks',
  MONTHLY: 'Months',
  YEARLY: 'Years',
};

/**
 * Default recurrence pattern for a new habit.
 */
export const DEFAULT_RECURRENCE_PATTERN: RecurrencePattern = {
  frequency: 'DAILY',
  interval: 1,
};
