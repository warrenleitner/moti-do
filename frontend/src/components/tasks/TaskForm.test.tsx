import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import TaskForm from './TaskForm';
import * as stores from '../../store';

vi.mock('../../store', () => ({
  useTaskStore: vi.fn(() => ({
    tasks: [],
  })),
}));

describe('TaskForm', () => {
  const defaultProps = {
    open: true,
    onSave: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
    } as ReturnType<typeof stores.useTaskStore>);
  });

  it('renders when open', () => {
    render(<TaskForm {...defaultProps} />);
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(<TaskForm {...defaultProps} open={false} />);
    expect(container.querySelector('input[name="title"]')).not.toBeInTheDocument();
  });

  it('calls onSave when form submitted', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'New Task');
    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClose when cancel clicked', async () => {
    const onClose = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('loads existing task data', () => {
    const task = {
      id: '1',
      title: 'Existing Task',
      text_description: 'Description',
      priority: 'high' as const,
      difficulty: 'medium' as const,
      duration: 'short' as const,
      is_complete: false,
      subtasks: [],
      tags: [],
      dependencies: [],
      score: 100,
      creation_date: new Date().toISOString(),
    };

    render(<TaskForm {...defaultProps} task={task} />);
    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument();
  });

  it('allows editing task fields', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'Test Task');
    expect(titleInput).toHaveValue('Test Task');
  });

  it('toggles recurring task option', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);
    const recurringSwitch = screen.getByLabelText(/recurring/i);
    await user.click(recurringSwitch);
    expect(recurringSwitch).toBeChecked();
  });

  it('validates required fields', async () => {
    const onSave = vi.fn();
    render(<TaskForm {...defaultProps} onSave={onSave} />);

    // Button should be disabled when title is empty
    const createButton = screen.getByRole('button', { name: /create task/i });
    expect(createButton).toBeDisabled();
  });
});
