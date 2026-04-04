/**
 * Tests for quick-add parser utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseQuickAddInput,
  parseDateExpression,
  parseRecurrenceExpression,
  quickAddResultToTask,
  parseBulkQuickAddInput,
} from './quickAdd';
import { Priority, RecurrenceType } from '../types';

describe('parseDateExpression', () => {
  beforeEach(() => {
    // Mock current date to 2024-12-24 (Tuesday)
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 24, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('parses "today"', () => {
    const result = parseDateExpression('today');
    expect(result).toEqual(new Date(2024, 11, 24));
  });

  it('parses "tomorrow"', () => {
    const result = parseDateExpression('tomorrow');
    expect(result).toEqual(new Date(2024, 11, 25));
  });

  it('parses "next-week"', () => {
    const result = parseDateExpression('next-week');
    expect(result).toEqual(new Date(2024, 11, 31));
  });

  it('parses weekday names (friday)', () => {
    const result = parseDateExpression('friday');
    expect(result).toEqual(new Date(2024, 11, 27)); // Next Friday
  });

  it('parses abbreviated weekday (fri)', () => {
    const result = parseDateExpression('fri');
    expect(result).toEqual(new Date(2024, 11, 27));
  });

  it('parses month-day format (dec-25)', () => {
    const result = parseDateExpression('dec-25');
    expect(result).toEqual(new Date(2024, 11, 25));
  });

  it('parses month-day format with full month name (january-15)', () => {
    const result = parseDateExpression('january-15');
    expect(result).toEqual(new Date(2025, 0, 15)); // Next year since Jan 15 is past
  });

  it('parses numeric month-day (12-25)', () => {
    const result = parseDateExpression('12-25');
    expect(result).toEqual(new Date(2024, 11, 25));
  });

  it('returns null for invalid expression', () => {
    expect(parseDateExpression('invalid')).toBeNull();
  });

  it('rolls over to next year for past dates', () => {
    // Dec 20 is already past (we're on Dec 24)
    const result = parseDateExpression('dec-20');
    expect(result).toEqual(new Date(2025, 11, 20));
  });

  it('rolls over numeric month-day to next year for past dates', () => {
    // 12-20 is already past (we're on Dec 24)
    const result = parseDateExpression('12-20');
    expect(result).toEqual(new Date(2025, 11, 20));
  });

  it('parses ISO date format (yyyy-MM-dd)', () => {
    const result = parseDateExpression('2025-01-15');
    expect(result).toEqual(new Date(2025, 0, 15));
  });

  it('returns null for invalid month name', () => {
    // xyz is not a valid month name
    expect(parseDateExpression('xyz-25')).toBeNull();
  });

  it('returns null for invalid day in month-day format', () => {
    // Day 0 is invalid
    expect(parseDateExpression('dec-0')).toBeNull();
    // Day 32 is invalid
    expect(parseDateExpression('dec-32')).toBeNull();
  });

  it('returns null for invalid numeric month', () => {
    // Month 0 and 13 are invalid
    expect(parseDateExpression('0-15')).toBeNull();
    expect(parseDateExpression('13-15')).toBeNull();
  });

  it('returns null for invalid day in numeric format', () => {
    // Day 0 and 32 are invalid
    expect(parseDateExpression('12-0')).toBeNull();
    expect(parseDateExpression('12-32')).toBeNull();
  });
});

describe('parseQuickAddInput', () => {
  describe('title extraction', () => {
    it('extracts plain title', () => {
      const result = parseQuickAddInput('Buy groceries');
      expect(result.title).toBe('Buy groceries');
      expect(result.tags).toEqual([]);
    });

    it('returns empty title for empty input', () => {
      const result = parseQuickAddInput('');
      expect(result.title).toBe('');
    });

    it('trims whitespace', () => {
      const result = parseQuickAddInput('  Buy groceries  ');
      expect(result.title).toBe('Buy groceries');
    });

    it('normalizes internal whitespace', () => {
      const result = parseQuickAddInput('Buy   some   groceries');
      expect(result.title).toBe('Buy some groceries');
    });
  });

  describe('priority parsing', () => {
    it('parses !high priority', () => {
      const result = parseQuickAddInput('Task !high');
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.title).toBe('Task');
    });

    it('parses !low priority', () => {
      const result = parseQuickAddInput('Task !low');
      expect(result.priority).toBe(Priority.LOW);
    });

    it('parses !medium priority', () => {
      const result = parseQuickAddInput('Task !medium');
      expect(result.priority).toBe(Priority.MEDIUM);
    });

    it('parses !med as medium', () => {
      const result = parseQuickAddInput('Task !med');
      expect(result.priority).toBe(Priority.MEDIUM);
    });

    it('parses !critical as defcon one', () => {
      const result = parseQuickAddInput('Task !critical');
      expect(result.priority).toBe(Priority.DEFCON_ONE);
    });

    it('parses !urgent as defcon one', () => {
      const result = parseQuickAddInput('Task !urgent');
      expect(result.priority).toBe(Priority.DEFCON_ONE);
    });

    it('parses numeric priority !1', () => {
      const result = parseQuickAddInput('Task !1');
      expect(result.priority).toBe(Priority.TRIVIAL);
    });

    it('parses numeric priority !5', () => {
      const result = parseQuickAddInput('Task !5');
      expect(result.priority).toBe(Priority.DEFCON_ONE);
    });

    it('handles priority at start of input', () => {
      const result = parseQuickAddInput('!high Task');
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.title).toBe('Task');
    });

    it('handles priority in middle of input', () => {
      const result = parseQuickAddInput('Buy !high groceries');
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.title).toBe('Buy groceries');
    });

    it('ignores unknown priority', () => {
      const result = parseQuickAddInput('Task !unknown');
      expect(result.priority).toBeUndefined();
      expect(result.title).toBe('Task !unknown');
    });
  });

  describe('tag parsing', () => {
    it('parses single tag', () => {
      const result = parseQuickAddInput('Task #personal');
      expect(result.tags).toEqual(['personal']);
      expect(result.title).toBe('Task');
    });

    it('parses multiple tags', () => {
      const result = parseQuickAddInput('Task #personal #work #urgent');
      expect(result.tags).toEqual(['personal', 'work', 'urgent']);
    });

    it('handles tags with hyphens', () => {
      const result = parseQuickAddInput('Task #side-project');
      expect(result.tags).toEqual(['side-project']);
    });

    it('deduplicates tags', () => {
      const result = parseQuickAddInput('Task #work #work');
      expect(result.tags).toEqual(['work']);
    });

    it('lowercases tags', () => {
      const result = parseQuickAddInput('Task #WORK');
      expect(result.tags).toEqual(['work']);
    });

    it('handles tag at start of input', () => {
      const result = parseQuickAddInput('#work Task');
      expect(result.tags).toEqual(['work']);
      expect(result.title).toBe('Task');
    });
  });

  describe('due date parsing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 24, 10, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('parses @tomorrow', () => {
      const result = parseQuickAddInput('Task @tomorrow');
      expect(result.dueDate).toEqual(new Date(2024, 11, 25));
      expect(result.title).toBe('Task');
    });

    it('parses @friday', () => {
      const result = parseQuickAddInput('Task @friday');
      expect(result.dueDate).toEqual(new Date(2024, 11, 27));
    });

    it('parses @dec-25', () => {
      const result = parseQuickAddInput('Task @dec-25');
      expect(result.dueDate).toEqual(new Date(2024, 11, 25));
    });

    it('parses @next-week', () => {
      const result = parseQuickAddInput('Task @next-week');
      expect(result.dueDate).toEqual(new Date(2024, 11, 31));
    });

    it('ignores invalid date expression', () => {
      const result = parseQuickAddInput('Task @invalid');
      expect(result.dueDate).toBeUndefined();
      expect(result.title).toBe('Task @invalid');
    });
  });

  describe('project parsing', () => {
    it('parses project with ~', () => {
      const result = parseQuickAddInput('Task ~home');
      expect(result.project).toBe('home');
      expect(result.title).toBe('Task');
    });

    it('handles project with hyphen', () => {
      const result = parseQuickAddInput('Task ~side-project');
      expect(result.project).toBe('side-project');
    });

    it('handles project at start', () => {
      const result = parseQuickAddInput('~work Task');
      expect(result.project).toBe('work');
      expect(result.title).toBe('Task');
    });
  });

  describe('combined modifiers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2024, 11, 24, 10, 0, 0));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('parses all modifiers together', () => {
      const result = parseQuickAddInput('Buy groceries !high #personal @friday ~home');
      expect(result.title).toBe('Buy groceries');
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.tags).toEqual(['personal']);
      expect(result.dueDate).toEqual(new Date(2024, 11, 27));
      expect(result.project).toBe('home');
    });

    it('handles modifiers in any order', () => {
      const result = parseQuickAddInput('#work ~office !high @tomorrow Task');
      expect(result.title).toBe('Task');
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.tags).toEqual(['work']);
      expect(result.project).toBe('office');
      expect(result.dueDate).toEqual(new Date(2024, 11, 25));
    });

    it('handles modifiers interspersed in title', () => {
      const result = parseQuickAddInput('Buy #grocery stuff !high for ~home');
      expect(result.title).toBe('Buy stuff for');
      expect(result.tags).toEqual(['grocery']);
      expect(result.priority).toBe(Priority.HIGH);
      expect(result.project).toBe('home');
    });
  });
});

describe('quickAddResultToTask', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 11, 24, 10, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('converts basic result to task', () => {
    const result = parseQuickAddInput('Buy groceries');
    const task = quickAddResultToTask(result);

    expect(task.title).toBe('Buy groceries');
    expect(task.tags).toEqual([]);
    expect(task.priority).toBeUndefined();
    expect(task.due_date).toBeUndefined();
    expect(task.project).toBeUndefined();
  });

  it('converts full result to task', () => {
    const result = parseQuickAddInput('Buy groceries !high #personal @friday ~home');
    const task = quickAddResultToTask(result);

    expect(task.title).toBe('Buy groceries');
    expect(task.priority).toBe(Priority.HIGH);
    expect(task.tags).toEqual(['personal']);
    expect(task.due_date).toBe(new Date(2024, 11, 27).toISOString());
    expect(task.project).toBe('home');
  });

  it('converts recurrence result to task with is_habit and recurrence_type', () => {
    const result = parseQuickAddInput('Morning run &daily:strict');
    const task = quickAddResultToTask(result);

    expect(task.title).toBe('Morning run');
    expect(task.recurrence_rule).toBe('FREQ=DAILY');
    expect(task.recurrence_type).toBe(RecurrenceType.STRICT);
    expect(task.is_habit).toBe(true);
  });

  it('defaults recurrence type to Strict when not specified', () => {
    const result = parseQuickAddInput('Exercise &weekly');
    const task = quickAddResultToTask(result);

    expect(task.recurrence_rule).toBe('FREQ=WEEKLY');
    expect(task.recurrence_type).toBe(RecurrenceType.STRICT);
    expect(task.is_habit).toBe(true);
  });

  it('converts description result to task with text_description', () => {
    const result = parseQuickAddInput('Task "some details here"');
    const task = quickAddResultToTask(result);

    expect(task.title).toBe('Task');
    expect(task.text_description).toBe('some details here');
  });
});

describe('parseRecurrenceExpression', () => {
  it('parses daily', () => {
    expect(parseRecurrenceExpression('daily')).toBe('FREQ=DAILY');
  });

  it('parses weekly', () => {
    expect(parseRecurrenceExpression('weekly')).toBe('FREQ=WEEKLY');
  });

  it('parses weekly with a single weekday', () => {
    expect(parseRecurrenceExpression('weekly-wed')).toBe('FREQ=WEEKLY;BYDAY=WE');
  });

  it('parses weekly with multiple weekdays', () => {
    expect(parseRecurrenceExpression('weekly-mon,wed,fri')).toBe(
      'FREQ=WEEKLY;BYDAY=MO,WE,FR'
    );
  });

  it('parses weekly weekdays shorthand', () => {
    expect(parseRecurrenceExpression('weekly-weekdays')).toBe(
      'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR'
    );
  });

  it('parses weekly weekends shorthand', () => {
    expect(parseRecurrenceExpression('weekly-weekends')).toBe(
      'FREQ=WEEKLY;BYDAY=SA,SU'
    );
  });

  it('parses every-2-weeks with weekdays', () => {
    expect(parseRecurrenceExpression('every-2-weeks-mon,thu')).toBe(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,TH'
    );
  });

  it('parses every-1-week with weekdays without interval', () => {
    expect(parseRecurrenceExpression('every-1-week-wed')).toBe(
      'FREQ=WEEKLY;BYDAY=WE'
    );
  });

  it('parses monthly', () => {
    expect(parseRecurrenceExpression('monthly')).toBe('FREQ=MONTHLY');
  });

  it('parses yearly', () => {
    expect(parseRecurrenceExpression('yearly')).toBe('FREQ=YEARLY');
  });

  it('parses every-2-weeks', () => {
    expect(parseRecurrenceExpression('every-2-weeks')).toBe('FREQ=WEEKLY;INTERVAL=2');
  });

  it('parses every-3-days', () => {
    expect(parseRecurrenceExpression('every-3-days')).toBe('FREQ=DAILY;INTERVAL=3');
  });

  it('parses every-6-months', () => {
    expect(parseRecurrenceExpression('every-6-months')).toBe('FREQ=MONTHLY;INTERVAL=6');
  });

  it('parses every-1-week as simple FREQ without INTERVAL', () => {
    expect(parseRecurrenceExpression('every-1-week')).toBe('FREQ=WEEKLY');
  });

  it('returns null for invalid expression', () => {
    expect(parseRecurrenceExpression('invalid')).toBeNull();
  });

  it('returns null for invalid weekly weekday expression', () => {
    expect(parseRecurrenceExpression('weekly-funday')).toBeNull();
  });

  it('returns null for invalid every-n-weeks weekday expression', () => {
    expect(parseRecurrenceExpression('every-2-weeks-funday')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(parseRecurrenceExpression('DAILY')).toBe('FREQ=DAILY');
  });
});

describe('parseQuickAddInput - recurrence', () => {
  it('parses &daily recurrence', () => {
    const result = parseQuickAddInput('Task &daily');
    expect(result.recurrenceRule).toBe('FREQ=DAILY');
    expect(result.title).toBe('Task');
  });

  it('parses &weekly recurrence', () => {
    const result = parseQuickAddInput('Task &weekly');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY');
  });

  it('parses weekday-qualified weekly recurrence', () => {
    const result = parseQuickAddInput('Dermaroll &weekly-wed:completion');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=WE');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_COMPLETION);
    expect(result.title).toBe('Dermaroll');
  });

  it('parses multi-day weekly recurrence', () => {
    const result = parseQuickAddInput(
      'Time Tracking &weekly-mon,tue,wed,thu,fri:completion'
    );
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_COMPLETION);
    expect(result.title).toBe('Time Tracking');
  });

  it('parses weekly weekdays shorthand recurrence', () => {
    const result = parseQuickAddInput('Time Tracking &weekly-weekdays:completion');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_COMPLETION);
  });

  it('parses &every-2-weeks recurrence', () => {
    const result = parseQuickAddInput('Task &every-2-weeks');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY;INTERVAL=2');
    expect(result.title).toBe('Task');
  });

  it('parses recurrence with strict type', () => {
    const result = parseQuickAddInput('Task &daily:strict');
    expect(result.recurrenceRule).toBe('FREQ=DAILY');
    expect(result.recurrenceType).toBe(RecurrenceType.STRICT);
  });

  it('parses recurrence with completion type', () => {
    const result = parseQuickAddInput('Task &weekly:completion');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_COMPLETION);
  });

  it('parses recurrence with from-completion type', () => {
    const result = parseQuickAddInput('Task &monthly:from-completion');
    expect(result.recurrenceRule).toBe('FREQ=MONTHLY');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_COMPLETION);
  });

  it('parses recurrence with due type', () => {
    const result = parseQuickAddInput('Task &weekly:due');
    expect(result.recurrenceRule).toBe('FREQ=WEEKLY');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_DUE_DATE);
  });

  it('parses recurrence with from-due type', () => {
    const result = parseQuickAddInput('Task &monthly:from-due');
    expect(result.recurrenceRule).toBe('FREQ=MONTHLY');
    expect(result.recurrenceType).toBe(RecurrenceType.FROM_DUE_DATE);
  });

  it('ignores invalid recurrence type', () => {
    const result = parseQuickAddInput('Task &daily:unknown');
    expect(result.recurrenceRule).toBe('FREQ=DAILY');
    expect(result.recurrenceType).toBeUndefined();
  });

  it('ignores invalid recurrence expression', () => {
    const result = parseQuickAddInput('Task &invalid');
    expect(result.recurrenceRule).toBeUndefined();
    expect(result.title).toBe('Task &invalid');
  });

  it('handles recurrence at start of input', () => {
    const result = parseQuickAddInput('&daily Task');
    expect(result.recurrenceRule).toBe('FREQ=DAILY');
    expect(result.title).toBe('Task');
  });

  it('combines recurrence with other modifiers', () => {
    const result = parseQuickAddInput('Morning run !high #fitness &daily:strict ~health');
    expect(result.title).toBe('Morning run');
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.tags).toEqual(['fitness']);
    expect(result.recurrenceRule).toBe('FREQ=DAILY');
    expect(result.recurrenceType).toBe(RecurrenceType.STRICT);
    expect(result.project).toBe('health');
  });
});

describe('parseQuickAddInput - description', () => {
  it('parses quoted description', () => {
    const result = parseQuickAddInput('Task "This is a description"');
    expect(result.description).toBe('This is a description');
    expect(result.title).toBe('Task');
  });

  it('parses description with modifiers', () => {
    const result = parseQuickAddInput('Task !high "Important details" #work');
    expect(result.description).toBe('Important details');
    expect(result.title).toBe('Task');
    expect(result.priority).toBe(Priority.HIGH);
    expect(result.tags).toEqual(['work']);
  });

  it('preserves modifiers inside quoted description', () => {
    const result = parseQuickAddInput('Task "Use !high and #tags inside"');
    expect(result.description).toBe('Use !high and #tags inside');
    expect(result.title).toBe('Task');
    expect(result.priority).toBeUndefined();
    expect(result.tags).toEqual([]);
  });

  it('handles description at start of input', () => {
    const result = parseQuickAddInput('"A description" Task');
    expect(result.description).toBe('A description');
    expect(result.title).toBe('Task');
  });

  it('does not parse empty quotes', () => {
    const result = parseQuickAddInput('Task ""');
    expect(result.description).toBeUndefined();
    expect(result.title).toBe('Task ""');
  });

  it('does not parse unclosed quotes', () => {
    const result = parseQuickAddInput('Task "unclosed');
    expect(result.description).toBeUndefined();
    expect(result.title).toBe('Task "unclosed');
  });
});

describe('parseBulkQuickAddInput', () => {
  it('parses multiple lines into multiple results', () => {
    const input = 'Task 1 !high\nTask 2 #work\nTask 3 ~home';
    const results = parseBulkQuickAddInput(input);

    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('Task 1');
    expect(results[0].priority).toBe(Priority.HIGH);
    expect(results[1].title).toBe('Task 2');
    expect(results[1].tags).toEqual(['work']);
    expect(results[2].title).toBe('Task 3');
    expect(results[2].project).toBe('home');
  });

  it('skips empty lines', () => {
    const input = 'Task 1\n\nTask 2\n\n\nTask 3';
    const results = parseBulkQuickAddInput(input);

    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('Task 1');
    expect(results[1].title).toBe('Task 2');
    expect(results[2].title).toBe('Task 3');
  });

  it('skips whitespace-only lines', () => {
    const input = 'Task 1\n   \nTask 2';
    const results = parseBulkQuickAddInput(input);

    expect(results).toHaveLength(2);
  });

  it('skips lines with only modifiers and no title', () => {
    const input = 'Task 1\n!high #tag\nTask 2';
    const results = parseBulkQuickAddInput(input);

    expect(results).toHaveLength(2);
    expect(results[0].title).toBe('Task 1');
    expect(results[1].title).toBe('Task 2');
  });

  it('returns empty array for empty input', () => {
    expect(parseBulkQuickAddInput('')).toEqual([]);
  });

  it('handles single line input', () => {
    const results = parseBulkQuickAddInput('Single task !high');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Single task');
    expect(results[0].priority).toBe(Priority.HIGH);
  });

  it('parses each line independently with all modifiers', () => {
    const input = 'Task 1 !high #work &daily\nTask 2 !low "desc" ~home';
    const results = parseBulkQuickAddInput(input);

    expect(results).toHaveLength(2);
    expect(results[0].recurrenceRule).toBe('FREQ=DAILY');
    expect(results[1].description).toBe('desc');
    expect(results[1].project).toBe('home');
  });
});
