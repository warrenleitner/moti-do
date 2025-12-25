import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import KanbanPage from './KanbanPage';
import * as stores from '../store';
import { Priority, Difficulty, Duration } from '../types';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [mockTask],
      updateTask: mockUpdateTask,
      addTask: mockAddTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);
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
