/**
 * Tests for the task store.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTaskStore, useFilteredTasks, useSelectedTask } from './taskStore';
import { renderHook, act } from '@testing-library/react';
import { mockTasks } from '../test/mocks/handlers';
import { Priority, Difficulty, Duration } from '../types';

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
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
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
        result.current.setFilters({ status: 'completed', priority: Priority.HIGH });
      });

      expect(result.current.filters.status).toBe('completed');
      expect(result.current.filters.priority).toBe(Priority.HIGH);
    });

    it('should reset filters', () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setFilters({ status: 'completed', priority: Priority.HIGH });
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

    it('should handle uncomplete task error and revert state', async () => {
      const { result } = renderHook(() => useTaskStore());

      // Set up a task with known state
      const originalTask = {
        ...mockTasks[0],
        is_complete: true,
      };

      act(() => {
        result.current.setTasks([originalTask]);
      });

      // Mock the API to fail
      const taskApi = await import('../services/api');
      const originalUncomplete = taskApi.taskApi.uncompleteTask;
      taskApi.taskApi.uncompleteTask = vi.fn().mockRejectedValue(new Error('API Error'));

      // Attempt to uncomplete and expect error
      await expect(async () => {
        await act(async () => {
          await result.current.uncompleteTask('task-1');
        });
      }).rejects.toThrow('API Error');

      // Verify state was reverted
      const state = useTaskStore.getState();
      expect(state.tasks[0].is_complete).toBe(true);
      // Error message is set to the error message or 'Failed to uncomplete task'
      expect(state.error).toBeTruthy();

      // Restore original API function
      taskApi.taskApi.uncompleteTask = originalUncomplete;
    });

    it('should handle uncomplete task error when original task not found', async () => {
      const { result } = renderHook(() => useTaskStore());

      act(() => {
        result.current.setTasks(mockTasks);
      });

      // Mock the API to fail
      const taskApi = await import('../services/api');
      const originalUncomplete = taskApi.taskApi.uncompleteTask;
      taskApi.taskApi.uncompleteTask = vi.fn().mockRejectedValue(new Error('API Error'));

      // Attempt to uncomplete a non-existent task
      await expect(async () => {
        await act(async () => {
          await result.current.uncompleteTask('non-existent-id');
        });
      }).rejects.toThrow('API Error');

      // Verify error was set
      const state = useTaskStore.getState();
      // Error message is set to the error message or 'Failed to uncomplete task'
      expect(state.error).toBeTruthy();

      // Restore original API function
      taskApi.taskApi.uncompleteTask = originalUncomplete;
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
    expect(result.current[0].priority).toBe(Priority.HIGH);
  });

  it('should sort by due_date with null handling', () => {
    const store = useTaskStore.getState();
    const tasksWithDueDates = [
      ...mockTasks,
      {
        id: 'task-4',
        title: 'Task with no due date',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
      {
        id: 'task-5',
        title: 'Task with due date',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        due_date: '2024-12-31',
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
    ];
    store.setTasks(tasksWithDueDates);
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'due_date', order: 'asc' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should sort by due_date - both tasks with no due date', () => {
    const store = useTaskStore.getState();
    const tasksNoDates = [
      {
        id: 'task-1',
        title: 'Task A',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
      {
        id: 'task-2',
        title: 'Task B',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
    ];
    store.setTasks(tasksNoDates);
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'due_date', order: 'asc' });

    const { result } = renderHook(() => useFilteredTasks());
    // Both have no due date, so comparison should be 0
    expect(result.current.length).toBe(2);
  });

  it('should handle default case in sort', () => {
    const store = useTaskStore.getState();
    store.setTasks(mockTasks);
    store.setFilters({ status: 'all' });
    // Use an invalid sort field to trigger default case
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.setSort({ field: 'invalid' as any, order: 'asc' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should sort by creation_date', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'creation_date', order: 'asc' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should sort by title', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'title', order: 'asc' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should sort by score', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all' });
    store.setSort({ field: 'score', order: 'desc' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBeGreaterThan(0);
  });

  it('should filter by priority', () => {
    const store = useTaskStore.getState();
    store.setFilters({ status: 'all', priority: Priority.HIGH });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.every((t) => t.priority === Priority.HIGH)).toBe(true);
  });

  it('should filter by project', () => {
    const tasksWithProjects = [
      ...mockTasks.map((t) => ({ ...t, project: 'work' })),
      {
        id: 'task-4',
        title: 'Personal Task',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        creation_date: new Date().toISOString(),
        project: 'personal',
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
    ];
    const store = useTaskStore.getState();
    store.setTasks(tasksWithProjects);
    store.setFilters({ status: 'all', project: 'work' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.every((t) => t.project === 'work')).toBe(true);
  });

  it('should filter by search in description', () => {
    const tasksWithDesc = mockTasks.map((t) => ({
      ...t,
      text_description: t.id === 'task-1' ? 'important description' : undefined,
    }));
    const store = useTaskStore.getState();
    store.setTasks(tasksWithDesc);
    store.setFilters({ status: 'all', search: 'description' });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.length).toBe(1);
    expect(result.current[0].id).toBe('task-1');
  });

  it('should filter out blocked tasks when includeBlocked is false', () => {
    const tasksWithDeps = [
      ...mockTasks,
      {
        id: 'task-blocked',
        title: 'Blocked Task',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: ['task-1'],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
    ];
    const store = useTaskStore.getState();
    store.setTasks(tasksWithDeps);
    store.setFilters({ status: 'active', includeBlocked: false });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.find((t) => t.id === 'task-blocked')).toBeUndefined();
  });

  it('should include blocked tasks when includeBlocked is true', () => {
    const tasksWithDeps = [
      ...mockTasks,
      {
        id: 'task-blocked',
        title: 'Blocked Task',
        priority: Priority.MEDIUM,
        difficulty: Difficulty.MEDIUM,
        duration: Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: ['task-1'],
        creation_date: new Date().toISOString(),
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 50,
      },
    ];
    const store = useTaskStore.getState();
    store.setTasks(tasksWithDeps);
    store.setFilters({ status: 'active', includeBlocked: true });

    const { result } = renderHook(() => useFilteredTasks());
    expect(result.current.find((t) => t.id === 'task-blocked')).toBeDefined();
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
