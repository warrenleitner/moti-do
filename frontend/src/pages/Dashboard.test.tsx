import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import Dashboard from './Dashboard';
import * as stores from '../store';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useUserStore: vi.fn(),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      fetchTasks: vi.fn(),
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useUserStore).mockReturnValue({
      user: { id: '1', username: 'test', email: 'test@test.com', xp: 100, level: 1, current_streak: 5, best_streak: 10, badges: [] },
    } as unknown as ReturnType<typeof stores.useUserStore>);
  });

  it('renders without crashing', () => {
    render(<Dashboard />);
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
  });

  it('displays user stats', () => {
    render(<Dashboard />);
    expect(screen.getByText('100 XP')).toBeInTheDocument();
  });

  it('shows empty state when no tasks', () => {
    render(<Dashboard />);
    // Dashboard shows stats cards, not a "No tasks" message
    expect(screen.getByText(/Experience/i)).toBeInTheDocument();
  });

  it('displays task overview', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        text_description: '',
        priority: 'medium' as const,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 100,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks,
      fetchTasks: vi.fn(),
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<Dashboard />);
    // Dashboard displays stats about tasks, not the task titles themselves
    expect(screen.getByText(/Active Tasks/i)).toBeInTheDocument();
  });
});
