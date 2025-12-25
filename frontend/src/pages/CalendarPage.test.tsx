import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import CalendarPage from './CalendarPage';
import * as stores from '../store';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
  useUserStore: vi.fn(),
}));

describe('CalendarPage', () => {
  const mockTask: Task = {
    id: 'task-1',
    title: 'Test Task',
    creation_date: new Date().toISOString(),
    due_date: new Date(2024, 5, 15).toISOString(), // June 15, 2024
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [mockTask],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useUserStore).mockReturnValue({
      fetchStats: vi.fn(),
    } as unknown as ReturnType<typeof stores.useUserStore>);
  });

  // Since CalendarPage is wrapped in /* v8 ignore start/stop */,
  // these are integration tests only, not for coverage.
  // Keep tests simple to verify basic rendering and structure.

  it('renders without crashing', () => {
    render(<CalendarPage />);
    // Page renders with the calendar description
    expect(screen.getByText(/View and manage tasks by their due dates/i)).toBeInTheDocument();
  });

  it('displays calendar view', () => {
    render(<CalendarPage />);
    // Calendar should render some month/year text
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    expect(screen.getByText(new RegExp(currentMonth, 'i'))).toBeInTheDocument();
  });

  it('shows calendar navigation controls', () => {
    render(<CalendarPage />);
    // Verify the calendar navigation is present
    expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
  });

  it('displays helper text for calendar usage', () => {
    render(<CalendarPage />);
    expect(screen.getByText(/view and manage tasks by their due dates/i)).toBeInTheDocument();
    expect(screen.getByText(/click on a date to create a new task/i)).toBeInTheDocument();
  });
});
