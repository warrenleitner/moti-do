import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import { deriveLifecycleStatus, isTaskBlocked, isTaskFuture } from '../taskStatus';

const baseTask: Task = {
  id: 'task-1',
  title: 'Sample',
  creation_date: '2025-01-01T00:00:00Z',
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

describe('taskStatus utilities', () => {
  it('detects blocked tasks via dependencies', () => {
    const blocker: Task = { ...baseTask, id: 'dep-1' };
    const blocked: Task = { ...baseTask, id: 'task-2', dependencies: ['dep-1'] };

    expect(isTaskBlocked(blocked, [blocked, blocker])).toBe(true);
    expect(isTaskBlocked({ ...baseTask, id: 'free' }, [blocker])).toBe(false);
  });

  it('treats missing dependencies as unblocked', () => {
    const missing: Task = { ...baseTask, id: 'task-3', dependencies: ['ghost'] };

    expect(isTaskBlocked(missing, [baseTask])).toBe(false);
  });

  it('detects future tasks relative to processing date', () => {
    const futureTask: Task = { ...baseTask, start_date: '2025-02-01' };
    const isoFutureTask: Task = { ...baseTask, start_date: '2025-01-12T00:00:00Z' };
    expect(isTaskFuture(futureTask, '2025-01-10')).toBe(true);
    expect(isTaskFuture(isoFutureTask, '2025-01-10')).toBe(true);
    expect(isTaskFuture({ ...baseTask, start_date: undefined }, '2025-01-10')).toBe(false);
    expect(isTaskFuture({ ...baseTask, start_date: '2025-02-01' }, undefined)).toBe(false);
  });

  it('derives lifecycle status precedence', () => {
    const completed: Task = { ...baseTask, id: 'done', is_complete: true };
    const blocked: Task = { ...baseTask, id: 'blocked', dependencies: ['dep-1'] };
    const blocker: Task = { ...baseTask, id: 'dep-1' };
    const future: Task = { ...baseTask, id: 'future', start_date: '2025-02-01' };
    const active: Task = { ...baseTask, id: 'active' };

    expect(deriveLifecycleStatus(completed, { allTasks: [completed], lastProcessedDate: '2025-01-10' })).toBe('completed');
    expect(deriveLifecycleStatus(blocked, { allTasks: [blocked, blocker], lastProcessedDate: '2025-01-10' })).toBe('blocked');
    expect(deriveLifecycleStatus(future, { allTasks: [future], lastProcessedDate: '2025-01-10' })).toBe('future');
    expect(deriveLifecycleStatus(active, { allTasks: [active], lastProcessedDate: '2025-01-10' })).toBe('active');
  });
});
