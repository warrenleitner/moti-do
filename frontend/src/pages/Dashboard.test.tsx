import { render, screen } from '../test/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

// Mock useMediaQuery — return `false` (mobile) by default so single-column renders
vi.mock('@mantine/hooks', async () => {
  const actual = await vi.importActual<typeof import('@mantine/hooks')>('@mantine/hooks');
  return { ...actual, useMediaQuery: vi.fn(() => false) };
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      fetchTasks: vi.fn(),
      completeTask: vi.fn().mockResolvedValue({ xp_earned: 10 }),
      createTask: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useUserStore).mockReturnValue({
      user: { id: '1', username: 'test', email: 'test@test.com', xp: 100, level: 1, current_streak: 5, best_streak: 10, badges: [] },
      isLoading: false,
      resetScoreTracking: vi.fn(),
      advanceDate: vi.fn(),
    } as unknown as ReturnType<typeof stores.useUserStore>);

    vi.mocked(userStoreSelectors.useUserStats).mockReturnValue(undefined);
    vi.mocked(userStoreSelectors.useSystemStatus).mockReturnValue({
      vacation_mode: false,
      pending_days: 0,
      last_processed_date: '2024-01-01',
      current_date: '2024-01-02',
      timezone: null,
    });
  });

  it('renders XP progress ring with level', () => {
    render(<Dashboard />);
    expect(screen.getByText('LVL 1')).toBeInTheDocument();
  });

  it('renders the system loader label', () => {
    render(<Dashboard />);
    expect(screen.getByText('CORE_SYSTEM_XP_LOADER')).toBeInTheDocument();
  });

  it('shows stat cards', () => {
    render(<Dashboard />);
    expect(screen.getByText('ACTIVE_TASKS')).toBeInTheDocument();
  });

  it('displays tasks when present', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        text_description: '',
        priority: 'Medium' as const,
        difficulty: 'Medium' as const,
        duration: 'Medium' as const,
        is_complete: false,
        is_habit: false,
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 100,
        penalty_score: 0,
        net_score: 100,
        streak_current: 0,
        streak_best: 0,
        current_count: 0,
        history: [],
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks,
      fetchTasks: vi.fn(),
      completeTask: vi.fn().mockResolvedValue({ xp_earned: 10 }),
      createTask: vi.fn().mockResolvedValue({}),
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<Dashboard />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('shows crisis card when pending_days > 0', () => {
    vi.mocked(userStoreSelectors.useSystemStatus).mockReturnValue({
      vacation_mode: false,
      pending_days: 3,
      last_processed_date: '2024-01-01',
      current_date: '2024-01-04',
      timezone: null,
    });

    render(<Dashboard />);
    expect(screen.getByText('CRISIS DETECTED')).toBeInTheDocument();
    expect(screen.getByText('3 CYCLES UNPROCESSED')).toBeInTheDocument();
  });

  it('shows INITIATE NEW MISSION button on mobile', () => {
    render(<Dashboard />);
    expect(screen.getByRole('button', { name: /initiate new mission/i })).toBeInTheDocument();
  });
});
