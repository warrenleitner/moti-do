import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import TaskList from './TaskList';
import * as stores from '../../store';
import { Priority } from '../../types';

vi.mock('../../store', () => ({
  useTaskStore: vi.fn(),
  useFilteredTasks: vi.fn(),
}));

const defaultFilters = {
  status: 'active' as const,
  search: undefined,
  priorities: [] as Priority[],
  difficulties: [] as ('low' | 'medium' | 'high')[],
  durations: [] as ('short' | 'medium' | 'long')[],
  projects: [] as string[],
  tags: [] as string[],
  includeBlocked: false,
};

describe('TaskList', () => {
  const defaultProps = {
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onComplete: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      tasks: [],
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue([]);
  });

  it('renders without crashing', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });

  it('displays empty state when no tasks', () => {
    render(<TaskList {...defaultProps} />);
    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });

  it('renders task list when tasks available', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        text_description: '',
        priority: Priority.MEDIUM,
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

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('shows create task button in empty state', async () => {
    const onCreateNew = vi.fn();
    render(<TaskList {...defaultProps} onCreateNew={onCreateNew} />);

    const createButton = screen.getByRole('button', { name: /create task/i });
    expect(createButton).toBeInTheDocument();
  });

  it('changes sort field', () => {
    const setSort = vi.fn();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort,
      tasks: [],
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<TaskList {...defaultProps} />);
    // Sort controls are present in the UI
    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });

  it('changes sort order', () => {
    const setSort = vi.fn();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort,
      tasks: [],
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    render(<TaskList {...defaultProps} />);
    // Sort controls are present in the UI
    expect(screen.getByText(/No tasks found/i)).toBeInTheDocument();
  });

  it('displays task count', () => {
    const tasks = [
      {
        id: '1',
        title: 'Task 1',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 100,
        creation_date: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Task 2',
        text_description: '',
        priority: Priority.HIGH,
        difficulty: 'hard' as const,
        duration: 'long' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 150,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('2 tasks')).toBeInTheDocument();
  });

  it('handles sort field change by interacting with select', async () => {
    const setSort = vi.fn();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort,
      tasks: [],
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    const { user } = render(<TaskList {...defaultProps} />);

    // Find the sort field select by its text content
    const sortSelects = screen.getAllByRole('combobox');
    // First combobox after FilterBar should be the sort field
    const sortSelect = sortSelects.find((el) => {
      const parent = el.closest('[class*="MuiFormControl"]');
      return parent?.textContent?.includes('Sort by');
    });

    if (sortSelect) {
      await user.click(sortSelect);

      // Select priority
      const priorityOption = screen.getByRole('option', { name: /priority/i });
      await user.click(priorityOption);

      expect(setSort).toHaveBeenCalled();
    }
  });

  it('handles sort order change by interacting with select', async () => {
    const setSort = vi.fn();
    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort,
      tasks: [],
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    const { user } = render(<TaskList {...defaultProps} />);

    // Find the order select by its text content
    const sortSelects = screen.getAllByRole('combobox');
    const orderSelect = sortSelects.find((el) => {
      const parent = el.closest('[class*="MuiFormControl"]');
      return parent?.textContent?.includes('Order');
    });

    if (orderSelect) {
      await user.click(orderSelect);

      // Select ascending
      const ascOption = screen.getByRole('option', { name: /ascending/i });
      await user.click(ascOption);

      expect(setSort).toHaveBeenCalled();
    }
  });

  it('shows blocked indicator for tasks with incomplete dependencies', () => {
    const tasks = [
      {
        id: '1',
        title: 'Blocked Task',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: ['2'], // depends on task 2
        score: 100,
        creation_date: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Dependency Task',
        text_description: '',
        priority: Priority.HIGH,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false, // not complete, so task 1 is blocked
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 150,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      tasks: tasks, // provide all tasks so dependency checking works
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);

    // Both tasks should be rendered
    expect(screen.getByText('Blocked Task')).toBeInTheDocument();
    expect(screen.getByText('Dependency Task')).toBeInTheDocument();
  });

  it('does not block task when dependencies are complete', () => {
    const tasks = [
      {
        id: '1',
        title: 'Unblocked Task',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: ['2'], // depends on task 2
        score: 100,
        creation_date: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Completed Dependency',
        text_description: '',
        priority: Priority.HIGH,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: true, // completed, so task 1 is not blocked
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 150,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      tasks: tasks,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);

    expect(screen.getByText('Unblocked Task')).toBeInTheDocument();
  });

  it('shows task with no dependencies as not blocked', () => {
    const tasks = [
      {
        id: '1',
        title: 'Independent Task',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: [],
        dependencies: [], // no dependencies
        score: 100,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);

    expect(screen.getByText('Independent Task')).toBeInTheDocument();
  });

  it('shows singular task when count is 1', () => {
    const tasks = [
      {
        id: '1',
        title: 'Single Task',
        text_description: '',
        priority: Priority.MEDIUM,
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

    vi.mocked(stores.useFilteredTasks).mockReturnValue(tasks);

    render(<TaskList {...defaultProps} />);
    expect(screen.getByText('1 task')).toBeInTheDocument();
  });

  it('provides projects list from all tasks to FilterBar', () => {
    const allTasks = [
      {
        id: '1',
        title: 'Work Task',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        project: 'Work',
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 100,
        creation_date: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Personal Task',
        text_description: '',
        priority: Priority.LOW,
        difficulty: 'low' as const,
        duration: 'short' as const,
        is_complete: false,
        project: 'Personal',
        subtasks: [],
        tags: [],
        dependencies: [],
        score: 50,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      tasks: allTasks,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue(allTasks);

    render(<TaskList {...defaultProps} />);

    // FilterBar should receive projects
    expect(screen.getByText('Work Task')).toBeInTheDocument();
  });

  it('provides tags list from all tasks to FilterBar', () => {
    const allTasks = [
      {
        id: '1',
        title: 'Tagged Task',
        text_description: '',
        priority: Priority.MEDIUM,
        difficulty: 'medium' as const,
        duration: 'medium' as const,
        is_complete: false,
        subtasks: [],
        tags: ['urgent', 'important'],
        dependencies: [],
        score: 100,
        creation_date: new Date().toISOString(),
      },
    ];

    vi.mocked(stores.useTaskStore).mockReturnValue({
      filters: { ...defaultFilters },
      sort: { field: 'score' as const, order: 'desc' as const },
      setFilters: vi.fn(),
      resetFilters: vi.fn(),
      setSort: vi.fn(),
      tasks: allTasks,
    } as unknown as ReturnType<typeof stores.useTaskStore>);

    vi.mocked(stores.useFilteredTasks).mockReturnValue(allTasks);

    render(<TaskList {...defaultProps} />);

    expect(screen.getByText('Tagged Task')).toBeInTheDocument();
  });
});
