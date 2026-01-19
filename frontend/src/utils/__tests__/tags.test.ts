import { describe, it, expect } from 'vitest';
import { extractImplicitTags, getImplicitTagsForTask, getCombinedTags } from '../tags';
import { Priority, Difficulty, Duration } from '../../types';
import type { Task } from '../../types';

const baseTask: Task = {
  id: 'task-1',
  title: 'Base Task',
  creation_date: '2024-01-01T00:00:00Z',
  priority: Priority.MEDIUM,
  difficulty: Difficulty.MEDIUM,
  duration: Duration.MEDIUM,
  is_complete: false,
  tags: [],
  subtasks: [],
  dependencies: [],
  is_habit: false,
  streak_current: 0,
  streak_best: 0,
  history: [],
  score: 0,
  penalty_score: 0,
  net_score: 0,
  current_count: 0,
};

describe('tags utils', () => {
  it('extracts implicit tags from text with deduplication', () => {
    const text = 'Mix of #One #two and #one plus #three_four';
    expect(extractImplicitTags(text)).toEqual(['one', 'two', 'three_four']);
  });

  it('returns empty array when text is missing', () => {
    expect(extractImplicitTags()).toEqual([]);
    expect(extractImplicitTags('')).toEqual([]);
  });

  it('derives implicit tags from task fields and meta flags', () => {
    const task: Task = {
      ...baseTask,
      title: 'Title with #Alpha',
      text_description: 'Body has #beta too',
      is_habit: true,
      recurrence_rule: 'FREQ=DAILY',
    };

    const implicit = getImplicitTagsForTask(task);
    expect(implicit.sort()).toEqual(['alpha', 'beta', 'habit', 'recurring'].sort());
  });

  it('combines explicit and implicit tags case-insensitively, preserving explicit casing first', () => {
    const task: Task = {
      ...baseTask,
      title: 'Task with #Alpha and #beta',
      text_description: 'Another #Beta mention',
      tags: ['Explicit', 'ALPHA'],
    };

    const combined = getCombinedTags(task);
    expect(combined).toEqual(['Explicit', 'ALPHA', 'beta']);
  });

  it('dedupes explicit tags case-insensitively while preserving first casing', () => {
    const task: Task = {
      ...baseTask,
      tags: ['Alpha', 'alpha', 'ALPHA'],
    };

    expect(getCombinedTags(task)).toEqual(['Alpha']);
  });
});
