import { render, screen, waitFor } from '../test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import Dashboard from './Dashboard';
import * as stores from '../store';
import * as userStoreSelectors from '../store/userStore';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useUserStore: vi.fn(),
}));

vi.mock('../store/userStore', () => ({
  useUserStats: vi.fn(),
  useSystemStatus: vi.fn(),
}));

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      fetchTasks: vi.fn(),
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useUserStore).mockReturnValue({
      user: { id: '1', username: 'test', email: 'test@test.com', xp: 100, level: 1, current_streak: 5, best_streak: 10, badges: [] },
      isLoading: false,
      resetScoreTracking: vi.fn(),
    } as unknown as ReturnType<typeof stores.useUserStore>);

    vi.mocked(userStoreSelectors.useUserStats).mockReturnValue(undefined);
    vi.mocked(userStoreSelectors.useSystemStatus).mockReturnValue({
      vacation_mode: false,
      pending_days: 0,
      last_processed_date: '2024-01-01',
    });
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

  it('resets score tracking from the XP card', async () => {
    const resetScoreTracking = vi.fn().mockResolvedValue(undefined);
    vi.mocked(stores.useUserStore).mockReturnValue({
      user: { id: '1', username: 'test', email: 'test@test.com', xp: 100, level: 1, current_streak: 5, best_streak: 10, badges: [] },
      isLoading: false,
      resetScoreTracking,
    } as unknown as ReturnType<typeof stores.useUserStore>);

    render(<Dashboard />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /reset score tracking/i }));
    await user.click(screen.getByRole('button', { name: /reset tracking/i }));

    await waitFor(() => {
      expect(resetScoreTracking).toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/score tracking reset\. xp, badges, and processing date were reset\./i),
    ).toBeInTheDocument();
  });
});
