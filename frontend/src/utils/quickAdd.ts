/**
 * Quick-add parser for task input with inline modifiers.
 *
 * Supports:
 * - Priority: !trivial, !low, !medium, !high, !critical (or !1-5)
 * - Tags: #tagname (multiple allowed)
 * - Due date: @today, @tomorrow, @friday, @next-week, @dec-25
 * - Start date: ^today, ^tomorrow, ^friday, ^next-week, ^dec-25
 * - Project: ~projectname
 * - Recurrence: &daily, &weekly, &weekly-wed, &weekly-mon,wed,fri,
 *   &monthly, &yearly, &every-2-weeks
 *   - Optional style: &daily:strict, &weekly-wed:completion, &monthly:due
 * - Description: "quoted description text"
 *
 * Example: "Buy groceries !high #personal ^today @friday ~home &weekly"
 */

import { Priority, RecurrenceType } from '../types';
import type { Task } from '../types';
import { addDays, nextDay, parse, isValid } from 'date-fns';

/** Priority aliases for quick input */
const PRIORITY_MAP: Record<string, Priority> = {
  // Named priorities
  trivial: Priority.TRIVIAL,
  low: Priority.LOW,
  medium: Priority.MEDIUM,
  med: Priority.MEDIUM,
  high: Priority.HIGH,
  critical: Priority.DEFCON_ONE,
  defcon: Priority.DEFCON_ONE,
  urgent: Priority.DEFCON_ONE,
  // Numeric priorities (1=low, 5=critical)
  '1': Priority.TRIVIAL,
  '2': Priority.LOW,
  '3': Priority.MEDIUM,
  '4': Priority.HIGH,
  '5': Priority.DEFCON_ONE,
};

/** Day name to day index (0=Sunday) */
const DAY_MAP: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
};

/** Month name to month index (0-11) */
const MONTH_MAP: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

/** Simple recurrence keywords → rrule strings */
const RECURRENCE_MAP: Record<string, string> = {
  daily: 'FREQ=DAILY',
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  yearly: 'FREQ=YEARLY',
};

/** Weekday aliases for weekly quick-add recurrence syntax */
const RECURRENCE_WEEKDAY_MAP: Record<string, string> = {
  mo: 'MO',
  mon: 'MO',
  monday: 'MO',
  tu: 'TU',
  tue: 'TU',
  tuesday: 'TU',
  we: 'WE',
  wed: 'WE',
  wednesday: 'WE',
  th: 'TH',
  thu: 'TH',
  thursday: 'TH',
  fr: 'FR',
  fri: 'FR',
  friday: 'FR',
  sa: 'SA',
  sat: 'SA',
  saturday: 'SA',
  su: 'SU',
  sun: 'SU',
  sunday: 'SU',
};

/** Recurrence type aliases → RecurrenceType values */
const RECURRENCE_TYPE_MAP: Record<string, string> = {
  strict: RecurrenceType.STRICT,
  completion: RecurrenceType.FROM_COMPLETION,
  'from-completion': RecurrenceType.FROM_COMPLETION,
  due: RecurrenceType.FROM_DUE_DATE,
  'from-due': RecurrenceType.FROM_DUE_DATE,
};

/**
 * Parse a recurrence expression into an rrule string.
 * Supports:
 * - Simple keywords: daily, weekly, monthly, yearly
 * - Interval format: every-2-weeks, every-3-days
 *
 * @returns The rrule string, or null if not recognized
 */
export function parseRecurrenceExpression(expr: string): string | null {
  const lower = expr.toLowerCase();

  // Simple keyword
  if (RECURRENCE_MAP[lower]) {
    return RECURRENCE_MAP[lower];
  }

  // Weekly with explicit weekday list:
  // weekly-wed, weekly-mon,wed,fri, weekly-weekdays, weekly-weekends
  const weeklyByDayMatch = lower.match(/^weekly-(.+)$/);
  if (weeklyByDayMatch) {
    const byDay = parseWeeklyByDayExpression(weeklyByDayMatch[1]);
    if (byDay) {
      return `FREQ=WEEKLY;BYDAY=${byDay}`;
    }
  }

  // Every N weeks with explicit weekday list:
  // every-2-weeks-wed, every-2-weeks-mon,thu
  const everyWeeksByDayMatch = lower.match(/^every-(\d+)-weeks?-(.+)$/);
  if (everyWeeksByDayMatch) {
    const interval = parseInt(everyWeeksByDayMatch[1], 10);
    const byDay = parseWeeklyByDayExpression(everyWeeksByDayMatch[2]);
    if (byDay) {
      const intervalPart = interval > 1 ? `;INTERVAL=${interval}` : '';
      return `FREQ=WEEKLY${intervalPart};BYDAY=${byDay}`;
    }
  }

  // "every-N-unit(s)" format: every-2-weeks, every-3-days
  const everyMatch = lower.match(/^every-(\d+)-(day|week|month|year)s?$/);
  if (everyMatch) {
    const interval = parseInt(everyMatch[1], 10);
    const unitMap: Record<string, string> = {
      day: 'DAILY',
      week: 'WEEKLY',
      month: 'MONTHLY',
      year: 'YEARLY',
    };
    // Regex guarantees everyMatch[2] is one of the keys above
    const freq = unitMap[everyMatch[2]];
    return interval > 1 ? `FREQ=${freq};INTERVAL=${interval}` : `FREQ=${freq}`;
  }

  return null;
}

/**
 * Parse a weekly day expression into an RFC 5545 BYDAY list.
 */
function parseWeeklyByDayExpression(expr: string): string | null {
  if (expr === 'weekdays') {
    return 'MO,TU,WE,TH,FR';
  }

  if (expr === 'weekends') {
    return 'SA,SU';
  }

  const dayCodes = expr
    .split(',')
    .map((part) => RECURRENCE_WEEKDAY_MAP[part.trim()])
    .filter((part): part is string => Boolean(part));

  if (dayCodes.length === 0 || dayCodes.length !== expr.split(',').length) {
    return null;
  }

  return dayCodes.join(',');
}

/**
 * Parse a date expression into a Date object.
 * Supports:
 * - today, tomorrow
 * - Weekday names: monday, friday, etc.
 * - Relative: next-week
 * - Date formats: dec-25, jan-15, 12-25
 */
export function parseDateExpression(expr: string): Date | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lower = expr.toLowerCase().replace(/_/g, '-');

  // today/tomorrow
  if (lower === 'today') {
    return today;
  }
  if (lower === 'tomorrow') {
    return addDays(today, 1);
  }

  // next-week
  if (lower === 'next-week' || lower === 'nextweek') {
    return addDays(today, 7);
  }

  // Weekday names
  if (DAY_MAP[lower] !== undefined) {
    return nextDay(today, DAY_MAP[lower]);
  }

  // Month-day format: dec-25, jan-15
  const monthDayMatch = lower.match(/^([a-z]+)-(\d{1,2})$/);
  if (monthDayMatch) {
    const [, monthStr, dayStr] = monthDayMatch;
    const monthIndex = MONTH_MAP[monthStr];
    if (monthIndex !== undefined) {
      const day = parseInt(dayStr, 10);
      if (day >= 1 && day <= 31) {
        const year = today.getFullYear();
        const date = new Date(year, monthIndex, day);
        // If the date is in the past, use next year
        if (date < today) {
          date.setFullYear(year + 1);
        }
        return date;
      }
    }
  }

  // Numeric month-day: 12-25, 1-15
  const numericMatch = lower.match(/^(\d{1,2})-(\d{1,2})$/);
  if (numericMatch) {
    const [, monthStr, dayStr] = numericMatch;
    const month = parseInt(monthStr, 10) - 1; // Convert to 0-indexed
    const day = parseInt(dayStr, 10);
    if (month >= 0 && month <= 11 && day >= 1 && day <= 31) {
      const year = today.getFullYear();
      const date = new Date(year, month, day);
      if (date < today) {
        date.setFullYear(year + 1);
      }
      return date;
    }
  }

  // Try ISO format: 2024-12-25
  const isoDate = parse(lower, 'yyyy-MM-dd', new Date());
  if (isValid(isoDate)) {
    return isoDate;
  }

  return null;
}

/** Result of parsing quick-add input */
export interface QuickAddResult {
  /** Extracted title (text without modifiers) */
  title: string;
  /** Parsed priority, if specified */
  priority?: Priority;
  /** Extracted tags */
  tags: string[];
  /** Parsed due date, if specified */
  dueDate?: Date;
  /** Parsed start date, if specified */
  startDate?: Date;
  /** Extracted project name */
  project?: string;
  /** Recurrence rule (rrule string), if specified */
  recurrenceRule?: string;
  /** Recurrence type (Strict, From Completion, From Due Date) */
  recurrenceType?: string;
  /** Description text (from double-quoted string) */
  description?: string;
}

/**
 * Parse quick-add input string into task fields.
 *
 * @param input - Raw input string with inline modifiers
 * @returns Parsed result with extracted fields
 */
export function parseQuickAddInput(input: string): QuickAddResult {
  const result: QuickAddResult = {
    title: '',
    tags: [],
  };

  if (!input.trim()) {
    return result;
  }

  // Clone input for processing
  let remaining = input;

  // Extract description (double-quoted text) - must be done first to avoid
  // modifiers inside quotes being parsed
  const descMatch = remaining.match(/"([^"]+)"/);
  if (descMatch) {
    result.description = descMatch[1];
    remaining = remaining.replace(descMatch[0], ' ');
  }

  // Extract priority (!word or !number) - only remove if recognized
  const priorityMatch = remaining.match(/\s*!([\w]+)/);
  if (priorityMatch) {
    const priorityKey = priorityMatch[1].toLowerCase();
    if (PRIORITY_MAP[priorityKey]) {
      result.priority = PRIORITY_MAP[priorityKey];
      remaining = remaining.replace(priorityMatch[0], ' ');
    }
  }

  // Extract tags (#word) - multiple allowed
  const tagMatches = remaining.matchAll(/\s*#([\w-]+)/g);
  for (const tagMatch of tagMatches) {
    const tag = tagMatch[1].toLowerCase();
    if (!result.tags.includes(tag)) {
      result.tags.push(tag);
    }
  }
  remaining = remaining.replace(/\s*#[\w-]+/g, ' ');

  // Extract due date (@expression) - only remove if parsed successfully
  const dateMatch = remaining.match(/\s*@([\w-]+)/);
  if (dateMatch) {
    const dateExpr = dateMatch[1];
    const parsedDate = parseDateExpression(dateExpr);
    if (parsedDate) {
      result.dueDate = parsedDate;
      remaining = remaining.replace(dateMatch[0], ' ');
    }
  }

  // Extract start date (^expression) - only remove if parsed successfully
  const startDateMatch = remaining.match(/\s*\^([\w-]+)/);
  if (startDateMatch) {
    const startDateExpr = startDateMatch[1];
    const parsedStartDate = parseDateExpression(startDateExpr);
    if (parsedStartDate) {
      result.startDate = parsedStartDate;
      remaining = remaining.replace(startDateMatch[0], ' ');
    }
  }

  // Extract project (~word)
  const projectMatch = remaining.match(/\s*~([\w-]+)/);
  if (projectMatch) {
    result.project = projectMatch[1];
    remaining = remaining.replace(projectMatch[0], ' ');
  }

  // Extract recurrence (&expression, optional :type suffix)
  const recurrenceMatch = remaining.match(/\s*&([\w,-]+(?::[\w-]+)?)/);
  if (recurrenceMatch) {
    const fullExpr = recurrenceMatch[1];
    const colonIdx = fullExpr.indexOf(':');
    const recExpr = colonIdx >= 0 ? fullExpr.substring(0, colonIdx) : fullExpr;
    const typeExpr = colonIdx >= 0 ? fullExpr.substring(colonIdx + 1) : undefined;

    const rrule = parseRecurrenceExpression(recExpr);
    if (rrule) {
      result.recurrenceRule = rrule;
      if (typeExpr && RECURRENCE_TYPE_MAP[typeExpr.toLowerCase()]) {
        result.recurrenceType = RECURRENCE_TYPE_MAP[typeExpr.toLowerCase()];
      }
      remaining = remaining.replace(recurrenceMatch[0], ' ');
    }
  }

  // Clean up remaining text as title
  result.title = remaining.trim().replace(/\s+/g, ' ');

  return result;
}

/**
 * Convert QuickAddResult to a partial Task object.
 *
 * @param result - Parsed quick-add result
 * @returns Partial task suitable for creating a new task
 */
export function quickAddResultToTask(result: QuickAddResult): Partial<Task> {
  const task: Partial<Task> = {
    title: result.title,
    tags: result.tags,
  };

  if (result.priority) {
    task.priority = result.priority;
  }

  if (result.dueDate) {
    task.due_date = result.dueDate.toISOString();
  }

  if (result.startDate) {
    task.start_date = result.startDate.toISOString();
  }

  if (result.project) {
    task.project = result.project;
  }

  if (result.recurrenceRule) {
    task.recurrence_rule = result.recurrenceRule;
    task.is_habit = true;
    task.recurrence_type = (result.recurrenceType as Task['recurrence_type']) || RecurrenceType.STRICT;
  }

  if (result.description) {
    task.text_description = result.description;
  }

  return task;
}

/**
 * Parse bulk quick-add input (multiple lines, one task per line).
 * Empty lines and whitespace-only lines are skipped.
 *
 * @param input - Multi-line input string
 * @returns Array of parsed results (only those with valid titles)
 */
export function parseBulkQuickAddInput(input: string): QuickAddResult[] {
  return input
    .split('\n')
    .map((line) => parseQuickAddInput(line))
    .filter((result) => result.title.trim().length > 0);
}
