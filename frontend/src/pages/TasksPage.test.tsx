import { render, screen, waitFor } from '../test/utils';
import { vi } from 'vitest';
import TasksPage from './TasksPage';
import * as stores from '../store';
import * as taskStore from '../store/taskStore';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useFilteredTasks: vi.fn(),
  useUserStore: vi.fn(),
}));
vi.mock('../store/taskStore', () => ({
  useFilteredTasks: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const defaultFilters = {
  status: 'active' as const,
  search: undefined,
  priorities: [] as Priority[],
  difficulties: [] as Difficulty[],
  durations: [] as Duration[],
  projects: [] as string[],
  tags: [] as string[],
  includeBlocked: false,
};

describe('TasksPage', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    creation_date: new Date().toISOString(),
    priority: Priority.MEDIUM,
    difficulty: Difficulty.MEDIUM,
    duration: Duration.SHORT,
    is_complete: false,
    is_habit: false,
    tags: [],
    subtasks: [
      { text: 'Subtask 1', complete: false },
      { text: 'Subtask 2', complete: true },
    ],
    dependencies: [],
    streak_current: 0,
    streak_best: 0,
    history: [],
    score: 100,
  };

  const mockCreateTask = vi.fn();
  const mockSaveTask = vi.fn();
  const mockDeleteTask = vi.fn();
  const mockCompleteTask = vi.fn();
  const mockUncompleteTask = vi.fn();
  const mockFetchStats = vi.fn();

  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();

    // Mock useTaskStore with getState for subtask toggle
    const mockUseTaskStore = vi.mocked(stores.useTaskStore);
    mockUseTaskStore.mockReturnValue({
      tasks: [mockTask],
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      fetchTasks: vi.fn(),
      hasCompletedData: false,
      createTask: mockCreateTask,
      saveTask: mockSaveTask,
      deleteTask: mockDeleteTask,
      completeTask: mockCompleteTask,
      uncompleteTask: mockUncompleteTask,
      undoTask: vi.fn(),
      duplicateTask: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    // Mock getState for subtask toggle
    (stores.useTaskStore as unknown as { getState: () => { tasks: Task[] } }).getState = vi.fn(() => ({
      tasks: [mockTask],
    }));

    vi.mocked(stores.useFilteredTasks).mockReturnValue([mockTask]);
    vi.mocked(taskStore.useFilteredTasks).mockReturnValue([mockTask]);
    vi.mocked(stores.useUserStore).mockReturnValue({
      fetchStats: mockFetchStats,
    } as unknown as ReturnType<typeof stores.useUserStore>);
  });

  // Since TasksPage is wrapped in /* v8 ignore start/stop */,
  // these are integration tests only, not for coverage.
  // Keep tests simple to verify basic rendering and structure.

  it('renders without crashing', () => {
    render(<TasksPage />);
    // Page renders with the New Task button
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('shows create task button', () => {
    render(<TasksPage />);
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('displays task list with search', () => {
    render(<TasksPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('displays task in list', () => {
    render(<TasksPage />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('has view mode toggle buttons', () => {
    render(<TasksPage />);
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /table view/i })).toBeInTheDocument();
  });

  it('switches between list and table views', async () => {
    const { user } = render(<TasksPage />);

    // Find table view button
    const tableViewButton = screen.getByRole('button', { name: /table view/i });
    await user.click(tableViewButton);

    // Verify localStorage was updated
    expect(localStorage.getItem('taskViewMode')).toBe('table');
  });

  it('loads saved view mode from localStorage', () => {
    localStorage.setItem('taskViewMode', 'table');
    render(<TasksPage />);

    // Table view button should be selected
    const tableViewButton = screen.getByRole('button', { name: /table view/i });
    expect(tableViewButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles filter visibility with persistence', async () => {
    localStorage.setItem('taskViewMode', 'table');
    const { user } = render(<TasksPage />);

    expect(screen.getByText(/hide filters/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /hide filters/i }));
    expect(localStorage.getItem('taskFiltersVisible')).toBe('false');
    expect(screen.queryByPlaceholderText('Search tasks...')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /show filters/i }));
    expect(localStorage.getItem('taskFiltersVisible')).toBe('true');
    expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  it('loads additional tasks with load more control', async () => {
    localStorage.setItem('taskViewMode', 'table');
    const manyTasks: Task[] = Array.from({ length: 60 }).map((_, index) => ({
      id: `task-${index}`,
      title: `Task ${index}`,
      creation_date: new Date().toISOString(),
      priority: Priority.MEDIUM,
      difficulty: Difficulty.MEDIUM,
      duration: Duration.SHORT,
      is_complete: false,
      is_habit: false,
      tags: [],
      subtasks: [],
      dependencies: [],
      streak_current: 0,
      streak_best: 0,
      history: [],
      score: 100,
    }));

    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: manyTasks,
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      fetchTasks: vi.fn().mockResolvedValue(undefined),
      hasCompletedData: true,
      createTask: mockCreateTask,
      saveTask: mockSaveTask,
      deleteTask: mockDeleteTask,
      completeTask: mockCompleteTask,
      uncompleteTask: mockUncompleteTask,
      isLoading: false,
    } as unknown as ReturnType<typeof stores.useTaskStore>);
    (stores.useTaskStore as unknown as { getState: () => { tasks: Task[] } }).getState = vi.fn(() => ({
      tasks: manyTasks,
    }));
    vi.mocked(stores.useFilteredTasks).mockReturnValue(manyTasks);
    vi.mocked(taskStore.useFilteredTasks).mockReturnValue(manyTasks);

    const { user } = render(<TasksPage />);

    await screen.findByRole('button', { name: /table view/i });

    await waitFor(() => {
      expect(screen.getByText(/Showing 50 of 60 tasks/i)).toBeInTheDocument();
    });

    const loadMoreButton = await screen.findByRole('button', { name: /load more/i }, { timeout: 5000 });
    expect(loadMoreButton).toBeEnabled();

    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(screen.getByText(/Showing 60 of 60 tasks/i)).toBeInTheDocument();
    });

    expect(loadMoreButton).toBeDisabled();
  });
});
