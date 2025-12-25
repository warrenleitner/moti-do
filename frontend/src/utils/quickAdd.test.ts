/**
 * Tests for quick-add parser utility.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseQuickAddInput,
  parseDateExpression,
  quickAddResultToTask,
} from './quickAdd';
import { Priority } from '../types';

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
});
