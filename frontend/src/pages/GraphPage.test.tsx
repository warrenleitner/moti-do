import { render, screen, waitFor, fireEvent } from '../test/utils';
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import GraphPage from './GraphPage';
import * as stores from '../store';
import type { Task } from '../types';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
}));

// Mock DependencyGraph to simplify testing
vi.mock('../components/graph', () => ({
  DependencyGraph: ({ tasks, onSelectTask }: { tasks: Task[]; onSelectTask: (task: Task) => void }) => (
    <div data-testid="dependency-graph">
      {tasks.length === 0 ? (
        <div>No Dependencies</div>
      ) : (
        tasks.map((task) => (
          <button key={task.id} onClick={() => onSelectTask(task)} data-testid={`graph-task-${task.id}`}>
            {task.title}
          </button>
        ))
      )}
    </div>
  ),
}));

// Mock TaskCard to simplify testing
vi.mock('../components/tasks', () => ({
  TaskCard: ({ task, onComplete }: { task: Task; onComplete: (id: string) => void; onEdit: () => void; onDelete: () => void }) => (
    <div data-testid={`task-card-${task.id}`}>
      <div>{task.title}</div>
      <input
        type="checkbox"
        checked={task.is_complete}
        onChange={() => onComplete(task.id)}
        data-testid={`checkbox-${task.id}`}
      />
    </div>
  ),
}));

describe('GraphPage', () => {
  const mockUpdateTask = vi.fn();

  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: '1',
    title: 'Test Task',
    description: '',
    text_description: '',
    is_complete: false,
    priority: 'medium',
    difficulty: 'medium',
    duration: 'medium',
    tags: [],
    project: null,
    dependencies: [],
    subtasks: [],
    is_habit: false,
    schedule_type: 'none',
    created_date: '2024-01-01',
    due_date: null,
    completion_date: null,
    score: 0,
    xp: 10,
    recurrence: null,
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);
  });

  it('renders without crashing', () => {
    render(<GraphPage />);
    const headings = screen.getAllByText(/Dependency Graph/i);
    expect(headings[0]).toBeInTheDocument();
  });

  it('displays empty state when no tasks', () => {
    render(<GraphPage />);
    expect(screen.getByText(/No Dependencies/i)).toBeInTheDocument();
  });

  it('shows description text', () => {
    render(<GraphPage />);
    expect(screen.getByText(/Visualize task dependencies/i)).toBeInTheDocument();
  });

  it('opens drawer when task is selected', async () => {
    const task = createMockTask({ id: '1', title: 'Task 1' });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });
  });

  it('closes drawer when close button is clicked', async () => {
    const user = userEvent.setup();
    const task = createMockTask({ id: '1', title: 'Task 1' });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Mantine Drawer close button with explicit aria-label
    const closeButton = screen.getByRole('button', { name: /close drawer/i });
    expect(closeButton).toBeDefined();
    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Task Details')).not.toBeInTheDocument();
    });
  });

  it('completes a task', async () => {
    const task = createMockTask({ id: '1', title: 'Task 1', is_complete: false });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Find and click checkbox in TaskCard
    const checkbox = screen.getByTestId('checkbox-1');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        is_complete: true,
      }));
    });
    // Notification renders in a portal (via @mantine/notifications)
  });

  it('marks task incomplete', async () => {
    const task = createMockTask({ id: '1', title: 'Task 1', is_complete: true });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    // Find and click checkbox
    const checkbox = screen.getByTestId('checkbox-1');
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(mockUpdateTask).toHaveBeenCalledWith('1', expect.objectContaining({
        is_complete: false,
      }));
    });
    // Notification renders in a portal (via @mantine/notifications)
  });

  it('displays task dependencies', async () => {
    const dep = createMockTask({ id: 'dep1', title: 'Dependency Task' });
    const task = createMockTask({ id: '1', title: 'Task 1', dependencies: ['dep1'] });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task, dep],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    // Wait for drawer to open
    await screen.findByText('Task Details');

    // Check for dependencies section
    expect(await screen.findByText(/Dependencies \(1\)/i)).toBeInTheDocument();
    // Check that the dependency task card is rendered
    expect(screen.getByTestId('task-card-dep1')).toBeInTheDocument();
  });

  it('displays tasks that depend on selected task (blocking)', async () => {
    const task = createMockTask({ id: '1', title: 'Task 1' });
    const dependent = createMockTask({ id: 'dep1', title: 'Dependent Task', dependencies: ['1'] });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task, dependent],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    // Wait for drawer to open
    await screen.findByText('Task Details');

    // Check for blocking section
    expect(await screen.findByText(/Blocking \(1\)/i)).toBeInTheDocument();
    // Check that the dependent task card is rendered
    expect(screen.getByTestId('task-card-dep1')).toBeInTheDocument();
  });

  it('does not show blocking section when no dependents', async () => {
    const task = createMockTask({ id: '1', title: 'Task 1' });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    await waitFor(() => {
      expect(screen.getByText('Task Details')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Blocking/i)).not.toBeInTheDocument();
  });

  it('handles missing dependency task gracefully', async () => {
    // Task with dependency that doesn't exist in tasks list
    const task = createMockTask({ id: '1', title: 'Task 1', dependencies: ['missing-dep'] });
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [task],
      updateTask: mockUpdateTask,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<GraphPage />);

    // Open drawer
    const graphTask = screen.getByTestId('graph-task-1');
    fireEvent.click(graphTask);

    // Wait for drawer to open
    await screen.findByText('Task Details');

    // Should show dependencies header but not crash
    expect(await screen.findByText(/Dependencies \(1\)/i)).toBeInTheDocument();
    // The missing dependency should not render, so we shouldn't see it
  });
});
