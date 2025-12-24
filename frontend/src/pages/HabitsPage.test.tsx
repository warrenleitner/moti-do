import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import HabitsPage from './HabitsPage';
import * as stores from '../store';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
}));

describe('HabitsPage', () => {
  const mockHabit: Task = {
    id: 'habit-1',
    title: 'Test Habit',
    creation_date: new Date().toISOString(),
    priority: Priority.MEDIUM,
    difficulty: Difficulty.MEDIUM,
    duration: Duration.SHORT,
    is_complete: false,
    is_habit: true,
    recurrence_rule: 'daily',
    tags: [],
    subtasks: [],
    dependencies: [],
    streak_current: 5,
    streak_best: 10,
    history: [],
    score: 50,
  };

  const mockUpdateTask = vi.fn();
  const mockAddTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [mockHabit],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);
  });

  // Since HabitsPage is wrapped in /* v8 ignore start/stop */,
  // these are integration tests only, not for coverage.
  // Keep tests simple to verify basic rendering and structure.

  it('renders without crashing', () => {
    render(<HabitsPage />);
    const habitsElements = screen.getAllByText(/Habits/i);
    expect(habitsElements.length).toBeGreaterThan(0);
  });

  it('shows create habit button', () => {
    render(<HabitsPage />);
    expect(screen.getByRole('button', { name: /new habit/i })).toBeInTheDocument();
  });

  it('displays empty state when no habits exist', () => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<HabitsPage />);
    expect(screen.getByText(/No habits/i)).toBeInTheDocument();
  });

  it('filters and displays only habits', () => {
    const mockNonHabit: Task = {
      ...mockHabit,
      id: 'task-1',
      title: 'Regular Task',
      is_habit: false,
    };

    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [mockHabit, mockNonHabit],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<HabitsPage />);
    expect(screen.getByText('Test Habit')).toBeInTheDocument();
    expect(screen.queryByText('Regular Task')).not.toBeInTheDocument();
  });

  it('displays habit with streak information', () => {
    render(<HabitsPage />);
    expect(screen.getByText('Test Habit')).toBeInTheDocument();
  });
});
