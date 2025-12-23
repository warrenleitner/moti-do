import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import TasksPage from './TasksPage';
import * as stores from '../store';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useFilteredTasks: vi.fn(),
  useUserStore: vi.fn(),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      filters: { status: 'active' as const },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      fetchTasks: vi.fn(),
      createTask: vi.fn(),
      saveTask: vi.fn(),
      deleteTask: vi.fn(),
      completeTask: vi.fn(),
      uncompleteTask: vi.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue([]);
    vi.mocked(stores.useUserStore).mockReturnValue({
      fetchStats: vi.fn(),
    } as unknown as ReturnType<typeof stores.useUserStore>);
  });

  it('renders without crashing', () => {
    render(<TasksPage />);
    // Use heading role with level to find the specific Tasks h4 heading
    const headings = screen.getAllByRole('heading', { name: /Tasks/i });
    expect(headings.length).toBeGreaterThan(0);
  });

  it('shows create task button', () => {
    render(<TasksPage />);
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
  });

  it('opens task form when create clicked', async () => {
    const { user } = render(<TasksPage />);
    await user.click(screen.getByRole('button', { name: /new task/i }));
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('displays task list', () => {
    render(<TasksPage />);
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });
});
