/**
 * Utility functions for converting between RecurrencePattern and rrule strings.
 */

import type {
  RecurrencePattern,
  Frequency,
  Weekday,
  WeekdayPosition,
} from '../types/recurrence';
import {
  WEEKDAY_LABELS,
  WEEKDAY_FULL_NAMES,
  FREQUENCY_LABELS,
  FREQUENCY_LABELS_PLURAL,
  POSITION_LABELS,
  WEEKDAYS,
} from '../types/recurrence';

/**
 * Converts a RecurrencePattern to an rrule string.
 *
 * @example
 * patternToRrule({ frequency: 'WEEKLY', interval: 1, byDay: ['MO', 'WE', 'FR'] })
 * // Returns: "FREQ=WEEKLY;BYDAY=MO,WE,FR"
 */
export function patternToRrule(pattern: RecurrencePattern): string {
  const parts: string[] = [`FREQ=${pattern.frequency}`];

  // Add interval if not 1
  if (pattern.interval > 1) {
    parts.push(`INTERVAL=${pattern.interval}`);
  }

  // Weekly: add days of week
  if (pattern.frequency === 'WEEKLY' && pattern.byDay && pattern.byDay.length > 0) {
    parts.push(`BYDAY=${pattern.byDay.join(',')}`);
  }

  // Monthly: day of month or Nth weekday
  if (pattern.frequency === 'MONTHLY') {
    if (pattern.monthlyMode === 'weekday_of_month' && pattern.bySetPos && pattern.byWeekday) {
      // Nth weekday of month (e.g., "2nd Tuesday")
      parts.push(`BYDAY=${pattern.bySetPos}${pattern.byWeekday}`);
    } else if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
      // Specific days of month (e.g., 1, 15, -1 for last day)
      parts.push(`BYMONTHDAY=${pattern.byMonthDay.join(',')}`);
    }
  }

  return parts.join(';');
}

/**
 * Parses an rrule string into a RecurrencePattern.
 * Returns null if the rule cannot be parsed.
 *
 * @example
 * rruleToPattern("FREQ=WEEKLY;BYDAY=MO,WE,FR")
 * // Returns: { frequency: 'WEEKLY', interval: 1, byDay: ['MO', 'WE', 'FR'] }
 */
export function rruleToPattern(rule: string): RecurrencePattern | null {
  if (!rule) return null;

  // Handle simple keywords first
  const lowerRule = rule.toLowerCase().trim();
  const simpleMap: Record<string, RecurrencePattern> = {
    daily: { frequency: 'DAILY', interval: 1 },
    weekly: { frequency: 'WEEKLY', interval: 1 },
    monthly: { frequency: 'MONTHLY', interval: 1 },
    yearly: { frequency: 'YEARLY', interval: 1 },
  };

  if (simpleMap[lowerRule]) {
    return simpleMap[lowerRule];
  }

  // Handle "every N units" format
  const everyMatch = lowerRule.match(/^every\s+(\d+)\s+(day|week|month|year)s?$/);
  if (everyMatch) {
    const interval = parseInt(everyMatch[1], 10);
    const unitMap: Record<string, Frequency> = {
      day: 'DAILY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      year: 'YEARLY',
    };
    return { frequency: unitMap[everyMatch[2]], interval };
  }

  // Parse rrule format
  try {
    const parts = rule.split(';');
    const pattern: RecurrencePattern = {
      frequency: 'DAILY',
      interval: 1,
    };

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (!key || !value) continue;

      switch (key.toUpperCase()) {
        case 'FREQ':
          if (isValidFrequency(value.toUpperCase())) {
            pattern.frequency = value.toUpperCase() as Frequency;
          }
          break;

        case 'INTERVAL':
          pattern.interval = parseInt(value, 10) || 1;
          break;

        case 'BYDAY': {
          // Check if it's positional (e.g., "2TU" for 2nd Tuesday)
          const positionalMatch = value.match(/^(-?\d)([A-Z]{2})$/);
          if (positionalMatch) {
            pattern.monthlyMode = 'weekday_of_month';
            pattern.bySetPos = parseInt(positionalMatch[1], 10) as WeekdayPosition;
            pattern.byWeekday = positionalMatch[2] as Weekday;
          } else {
            // Regular weekday list
            const days = value.split(',').filter((d) => isValidWeekday(d)) as Weekday[];
            if (days.length > 0) {
              pattern.byDay = days;
            }
          }
          break;
        }

        case 'BYMONTHDAY': {
          const days = value
            .split(',')
            .map((d) => parseInt(d, 10))
            .filter((d) => !isNaN(d) && d >= -31 && d <= 31 && d !== 0);
          if (days.length > 0) {
            pattern.byMonthDay = days;
            pattern.monthlyMode = 'day_of_month';
          }
          break;
        }
      }
    }

    return pattern;
  } catch {
    return null;
  }
}

/**
 * Generates a human-readable description of a recurrence pattern.
 *
 * @example
 * describePattern({ frequency: 'WEEKLY', interval: 2, byDay: ['MO', 'WE'] })
 * // Returns: "Every 2 weeks on Mon, Wed"
 */
export function describePattern(pattern: RecurrencePattern): string {
  const parts: string[] = [];

  // Frequency and interval
  if (pattern.interval === 1) {
    parts.push(`Every ${FREQUENCY_LABELS[pattern.frequency].toLowerCase()}`);
  } else {
    parts.push(`Every ${pattern.interval} ${FREQUENCY_LABELS_PLURAL[pattern.frequency].toLowerCase()}`);
  }

  // Weekly: days of week
  if (pattern.frequency === 'WEEKLY' && pattern.byDay && pattern.byDay.length > 0) {
    if (pattern.byDay.length === 7) {
      parts.push('every day');
    } else if (pattern.byDay.length === 5 && !pattern.byDay.includes('SA') && !pattern.byDay.includes('SU')) {
      parts.push('on weekdays');
    } else if (pattern.byDay.length === 2 && pattern.byDay.includes('SA') && pattern.byDay.includes('SU')) {
      parts.push('on weekends');
    } else {
      const dayNames = pattern.byDay.map((d) => WEEKDAY_LABELS[d]);
      parts.push(`on ${formatList(dayNames)}`);
    }
  }

  // Monthly
  if (pattern.frequency === 'MONTHLY') {
    if (pattern.monthlyMode === 'weekday_of_month' && pattern.bySetPos && pattern.byWeekday) {
      const posLabel = POSITION_LABELS[pattern.bySetPos];
      const dayName = WEEKDAY_FULL_NAMES[pattern.byWeekday];
      parts.push(`on the ${posLabel.toLowerCase()} ${dayName}`);
    } else if (pattern.byMonthDay && pattern.byMonthDay.length > 0) {
      const dayDescriptions = pattern.byMonthDay.map((d) => {
        if (d === -1) return 'last day';
        return `${d}${getOrdinalSuffix(d)}`;
      });
      parts.push(`on the ${formatList(dayDescriptions)}`);
    }
  }

  return parts.join(' ');
}

/**
 * Checks if a string is a valid frequency.
 */
function isValidFrequency(value: string): value is Frequency {
  return ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(value);
}

/**
 * Checks if a string is a valid weekday.
 */
function isValidWeekday(value: string): value is Weekday {
  return WEEKDAYS.includes(value as Weekday);
}

/**
 * Gets the ordinal suffix for a number (st, nd, rd, th).
 */
function getOrdinalSuffix(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 11 && abs <= 13) return 'th';
  switch (abs % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
}

/**
 * Formats a list of items with commas and "and".
 */
function formatList(items: string[]): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Validates a recurrence pattern and returns any validation errors.
 */
export function validatePattern(pattern: RecurrencePattern): string[] {
  const errors: string[] = [];

  if (pattern.interval < 1) {
    errors.push('Interval must be at least 1');
  }

  if (pattern.interval > 365) {
    errors.push('Interval cannot exceed 365');
  }

  if (pattern.frequency === 'WEEKLY' && pattern.byDay && pattern.byDay.length === 0) {
    errors.push('Please select at least one day of the week');
  }

  if (pattern.frequency === 'MONTHLY') {
    if (pattern.monthlyMode === 'day_of_month' && (!pattern.byMonthDay || pattern.byMonthDay.length === 0)) {
      errors.push('Please select at least one day of the month');
    }
    if (pattern.monthlyMode === 'weekday_of_month' && (!pattern.bySetPos || !pattern.byWeekday)) {
      errors.push('Please select which weekday of the month');
    }
  }

  return errors;
}
