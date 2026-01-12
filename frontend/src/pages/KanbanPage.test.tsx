import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import KanbanPage from './KanbanPage';
import * as stores from '../store';
import * as userStore from '../store/userStore';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
}));

vi.mock('../store/userStore', () => ({
  useUserStore: vi.fn(),
  useSystemStatus: vi.fn(),
  useDefinedProjects: vi.fn(() => []),
  useDefinedTags: vi.fn(() => []),
}));

describe('KanbanPage', () => {
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
    subtasks: [],
    dependencies: [],
    streak_current: 0,
    streak_best: 0,
    history: [],
    score: 100,
  };

  const mockUpdateTask = vi.fn();
  const mockAddTask = vi.fn();
  const mockSetFilters = vi.fn();
  const mockResetFilters = vi.fn();
  const mockCompleteTask = vi.fn().mockResolvedValue({ task: mockTask, xp_earned: 100 });
  const mockUncompleteTask = vi.fn().mockResolvedValue(undefined);
  const mockFetchStats = vi.fn().mockResolvedValue(undefined);
  const mockFetchTasks = vi.fn().mockResolvedValue(undefined);
  const mockSetSort = vi.fn();

  const defaultFilters = {
    status: 'active' as const,
    priorities: [] as Priority[],
    difficulties: [] as Difficulty[],
    durations: [] as Duration[],
    projects: [] as string[],
    tags: [] as string[],
    search: '',
    includeBlocked: false,
  };

  const defaultSort = {
    field: 'priority' as const,
    order: 'desc' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [mockTask],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
      completeTask: mockCompleteTask,
      uncompleteTask: mockUncompleteTask,
      filters: defaultFilters,
      setFilters: mockSetFilters,
      resetFilters: mockResetFilters,
      sort: defaultSort,
      setSort: mockSetSort,
      fetchTasks: mockFetchTasks,
      hasCompletedData: true,
    } as unknown as ReturnType<typeof stores.useTaskStore>);
    vi.mocked(userStore.useUserStore).mockReturnValue({
      fetchStats: mockFetchStats,
    } as unknown as ReturnType<typeof userStore.useUserStore>);
    vi.mocked(userStore.useSystemStatus).mockReturnValue({
      last_processed_date: '2024-01-15',
      pending_days: 0,
    });
  });

  // Since KanbanPage is wrapped in /* v8 ignore start/stop */,
  // these are integration tests only, not for coverage.
  // Keep tests simple to verify basic rendering and structure.

  it('renders without crashing', () => {
    render(<KanbanPage />);
    // Page renders with the kanban columns
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
  });

  it('displays kanban board columns', () => {
    render(<KanbanPage />);
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
  });

  it('displays task in kanban board', () => {
    render(<KanbanPage />);
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });
});
