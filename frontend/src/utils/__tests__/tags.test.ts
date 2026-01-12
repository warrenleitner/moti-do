import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import { extractImplicitTags, getCombinedTags, getImplicitTagsForTask } from '../tags';

const baseTask: Task = {
  id: 'task-1',
  title: 'Sample task',
  creation_date: '2024-01-01T00:00:00Z',
  priority: 'Medium' as Task['priority'],
  difficulty: 'Medium' as Task['difficulty'],
  duration: 'Short' as Task['duration'],
  is_complete: false,
  is_habit: false,
  tags: [],
  subtasks: [],
  dependencies: [],
  streak_current: 0,
  streak_best: 0,
  history: [],
  score: 10,
  penalty_score: 0,
  net_score: 10,
};

describe('tags utilities', () => {
  it('extracts implicit tags from text', () => {
    const tags = extractImplicitTags('Title with #Work and #focus and repeated #work');
    expect(tags).toEqual(['work', 'focus']);
  });

  it('derives implicit tags from task fields', () => {
    const task: Task = {
      ...baseTask,
      title: 'Complete the #Report',
      text_description: 'Remember the #deadline',
    };

    const implicit = getImplicitTagsForTask(task);
    expect(implicit).toContain('report');
    expect(implicit).toContain('deadline');
  });

  it('adds implicit metadata tags for habits and recurrence', () => {
    const task: Task = {
      ...baseTask,
      is_habit: true,
      recurrence_rule: 'FREQ=DAILY',
    };

    const implicit = getImplicitTagsForTask(task);
    expect(implicit).toContain('habit');
    expect(implicit).toContain('recurring');
  });

  it('merges explicit and implicit tags without duplicates', () => {
    const task: Task = {
      ...baseTask,
      title: 'Finish #Work items',
      text_description: 'Focus on #deep_work',
      tags: ['work', 'urgent'],
    };

    const combined = getCombinedTags(task);
    expect(combined).toEqual(['work', 'urgent', 'deep_work']);
  });

  it('returns empty list when text is missing', () => {
    expect(extractImplicitTags()).toEqual([]);
    expect(extractImplicitTags('')).toEqual([]);
  });

  it('preserves explicit casing while removing duplicate tags', () => {
    const task: Task = {
      ...baseTask,
      title: 'Complete #work items',
      text_description: 'Another #Work mention',
      tags: ['Work', 'work', 'FoCus'],
    };

    const combined = getCombinedTags(task);
    expect(combined).toEqual(['Work', 'FoCus']);
  });
});
