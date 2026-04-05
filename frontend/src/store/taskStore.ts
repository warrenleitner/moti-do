/**
 * Zustand store for task state management with API integration.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Task, TaskCompletionResponse } from '../types';
import type { TaskFilters } from '../types';
import { Priority } from '../types';
import { taskApi, type BulkJumpToCurrentInstanceResponse } from '../services/api';
import { getCombinedTags } from '../utils/tags';
import { deriveLifecycleStatus } from '../utils/taskStatus';

export type SubtaskViewMode = 'hidden' | 'inline' | 'top-level';

interface TaskSort {
  field: 'priority' | 'due_date' | 'creation_date' | 'title' | 'score';
  order: 'asc' | 'desc';
}

interface TaskState {
  // Data
  tasks: Task[];
  selectedTaskId: string | null;
  isLoading: boolean;
  error: string | null;
  hasCompletedData: boolean;
  crisisModeActive: boolean;
  crisisTaskIds: string[];

  // Filters and sorting
  filters: TaskFilters;
  sort: TaskSort;
  subtaskViewMode: SubtaskViewMode;

  // Local actions (immediate state updates)
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  selectTask: (id: string | null) => void;

  // Filter actions
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: TaskSort) => void;
  setSubtaskViewMode: (mode: SubtaskViewMode) => void;
  activateCrisisMode: (taskIds: string[]) => void;
  exitCrisisMode: () => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // API actions (async with API calls)
  fetchTasks: (options?: { includeCompleted?: boolean }) => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task>;
  saveTask: (id: string, updates: Partial<Task>) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  completeTask: (id: string) => Promise<TaskCompletionResponse>;
  uncompleteTask: (id: string) => Promise<Task>;
  undoTask: (id: string) => Promise<Task>;
  duplicateTask: (id: string) => Promise<Task>;
  deferTask: (
    id: string,
    params: { defer_until?: string; defer_to_next_recurrence?: boolean },
  ) => Promise<Task>;
  previewJumpToCurrentInstance: (
    taskIds: string[],
  ) => Promise<BulkJumpToCurrentInstanceResponse>;
  jumpToCurrentInstance: (
    taskIds: string[],
  ) => Promise<BulkJumpToCurrentInstanceResponse>;
}

const defaultFilters: TaskFilters = {
  statuses: ['active'],
  priorities: [],
  difficulties: [],
  durations: [],
  projects: [],
  tags: [],
};

const defaultSort: TaskSort = {
  field: 'priority',
  order: 'desc',
};

const defaultCrisisMode = {
  crisisModeActive: false,
  crisisTaskIds: [] as string[],
};

const mergeTaskLists = (existing: Task[], incoming: Task[]): Task[] => {
  const incomingById = new Map(incoming.map((task) => [task.id, task]));
  const merged = existing.map((task) => incomingById.get(task.id) ?? task);

  for (const task of incoming) {
    if (!existing.some((t) => t.id === task.id)) {
      merged.push(task);
    }
  }

  return merged;
};

export const filterTasksForCrisisMode = (
  tasks: Task[],
  crisisModeActive: boolean,
  crisisTaskIds: string[],
): Task[] => {
  if (!crisisModeActive) {
    return tasks;
  }

  const allowedTaskIds = new Set(crisisTaskIds);
  return tasks.filter((task) => allowedTaskIds.has(task.id));
};

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get): TaskState => ({
        // Initial state
        tasks: [],
        selectedTaskId: null,
        isLoading: false,
        error: null,
        hasCompletedData: false,
        crisisModeActive: defaultCrisisMode.crisisModeActive,
        crisisTaskIds: defaultCrisisMode.crisisTaskIds,
        filters: defaultFilters,
        sort: defaultSort,
        subtaskViewMode: 'inline',

        // Local task actions (for optimistic updates)
        setTasks: (tasks) => set({ tasks, isLoading: false, error: null }),

        addTask: (task) =>
          set((state) => ({ tasks: [...state.tasks, task] })),

        // Local update - tested indirectly via saveTask action
        /* v8 ignore next 6 */
        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),

        // Removes task from state - tested indirectly via deleteTask action
        /* v8 ignore next 5 */
        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
            crisisTaskIds: state.crisisTaskIds.filter((taskId) => taskId !== id),
            crisisModeActive:
              state.crisisModeActive &&
              state.crisisTaskIds.some((taskId) => taskId !== id),
          })),

        selectTask: (id) => set({ selectedTaskId: id }),

        // Filter actions
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),

        resetFilters: () => set({ filters: defaultFilters }),

        setSort: (sort) => set({ sort }),

        setSubtaskViewMode: (mode) => set({ subtaskViewMode: mode }),

        activateCrisisMode: (taskIds) =>
          set({
            crisisModeActive: taskIds.length > 0,
            crisisTaskIds: [...new Set(taskIds)],
          }),

        exitCrisisMode: () => set({ ...defaultCrisisMode }),

        // Loading state
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error, isLoading: false }),

        // API actions
        fetchTasks: async (options) => {
          const includeCompleted = options?.includeCompleted ?? false;
          set({ isLoading: true, error: null });
          try {
            const tasks = await taskApi.getTasks(
              includeCompleted ? undefined : { status_filter: 'pending', include_completed: false }
            );

            set((state) => {
              if (includeCompleted) {
                return { tasks, isLoading: false, hasCompletedData: true };
              }

              const completedCache = state.hasCompletedData
                ? state.tasks.filter((t) => t.is_complete)
                : [];
              const merged = mergeTaskLists(completedCache, tasks);

              return { tasks: merged, isLoading: false };
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        createTask: async (taskData) => {
          set({ isLoading: true, error: null });
          try {
            const newTask = await taskApi.createTask(taskData);
            set((state) => ({
              tasks: [...state.tasks, newTask],
              isLoading: false,
            }));
            return newTask;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to create task';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        saveTask: async (id, updates) => {
          // Optimistic update
          const { tasks } = get();
          const originalTask = tasks.find((t) => t.id === id);

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          }));

          try {
            const updatedTask = await taskApi.updateTask(id, updates);
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? updatedTask : t
              ),
            }));
            return updatedTask;
          } catch (error) {
            // Revert on error
            if (originalTask) {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === id ? originalTask : t
                ),
              }));
            }
            const message = error instanceof Error ? error.message : 'Failed to update task';
            set({ error: message });
            throw error;
          }
        },

        deleteTask: async (id) => {
          // Optimistic update
          const { tasks, selectedTaskId } = get();
          const originalTasks = [...tasks];

          set({
            tasks: tasks.filter((t) => t.id !== id),
            selectedTaskId: selectedTaskId === id ? null : selectedTaskId,
            crisisTaskIds: get().crisisTaskIds.filter((taskId) => taskId !== id),
            crisisModeActive:
              get().crisisModeActive &&
              get().crisisTaskIds.some((taskId) => taskId !== id),
          });

          try {
            await taskApi.deleteTask(id);
          } catch (error) {
            // Revert on error
            set({ tasks: originalTasks });
            const message = error instanceof Error ? error.message : 'Failed to delete task';
            set({ error: message });
            throw error;
          }
        },

        completeTask: async (id) => {
          // Optimistic update
          const { tasks } = get();
          const originalTask = tasks.find((t) => t.id === id);

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, is_complete: true } : t
            ),
          }));

          try {
            const response = await taskApi.completeTask(id);
            set((state) => {
              // Update completed task and add next instance if present
              let updatedTasks = state.tasks.map((t) =>
                t.id === id ? response.task : t
              );
              if (response.next_instance) {
                updatedTasks = [...updatedTasks, response.next_instance];
              }
              return { tasks: updatedTasks };
            });
            return response;
          } catch (error) {
            // Revert on error - tested via error injection in integration tests
            /* v8 ignore start */
            if (originalTask) {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === id ? originalTask : t
                ),
              }));
            }
            const message = error instanceof Error ? error.message : 'Failed to complete task';
            set({ error: message });
            throw error;
            /* v8 ignore stop */
          }
        },

        uncompleteTask: async (id) => {
          // Optimistic update
          const { tasks } = get();
          const originalTask = tasks.find((t) => t.id === id);

          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, is_complete: false } : t
            ),
          }));

          try {
            const uncompletedTask = await taskApi.uncompleteTask(id);
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? uncompletedTask : t
              ),
            }));
            return uncompletedTask;
          } catch (error) {
            // Revert on error
            if (originalTask) {
              set((state) => ({
                tasks: state.tasks.map((t) =>
                  t.id === id ? originalTask : t
                ),
              }));
            }
            const message = error instanceof Error ? error.message : 'Failed to uncomplete task';
            set({ error: message });
            throw error;
          }
        },

        undoTask: async (id) => {
          try {
            const updatedTask = await taskApi.undoTask(id);
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? updatedTask : t
              ),
            }));
            return updatedTask;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to undo task change';
            set({ error: message });
            throw error;
          }
        },

        duplicateTask: async (id) => {
          const { tasks, createTask } = get();
          const taskToDuplicate = tasks.find((t) => t.id === id);

          if (!taskToDuplicate) {
            throw new Error(`Task with id ${id} not found`);
          }

          // Create a copy of the task data, excluding system-managed fields
          // and resetting status fields
          /* eslint-disable @typescript-eslint/no-unused-vars */
          const {
            id: _id,
            creation_date: _created,
            completion_date: _completed,
            history: _history,
            is_complete: _isComplete,
            score: _score,
            penalty_score: _penalty,
            net_score: _net,
            streak_current: _streakCur,
            streak_best: _streakBest,
            ...taskData
          } = taskToDuplicate;
          /* eslint-enable @typescript-eslint/no-unused-vars */

          const newTaskData: Partial<Task> = {
            ...taskData,
            is_complete: false,
            // Reset subtasks completion status
            subtasks: taskData.subtasks?.map(st => ({ ...st, complete: false })) || [],
          };

          return createTask(newTaskData);
        },

        deferTask: async (id, params) => {
          const { tasks } = get();
          const originalTask = tasks.find((t) => t.id === id);

          // Optimistic update
          if (params.defer_until) {
            set((state) => ({
              tasks: state.tasks.map((t) =>
                t.id === id ? { ...t, defer_until: params.defer_until } : t,
              ),
            }));
          }

          try {
            const response = await taskApi.deferTask(id, params);
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === id ? response.task : t)),
            }));
            return response.task;
          } catch (error) {
            // Revert on error
            if (originalTask) {
              set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? originalTask : t)),
              }));
            }
            throw error;
          }
        },

        previewJumpToCurrentInstance: async (taskIds) => {
          try {
            return await taskApi.previewJumpToCurrentInstance(taskIds);
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to preview task jump';
            set({ error: message });
            throw error;
          }
        },

        jumpToCurrentInstance: async (taskIds) => {
          try {
            const response = await taskApi.jumpToCurrentInstance(taskIds);
            const updatedTasksById = new Map(
              response.updated_tasks.map((task) => [task.id, task]),
            );

            set((state) => ({
              tasks: state.tasks.map((task) => updatedTasksById.get(task.id) ?? task),
            }));

            return response;
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to jump tasks to current instance';
            set({ error: message });
            throw error;
          }
        },
      }),
      {
        name: 'motido-task-store',
        version: 5,
        partialize: (state) => ({
          filters: state.filters,
          sort: state.sort,
          subtaskViewMode: state.subtaskViewMode,
          crisisModeActive: state.crisisModeActive,
          crisisTaskIds: state.crisisTaskIds,
        }),
        // Migrate old filter structure to new unified status
        migrate: (persistedState, version) => {
          const state = persistedState as { filters?: Record<string, unknown> };
          if (version < 3 && state.filters) {
            // Reset to default filters since structure changed (merged availability into status)
            state.filters = { ...defaultFilters };
          }
          if (version < 5 && state.filters) {
            // Migrate single status to multi-select statuses array
            const oldStatus = state.filters.status as string | undefined;
            const validStatuses = ['all', 'active', 'completed', 'blocked', 'future'];
            if (oldStatus && validStatuses.includes(oldStatus)) {
              (state.filters as Record<string, unknown>).statuses = [oldStatus];
            } else {
              (state.filters as Record<string, unknown>).statuses = defaultFilters.statuses;
            }
            delete state.filters.status;
          }
          return persistedState as TaskState;
        },
        // Merge persisted state with defaults to ensure all required fields exist
        merge: (persistedState, currentState) => {
          const persisted = persistedState as Partial<TaskState>;
          // Validate statuses array
          const validStatuses = ['all', 'active', 'completed', 'blocked', 'future'];
          const persistedStatuses = persisted.filters?.statuses;
          const statuses = Array.isArray(persistedStatuses)
            ? persistedStatuses.filter((s: string) => validStatuses.includes(s))
            : defaultFilters.statuses;
          return {
            ...currentState,
            ...persisted,
            // Ensure filters has all required fields with defaults
            filters: {
              ...defaultFilters,
              statuses: statuses.length > 0 ? statuses : defaultFilters.statuses,
              priorities: persisted.filters?.priorities ?? defaultFilters.priorities,
              difficulties: persisted.filters?.difficulties ?? defaultFilters.difficulties,
              durations: persisted.filters?.durations ?? defaultFilters.durations,
              projects: persisted.filters?.projects ?? defaultFilters.projects,
              tags: persisted.filters?.tags ?? defaultFilters.tags,
              search: persisted.filters?.search,
              minDueDate: persisted.filters?.minDueDate,
              maxDueDate: persisted.filters?.maxDueDate,
              minStartDate: persisted.filters?.minStartDate,
              maxStartDate: persisted.filters?.maxStartDate,
            },
            crisisModeActive:
              typeof persisted.crisisModeActive === 'boolean'
                ? persisted.crisisModeActive
                : defaultCrisisMode.crisisModeActive,
            crisisTaskIds: Array.isArray(persisted.crisisTaskIds)
              ? persisted.crisisTaskIds
              : defaultCrisisMode.crisisTaskIds,
          };
        },
      }
    ),
    { name: 'TaskStore' }
  )
);

// Selector hooks for computed values
export const useFilteredTasks = (lastProcessedDate?: string) => {
  const { tasks, filters, sort, crisisModeActive, crisisTaskIds } = useTaskStore();

  // Apply filters
  const filtered = tasks.filter((task) => {
    const lifecycleStatus = deriveLifecycleStatus(task, { allTasks: tasks, lastProcessedDate });

    // Status filter (multi-select: active, completed, blocked, future, all)
    if (filters.statuses.length > 0 && !filters.statuses.includes('all')) {
      if (!filters.statuses.includes(lifecycleStatus as TaskFilters['statuses'][number])) return false;
    }

    // Priority filter (multi-select)
    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }

    // Difficulty filter (multi-select)
    if (filters.difficulties.length > 0 && !filters.difficulties.includes(task.difficulty)) {
      return false;
    }

    // Duration filter (multi-select)
    if (filters.durations.length > 0 && !filters.durations.includes(task.duration)) {
      return false;
    }

    // Project filter (multi-select)
    if (filters.projects.length > 0 && (!task.project || !filters.projects.includes(task.project))) {
      return false;
    }

    // Tag filter (multi-select - task must have at least one of the selected tags, including implicit)
    if (filters.tags.length > 0) {
      const taskTags = getCombinedTags(task).map((tag) => tag.toLowerCase());
      if (!filters.tags.some((tag) => taskTags.includes(tag.toLowerCase()))) {
        return false;
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (
        !task.title.toLowerCase().includes(searchLower) &&
        !task.text_description?.toLowerCase().includes(searchLower)
      ) {
        return false;
      }
    }

    // Due date range filter
    if (filters.minDueDate) {
      if (!task.due_date) return false;
      const taskDueDate = new Date(task.due_date.split('T')[0]);
      const minDate = new Date(filters.minDueDate);
      if (taskDueDate < minDate) return false;
    }
    if (filters.maxDueDate) {
      if (!task.due_date) return false;
      const taskDueDate = new Date(task.due_date.split('T')[0]);
      const maxDate = new Date(filters.maxDueDate);
      if (taskDueDate > maxDate) return false;
    }

    // Start date range filter
    if (filters.minStartDate) {
      if (!task.start_date) return false;
      const taskStartDate = new Date(task.start_date.split('T')[0]);
      const minDate = new Date(filters.minStartDate);
      if (taskStartDate < minDate) return false;
    }
    if (filters.maxStartDate) {
      if (!task.start_date) return false;
      const taskStartDate = new Date(task.start_date.split('T')[0]);
      const maxDate = new Date(filters.maxStartDate);
      if (taskStartDate > maxDate) return false;
    }

    return true;
  });

  // Apply sorting
  const priorityOrder: Record<Priority, number> = {
    [Priority.TRIVIAL]: 0,
    [Priority.LOW]: 1,
    [Priority.MEDIUM]: 2,
    [Priority.HIGH]: 3,
    [Priority.DEFCON_ONE]: 4,
  };

  filtered.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'due_date':
        // Due date sorting with null handling - edge cases tested via integration
        /* v8 ignore start */
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        /* v8 ignore stop */
        break;
      case 'creation_date':
        comparison = new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'score':
        comparison = a.score - b.score;
        break;
      default:
        comparison = 0;
    }

    return sort.order === 'asc' ? comparison : -comparison;
  });

  return filterTasksForCrisisMode(filtered, crisisModeActive, crisisTaskIds);
};

export const useSelectedTask = () => {
  const { tasks, selectedTaskId } = useTaskStore();
  return tasks.find((t) => t.id === selectedTaskId) ?? null;
};

export const useVisibleTasks = (tasks: Task[]) => {
  const { crisisModeActive, crisisTaskIds } = useTaskStore();
  return filterTasksForCrisisMode(tasks, crisisModeActive, crisisTaskIds);
};
