import { fireEvent, render, screen, waitFor } from '../test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TasksPage from './TasksPage';
import * as stores from '../store';
import * as filteredTaskStore from '../store/taskStore';
import * as userStore from '../store/userStore';
import { taskApi } from '../services/api';
import type { Difficulty, Duration, Priority, Task } from '../types';

const { mockTask, apiMocks } = vi.hoisted(() => ({
  mockTask: {
    id: 'task-1',
    title: 'Test Task',
    creation_date: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    priority: 'Medium' as Priority,
    difficulty: 'Medium' as Difficulty,
    duration: 'Short' as Duration,
    is_complete: false,
    is_habit: false,
    tags: [],
    subtasks: [],
    dependencies: [],
    streak_current: 0,
    streak_best: 0,
    history: [],
    score: 100,
  } satisfies Task,
  apiMocks: {
    updateTask: vi.fn(),
    completeTask: vi.fn(),
    deleteTask: vi.fn(),
  },
}));

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useFilteredTasks: vi.fn(),
  useUserStore: vi.fn(),
}));

vi.mock('../store/taskStore', () => ({
  useFilteredTasks: vi.fn(),
}));

vi.mock('../store/userStore', () => ({
  useUserStore: vi.fn(),
  useSystemStatus: vi.fn(),
  useDefinedProjects: vi.fn(),
}));

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    taskApi: {
      ...actual.taskApi,
      updateTask: apiMocks.updateTask,
      completeTask: apiMocks.completeTask,
      deleteTask: apiMocks.deleteTask,
    },
  };
});

vi.mock('../components/tasks', () => ({
  TaskList: ({
    onEdit,
    onDelete,
    onComplete,
  }: {
    onEdit: (task: Task) => void;
    onDelete: (id: string) => void;
    onComplete: (id: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onEdit(mockTask)}>
        Edit task
      </button>
      <button type="button" onClick={() => onComplete(mockTask.id)}>
        Complete task
      </button>
      <button type="button" onClick={() => onDelete(mockTask.id)}>
        Delete task
      </button>
    </div>
  ),
  TaskForm: ({
    open,
    onSave,
  }: {
    open: boolean;
    onSave: (task: Partial<Task>) => Promise<void>;
  }) =>
    open ? (
      <button type="button" onClick={() => void onSave({ title: 'Edited Task' })}>
        Save task
      </button>
    ) : null,
}));

vi.mock('../components/tasks/TaskTable', () => ({
  default: () => null,
}));

vi.mock('../components/tasks/QuickAddBox', () => ({
  default: () => null,
}));

vi.mock('../components/tasks/JumpToCurrentInstanceDialog', () => ({
  default: () => null,
}));

vi.mock('../components/common', () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => Promise<void>;
  }) =>
    open ? (
      <button type="button" onClick={() => void onConfirm()}>
        Confirm delete
      </button>
    ) : null,
}));

vi.mock('../components/common/SearchInput', () => ({
  default: () => null,
}));

vi.mock('../components/common/DeferDialog', () => ({
  default: () => null,
}));

describe('TasksPage undo notifications', () => {
  const mockFetchStats = vi.fn();
  let storeState: ReturnType<typeof createStoreState>;

  function createStoreState() {
    const state = {
      tasks: [{ ...mockTask }],
      filters: {
        statuses: ['active'] as ('all' | 'active' | 'completed' | 'blocked' | 'future')[],
        priorities: [],
        difficulties: [],
        durations: [],
        projects: [],
        tags: [],
      },
      sort: { field: 'score' as const, order: 'desc' as const },
      hasCompletedData: false,
      createTask: vi.fn(),
      saveTask: vi.fn(),
      deleteTask: vi.fn(),
      completeTask: vi.fn(),
      uncompleteTask: vi.fn(),
      undoTask: vi.fn(),
      duplicateTask: vi.fn(),
      deferTask: vi.fn(),
      fetchTasks: vi.fn(),
      previewJumpToCurrentInstance: vi.fn(),
      jumpToCurrentInstance: vi.fn(),
      activateCrisisMode: vi.fn(),
      crisisModeActive: false,
      crisisTaskIds: [],
      isLoading: false,
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      setTasks: vi.fn((tasks: Task[]) => {
        state.tasks = tasks;
      }),
      updateTask: vi.fn((id: string, updates: Partial<Task>) => {
        state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, ...updates } : task));
      }),
      removeTask: vi.fn((id: string) => {
        state.tasks = state.tasks.filter((task) => task.id !== id);
      }),
      addTask: vi.fn((task: Task) => {
        state.tasks = [...state.tasks, task];
      }),
    };

    return state;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    storeState = createStoreState();

    vi.mocked(stores.useTaskStore).mockImplementation(
      () => storeState as unknown as ReturnType<typeof stores.useTaskStore>
    );
    (stores.useTaskStore as unknown as { getState: () => typeof storeState }).getState = () => storeState;

    vi.mocked(stores.useFilteredTasks).mockReturnValue(storeState.tasks);
    vi.mocked(filteredTaskStore.useFilteredTasks).mockReturnValue(storeState.tasks);
    vi.mocked(userStore.useUserStore).mockReturnValue({
      fetchStats: mockFetchStats,
    } as unknown as ReturnType<typeof userStore.useUserStore>);
    vi.mocked(userStore.useSystemStatus).mockReturnValue(undefined);
    vi.mocked(userStore.useDefinedProjects).mockReturnValue([]);

    apiMocks.updateTask.mockResolvedValue({ ...mockTask, title: 'Edited Task' });
    apiMocks.completeTask.mockResolvedValue({
      task: { ...mockTask, is_complete: true },
      xp_earned: 100,
      next_instance: null,
    });
    apiMocks.deleteTask.mockResolvedValue(undefined);
  });

  it('shows an undo button for edited tasks and cancels the deferred save', async () => {
    render(<TasksPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save task' }));

    const undoButton = await screen.findByRole('button', { name: 'Undo' });
    expect(screen.getByText('Task updated successfully')).toBeInTheDocument();

    fireEvent.click(undoButton);

    expect(storeState.updateTask).toHaveBeenCalledWith('task-1', { title: 'Edited Task' });
    expect(storeState.setTasks).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'task-1', title: 'Test Task' }),
    ]);
    expect(taskApi.updateTask).not.toHaveBeenCalled();
  });

  it('shows an undo button for completed tasks and cancels the deferred completion', async () => {
    render(<TasksPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Complete task' }));

    const undoButton = await screen.findByRole('button', { name: 'Undo' });
    expect(screen.getByText('Task completed! XP earned.')).toBeInTheDocument();

    fireEvent.click(undoButton);

    expect(storeState.setTasks).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({ id: 'task-1', is_complete: true }),
    ]);
    expect(storeState.setTasks).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({ id: 'task-1', is_complete: false }),
    ]);
    expect(taskApi.completeTask).not.toHaveBeenCalled();
    expect(mockFetchStats).not.toHaveBeenCalled();
  });

  it('shows an undo button for deleted tasks and restores the task locally', async () => {
    render(<TasksPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));

    const undoButton = await screen.findByRole('button', { name: 'Undo' });
    expect(screen.getByText('Task deleted')).toBeInTheDocument();

    fireEvent.click(undoButton);

    expect(storeState.removeTask).toHaveBeenCalledWith('task-1');
    await waitFor(() => {
      expect(storeState.setTasks).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'task-1', title: 'Test Task' }),
      ]);
    });
    expect(taskApi.deleteTask).not.toHaveBeenCalled();
  });
});
