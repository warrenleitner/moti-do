/**
 * Tests for recurrence utility functions.
 */

import { describe, it, expect } from 'vitest';
import {
  patternToRrule,
  rruleToPattern,
  describePattern,
  validatePattern,
} from './recurrence';
import type { RecurrencePattern } from '../types/recurrence';

describe('patternToRrule', () => {
  it('converts simple daily pattern', () => {
    const pattern: RecurrencePattern = { frequency: 'DAILY', interval: 1 };
    expect(patternToRrule(pattern)).toBe('FREQ=DAILY');
  });

  it('converts daily with interval', () => {
    const pattern: RecurrencePattern = { frequency: 'DAILY', interval: 3 };
    expect(patternToRrule(pattern)).toBe('FREQ=DAILY;INTERVAL=3');
  });

  it('converts weekly with specific days', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'WE', 'FR'],
    };
    expect(patternToRrule(pattern)).toBe('FREQ=WEEKLY;BYDAY=MO,WE,FR');
  });

  it('converts bi-weekly with specific days', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 2,
      byDay: ['TU', 'TH'],
    };
    expect(patternToRrule(pattern)).toBe('FREQ=WEEKLY;INTERVAL=2;BYDAY=TU,TH');
  });

  it('converts monthly by day of month', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [1, 15],
    };
    expect(patternToRrule(pattern)).toBe('FREQ=MONTHLY;BYMONTHDAY=1,15');
  });

  it('converts monthly last day', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [-1],
    };
    expect(patternToRrule(pattern)).toBe('FREQ=MONTHLY;BYMONTHDAY=-1');
  });

  it('converts monthly by Nth weekday', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 2,
      byWeekday: 'TU',
    };
    expect(patternToRrule(pattern)).toBe('FREQ=MONTHLY;BYDAY=2TU');
  });

  it('converts monthly last Friday', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: -1,
      byWeekday: 'FR',
    };
    expect(patternToRrule(pattern)).toBe('FREQ=MONTHLY;BYDAY=-1FR');
  });

  it('converts yearly pattern', () => {
    const pattern: RecurrencePattern = { frequency: 'YEARLY', interval: 1 };
    expect(patternToRrule(pattern)).toBe('FREQ=YEARLY');
  });
});

describe('rruleToPattern', () => {
  it('parses simple "daily" keyword', () => {
    const pattern = rruleToPattern('daily');
    expect(pattern).toEqual({ frequency: 'DAILY', interval: 1 });
  });

  it('parses simple "weekly" keyword', () => {
    const pattern = rruleToPattern('weekly');
    expect(pattern).toEqual({ frequency: 'WEEKLY', interval: 1 });
  });

  it('parses simple "monthly" keyword', () => {
    const pattern = rruleToPattern('monthly');
    expect(pattern).toEqual({ frequency: 'MONTHLY', interval: 1 });
  });

  it('parses simple "yearly" keyword', () => {
    const pattern = rruleToPattern('yearly');
    expect(pattern).toEqual({ frequency: 'YEARLY', interval: 1 });
  });

  it('parses "every 3 days" format', () => {
    const pattern = rruleToPattern('every 3 days');
    expect(pattern).toEqual({ frequency: 'DAILY', interval: 3 });
  });

  it('parses "every 2 weeks" format', () => {
    const pattern = rruleToPattern('every 2 weeks');
    expect(pattern).toEqual({ frequency: 'WEEKLY', interval: 2 });
  });

  it('parses "every 1 month" format', () => {
    const pattern = rruleToPattern('every 1 month');
    expect(pattern).toEqual({ frequency: 'MONTHLY', interval: 1 });
  });

  it('parses rrule format with FREQ only', () => {
    const pattern = rruleToPattern('FREQ=DAILY');
    expect(pattern).toEqual({ frequency: 'DAILY', interval: 1 });
  });

  it('parses rrule format with interval', () => {
    const pattern = rruleToPattern('FREQ=WEEKLY;INTERVAL=2');
    expect(pattern).toEqual({ frequency: 'WEEKLY', interval: 2 });
  });

  it('parses rrule format with BYDAY', () => {
    const pattern = rruleToPattern('FREQ=WEEKLY;BYDAY=MO,WE,FR');
    expect(pattern).toEqual({
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'WE', 'FR'],
    });
  });

  it('parses rrule format with BYMONTHDAY', () => {
    const pattern = rruleToPattern('FREQ=MONTHLY;BYMONTHDAY=1,15,-1');
    expect(pattern).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      byMonthDay: [1, 15, -1],
      monthlyMode: 'day_of_month',
    });
  });

  it('parses rrule format with positional BYDAY (2nd Tuesday)', () => {
    const pattern = rruleToPattern('FREQ=MONTHLY;BYDAY=2TU');
    expect(pattern).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 2,
      byWeekday: 'TU',
    });
  });

  it('parses rrule format with last Friday', () => {
    const pattern = rruleToPattern('FREQ=MONTHLY;BYDAY=-1FR');
    expect(pattern).toEqual({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: -1,
      byWeekday: 'FR',
    });
  });

  it('returns null for empty string', () => {
    expect(rruleToPattern('')).toBeNull();
  });

  it('handles case insensitivity for keywords', () => {
    expect(rruleToPattern('DAILY')).toEqual({ frequency: 'DAILY', interval: 1 });
    expect(rruleToPattern('Daily')).toEqual({ frequency: 'DAILY', interval: 1 });
  });

  it('returns default pattern for invalid frequency value', () => {
    // Invalid frequency is ignored, returns default daily pattern
    expect(rruleToPattern('FREQ=INVALID')).toEqual({ frequency: 'DAILY', interval: 1 });
  });
});

describe('describePattern', () => {
  it('describes daily pattern', () => {
    expect(describePattern({ frequency: 'DAILY', interval: 1 })).toBe('Every day');
  });

  it('describes every 3 days', () => {
    expect(describePattern({ frequency: 'DAILY', interval: 3 })).toBe('Every 3 days');
  });

  it('describes weekly pattern', () => {
    expect(describePattern({ frequency: 'WEEKLY', interval: 1 })).toBe('Every week');
  });

  it('describes bi-weekly pattern', () => {
    expect(describePattern({ frequency: 'WEEKLY', interval: 2 })).toBe('Every 2 weeks');
  });

  it('describes weekly with specific days', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'WE', 'FR'],
    };
    expect(describePattern(pattern)).toBe('Every week on Mon, Wed, and Fri');
  });

  it('describes weekdays', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'TU', 'WE', 'TH', 'FR'],
    };
    expect(describePattern(pattern)).toBe('Every week on weekdays');
  });

  it('describes weekends', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['SA', 'SU'],
    };
    expect(describePattern(pattern)).toBe('Every week on weekends');
  });

  it('describes every day of week', () => {
    const pattern: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 1,
      byDay: ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'],
    };
    expect(describePattern(pattern)).toBe('Every week every day');
  });

  it('describes monthly by day of month', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [1],
    };
    expect(describePattern(pattern)).toBe('Every month on the 1st');
  });

  it('describes monthly last day', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [-1],
    };
    expect(describePattern(pattern)).toBe('Every month on the last day');
  });

  it('describes monthly multiple days', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [1, 15],
    };
    expect(describePattern(pattern)).toBe('Every month on the 1st and 15th');
  });

  it('describes monthly on the 2nd day', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [2],
    };
    expect(describePattern(pattern)).toBe('Every month on the 2nd');
  });

  it('describes monthly on the 3rd day', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [3],
    };
    expect(describePattern(pattern)).toBe('Every month on the 3rd');
  });

  it('describes monthly Nth weekday', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 2,
      byWeekday: 'TU',
    };
    expect(describePattern(pattern)).toBe('Every month on the 2nd Tuesday');
  });

  it('describes monthly 3rd weekday', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 3,
      byWeekday: 'WE',
    };
    expect(describePattern(pattern)).toBe('Every month on the 3rd Wednesday');
  });

  it('describes monthly last Friday', () => {
    const pattern: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: -1,
      byWeekday: 'FR',
    };
    expect(describePattern(pattern)).toBe('Every month on the last Friday');
  });

  it('describes yearly pattern', () => {
    expect(describePattern({ frequency: 'YEARLY', interval: 1 })).toBe('Every year');
  });

  it('describes every 2 years', () => {
    expect(describePattern({ frequency: 'YEARLY', interval: 2 })).toBe('Every 2 years');
  });
});

describe('validatePattern', () => {
  it('returns no errors for valid daily pattern', () => {
    expect(validatePattern({ frequency: 'DAILY', interval: 1 })).toEqual([]);
  });

  it('returns error for interval less than 1', () => {
    const errors = validatePattern({ frequency: 'DAILY', interval: 0 });
    expect(errors).toContain('Interval must be at least 1');
  });

  it('returns error for interval greater than 365', () => {
    const errors = validatePattern({ frequency: 'DAILY', interval: 400 });
    expect(errors).toContain('Interval cannot exceed 365');
  });

  it('returns error for weekly with empty byDay', () => {
    const errors = validatePattern({ frequency: 'WEEKLY', interval: 1, byDay: [] });
    expect(errors).toContain('Please select at least one day of the week');
  });

  it('returns no error for weekly without byDay specified', () => {
    const errors = validatePattern({ frequency: 'WEEKLY', interval: 1 });
    expect(errors).toEqual([]);
  });

  it('returns error for monthly day_of_month mode with no days', () => {
    const errors = validatePattern({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [],
    });
    expect(errors).toContain('Please select at least one day of the month');
  });

  it('returns error for monthly weekday_of_month mode without position', () => {
    const errors = validatePattern({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      byWeekday: 'TU',
    });
    expect(errors).toContain('Please select which weekday of the month');
  });

  it('returns error for monthly weekday_of_month mode without weekday', () => {
    const errors = validatePattern({
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 2,
    });
    expect(errors).toContain('Please select which weekday of the month');
  });
});

describe('roundtrip conversion', () => {
  it('preserves daily pattern through roundtrip', () => {
    const original: RecurrencePattern = { frequency: 'DAILY', interval: 3 };
    const rrule = patternToRrule(original);
    const parsed = rruleToPattern(rrule);
    expect(parsed).toEqual(original);
  });

  it('preserves weekly pattern through roundtrip', () => {
    const original: RecurrencePattern = {
      frequency: 'WEEKLY',
      interval: 2,
      byDay: ['MO', 'WE', 'FR'],
    };
    const rrule = patternToRrule(original);
    const parsed = rruleToPattern(rrule);
    expect(parsed?.frequency).toBe(original.frequency);
    expect(parsed?.interval).toBe(original.interval);
    expect(parsed?.byDay).toEqual(original.byDay);
  });

  it('preserves monthly day pattern through roundtrip', () => {
    const original: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'day_of_month',
      byMonthDay: [1, 15, -1],
    };
    const rrule = patternToRrule(original);
    const parsed = rruleToPattern(rrule);
    expect(parsed?.frequency).toBe(original.frequency);
    expect(parsed?.byMonthDay).toEqual(original.byMonthDay);
    expect(parsed?.monthlyMode).toBe('day_of_month');
  });

  it('preserves monthly weekday pattern through roundtrip', () => {
    const original: RecurrencePattern = {
      frequency: 'MONTHLY',
      interval: 1,
      monthlyMode: 'weekday_of_month',
      bySetPos: 2,
      byWeekday: 'TU',
    };
    const rrule = patternToRrule(original);
    const parsed = rruleToPattern(rrule);
    expect(parsed?.frequency).toBe(original.frequency);
    expect(parsed?.monthlyMode).toBe('weekday_of_month');
    expect(parsed?.bySetPos).toBe(original.bySetPos);
    expect(parsed?.byWeekday).toBe(original.byWeekday);
  });
});
