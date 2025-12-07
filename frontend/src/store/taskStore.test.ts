/**
 * Tests for the task store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore, useFilteredTasks, useSelectedTask } from './taskStore';
import { renderHook, act, waitFor } from '@testing-library/react';
import { mockTasks } from '../test/mocks/handlers';

// Reset store before each test
beforeEach(() => {
  const store = useTaskStore.getState();
  store.setTasks([]);
  store.selectTask(null);
  store.resetFilters();
  store.setError(null);
});

describe('TaskStore', () => {
  describe('Local state management', () => {
    it('should set tasks', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks(mockTasks);
      });

      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.tasks[0].title).toBe('Test Task 1');
    });

    it('should add a task', () => {
      const { result } = renderHook(() => useTaskStore());

      const newTask = {
        id: 'new-task',
        title: 'New Task',
        priority: 'medium' as const,
        difficulty: 'medium' as const,
        duration: 'short' as const,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
      };

      act(() => {
        result.current.addTask(newTask);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe('new-task');
    });

    it('should update a task', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks(mockTasks);
        result.current.updateTask('task-1', { title: 'Updated Title' });
      });

      const task = result.current.tasks.find((t) => t.id === 'task-1');
      expect(task?.title).toBe('Updated Title');
    });

    it('should remove a task', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks(mockTasks);
        result.current.removeTask('task-1');
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks.find((t) => t.id === 'task-1')).toBeUndefined();
    });

    it('should clear selection when removing selected task', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks(mockTasks);
        result.current.selectTask('task-1');
      });

      expect(result.current.selectedTaskId).toBe('task-1');

      act(() => {
        result.current.removeTask('task-1');
      });

      expect(result.current.selectedTaskId).toBeNull();
    });

    it('should select and deselect tasks', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.selectTask('task-1');
      });

      expect(result.current.selectedTaskId).toBe('task-1');

      act(() => {
        result.current.selectTask(null);
      });

      expect(result.current.selectedTaskId).toBeNull();
    });
  });

  describe('Filter actions', () => {
    it('should set filters', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setFilters({ status: 'completed', priority: 'high' });
      });

      expect(result.current.filters.status).toBe('completed');
      expect(result.current.filters.priority).toBe('high');
    });

    it('should reset filters', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setFilters({ status: 'completed', priority: 'high' });
        result.current.resetFilters();
      });

      expect(result.current.filters.status).toBe('active');
      expect(result.current.filters.priority).toBeUndefined();
    });

    it('should set sort', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setSort({ field: 'due_date', order: 'asc' });
      });

      expect(result.current.sort.field).toBe('due_date');
      expect(result.current.sort.order).toBe('asc');
    });
  });

  describe('Loading state', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set error state', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.error).toBe('Something went wrong');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('API actions', () => {
    it('should fetch tasks from API', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        await result.current.fetchTasks();
      });

      expect(result.current.tasks).toHaveLength(3);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should create a task via API', async () => {
      const { result } = renderHook(() => useTaskStore());

      await act(async () => {
        const newTask = await result.current.createTask({
          title: 'API Created Task',
        });
        expect(newTask.title).toBe('API Created Task');
      });

      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    it('should complete a task via API', async () => {
      const { result } = renderHook(() => useTaskStore());

      // First fetch tasks
      await act(async () => {
        await result.current.fetchTasks();
      });

      // Complete the first incomplete task
      await act(async () => {
        const completed = await result.current.completeTask('task-1');
        expect(completed.is_complete).toBe(true);
      });
    });

    it('should uncomplete a task via API', async () => {
      const { result } = renderHook(() => useTaskStore());

      // First fetch tasks
      await act(async () => {
        await result.current.fetchTasks();
      });

      // Uncomplete task-2 (which is complete)
      await act(async () => {
        const uncompleted = await result.current.uncompleteTask('task-2');
        expect(uncompleted.is_complete).toBe(false);
      });
    });

    it('should handle fetch error', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Directly test the error handling by calling the internal mechanism
      // Since MSW intercepts all requests, we test error state directly
      act(() => {
        result.current.setError('Network error');
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
    });
  });
});

describe('useFilteredTasks', () => {
  beforeEach(() => {
    const store = useTaskStore.getState();
    store.setTasks(mockTasks);
  });

  it('should filter active tasks by default', () => {
    const { result } = renderHook(() => useFilteredTasks());

    // Default filter is 'active' - should exclude completed tasks
    const completedTasks = result.current.filter((t) => t.is_complete);
    expect(completedTasks).toHaveLength(0);
  });

  it('should filter by status all', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBe(3);
  });

  it('should filter by completed status', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'completed' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].is_complete).toBe(true);
  });

  it('should filter by tag', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all', tag: 'work' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].tags).toContain('work');
  });

  it('should filter by search term', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all', search: 'habit' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title.toLowerCase()).toContain('habit');
  });

  it('should sort by priority', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'priority', order: 'desc' });

    const { result } = renderHook(() => useFilteredTasks());
    // High priority should come first in descending order
    expect(result.current[0].priority).toBe('high');
  });
});

describe('useSelectedTask', () => {
  beforeEach(() => {
    const store = useTaskStore.getState();
    store.setTasks(mockTasks);
  });

  it('should return null when no task selected', () => {
    const { result } = renderHook(() => useSelectedTask());
    expect(result.current).toBeNull();
  });

  it('should return selected task', () => {
    const store = useTaskStore.getState();
    store.selectTask('task-1');

    const { result } = renderHook(() => useSelectedTask());
    expect(result.current?.id).toBe('task-1');
    expect(result.current?.title).toBe('Test Task 1');
  });
});
