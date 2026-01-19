import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTaskStore, useFilteredTasks } from './taskStore';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

const defaultFilters = {
  status: 'active' as const,
  priorities: [] as Priority[],
  difficulties: [] as Difficulty[],
  durations: [] as Duration[],
  projects: [] as string[],
  tags: [] as string[],
  search: undefined as string | undefined,
  maxDueDate: undefined as string | undefined,
};

const defaultSort = { field: 'priority' as const, order: 'desc' as const };

const baseTask: Task = {
  id: 'task-1',
  title: 'Task with #implicitTag',
  text_description: 'Body mentions #implicitTag',
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

describe('useFilteredTasks', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
      filters: { ...defaultFilters },
      sort: { ...defaultSort },
    });
  });

  it('matches tasks by implicit tags when tag filters are applied', () => {
    useTaskStore.setState({
      tasks: [baseTask],
      filters: { ...defaultFilters, tags: ['implicittag'] },
    });

    const { result } = renderHook(() => useFilteredTasks());

    expect(result.current).toHaveLength(1);
    expect(result.current[0].id).toBe('task-1');
  });
});
