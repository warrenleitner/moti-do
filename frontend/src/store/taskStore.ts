/**
 * Zustand store for task state management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { Task, Priority } from '../types';

interface TaskFilters {
  status: 'all' | 'active' | 'completed';
  priority?: Priority;
  project?: string;
  tag?: string;
  search?: string;
  includeBlocked: boolean;
}

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

  // Filters and sorting
  filters: TaskFilters;
  sort: TaskSort;

  // Actions
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  selectTask: (id: string | null) => void;

  // Filter actions
  setFilters: (filters: Partial<TaskFilters>) => void;
  resetFilters: () => void;
  setSort: (sort: TaskSort) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultFilters: TaskFilters = {
  status: 'active',
  includeBlocked: false,
};

const defaultSort: TaskSort = {
  field: 'priority',
  order: 'desc',
};

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        tasks: [],
        selectedTaskId: null,
        isLoading: false,
        error: null,
        filters: defaultFilters,
        sort: defaultSort,

        // Task actions
        setTasks: (tasks) => set({ tasks, isLoading: false, error: null }),

        addTask: (task) =>
          set((state) => ({ tasks: [...state.tasks, task] })),

        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates } : t
            ),
          })),

        removeTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
          })),

        selectTask: (id) => set({ selectedTaskId: id }),

        // Filter actions
        setFilters: (filters) =>
          set((state) => ({
            filters: { ...state.filters, ...filters },
          })),

        resetFilters: () => set({ filters: defaultFilters }),

        setSort: (sort) => set({ sort }),

        // Loading state
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error, isLoading: false }),
      }),
      {
        name: 'motido-task-store',
        partialize: (state) => ({
          filters: state.filters,
          sort: state.sort,
        }),
      }
    ),
    { name: 'TaskStore' }
  )
);

// Selector hooks for computed values
export const useFilteredTasks = () => {
  const { tasks, filters, sort } = useTaskStore();

  // Apply filters
  let filtered = tasks.filter((task) => {
    // Status filter
    if (filters.status === 'active' && task.is_complete) return false;
    if (filters.status === 'completed' && !task.is_complete) return false;

    // Priority filter
    if (filters.priority && task.priority !== filters.priority) return false;

    // Project filter
    if (filters.project && task.project !== filters.project) return false;

    // Tag filter
    if (filters.tag && !task.tags.includes(filters.tag)) return false;

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

    // Blocked filter
    if (!filters.includeBlocked && task.dependencies.length > 0) {
      const hasIncompleteDepencies = task.dependencies.some((depId) => {
        const dep = tasks.find((t) => t.id === depId);
        return dep && !dep.is_complete;
      });
      if (hasIncompleteDepencies) return false;
    }

    return true;
  });

  // Apply sorting
  const priorityOrder: Record<Priority, number> = {
    trivial: 0,
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };

  filtered.sort((a, b) => {
    let comparison = 0;

    switch (sort.field) {
      case 'priority':
        comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
        break;
      case 'due_date':
        if (!a.due_date && !b.due_date) comparison = 0;
        else if (!a.due_date) comparison = 1;
        else if (!b.due_date) comparison = -1;
        else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        break;
      case 'creation_date':
        comparison = new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
        break;
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      default:
        comparison = 0;
    }

    return sort.order === 'asc' ? comparison : -comparison;
  });

  return filtered;
};

export const useSelectedTask = () => {
  const { tasks, selectedTaskId } = useTaskStore();
  return tasks.find((t) => t.id === selectedTaskId) ?? null;
};
