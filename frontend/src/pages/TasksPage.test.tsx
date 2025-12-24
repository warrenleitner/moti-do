import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import TasksPage from './TasksPage';
import * as stores from '../store';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useFilteredTasks: vi.fn(),
  useUserStore: vi.fn(),
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
      filters: { status: 'active' as const },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      fetchTasks: vi.fn(),
      createTask: mockCreateTask,
      saveTask: mockSaveTask,
      deleteTask: mockDeleteTask,
      completeTask: mockCompleteTask,
      uncompleteTask: mockUncompleteTask,
      isLoading: false,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    // Mock getState for subtask toggle
    (stores.useTaskStore as unknown as { getState: () => { tasks: Task[] } }).getState = vi.fn(() => ({
      tasks: [mockTask],
    }));

    vi.mocked(stores.useFilteredTasks).mockReturnValue([mockTask]);
    vi.mocked(stores.useUserStore).mockReturnValue({
      fetchStats: mockFetchStats,
    } as unknown as ReturnType<typeof stores.useUserStore>);
  });

  // Since TasksPage is wrapped in /* v8 ignore start/stop */,
  // these are integration tests only, not for coverage.
  // Keep tests simple to verify basic rendering and structure.

  it('renders without crashing', () => {
    render(<TasksPage />);
    const headings = screen.getAllByRole('heading', { name: /Tasks/i });
    expect(headings.length).toBeGreaterThan(0);
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
});
