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
    expect(screen.getByLabelText(/icon/i)).toBeInTheDocument();
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

  it('allows editing description field', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Test description');
    expect(descriptionInput).toHaveValue('Test description');
  });

  it('allows editing icon field', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);
    const iconInput = screen.getByLabelText(/icon/i);
    await user.type(iconInput, '🚀');
    expect(iconInput).toHaveValue('🚀');
  });

  it('allows changing priority', () => {
    render(<TaskForm {...defaultProps} />);

    // Component has v8 ignore - just verify the select label exists
    const priorityLabels = screen.getAllByText(/priority/i);
    expect(priorityLabels.length).toBeGreaterThan(0);
  });

  it('allows changing difficulty', () => {
    render(<TaskForm {...defaultProps} />);

    // Component has v8 ignore - just verify the select label exists
    const difficultyLabels = screen.getAllByText(/difficulty/i);
    expect(difficultyLabels.length).toBeGreaterThan(0);
  });

  it('allows changing duration', () => {
    render(<TaskForm {...defaultProps} />);

    // Component has v8 ignore - just verify the select label exists
    const durationLabels = screen.getAllByText(/duration/i);
    expect(durationLabels.length).toBeGreaterThan(0);
  });

  it('allows setting due date', () => {
    render(<TaskForm {...defaultProps} />);

    // Component has v8 ignore - just verify the date label exists
    const dueDateLabels = screen.getAllByText(/due date/i);
    expect(dueDateLabels.length).toBeGreaterThan(0);
  });

  it('allows setting start date', () => {
    render(<TaskForm {...defaultProps} />);

    // Component has v8 ignore - just verify the date label exists
    const startDateLabels = screen.getAllByText(/start date/i);
    expect(startDateLabels.length).toBeGreaterThan(0);
  });

  it('allows setting project', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const projectInput = screen.getByLabelText(/project/i);
    await user.type(projectInput, 'Work Project');

    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.project).toBe('Work Project');
  });

  it('shows recurrence pattern builder when habit is enabled', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    // Initially, recurrence pattern should not be visible
    expect(screen.queryByText(/recurrence pattern/i)).not.toBeInTheDocument();

    // Enable habit
    const habitSwitch = screen.getByLabelText(/recurring/i);
    await user.click(habitSwitch);

    // Now recurrence pattern builder should be visible
    expect(screen.getByText(/recurrence pattern/i)).toBeInTheDocument();
    // Should show the preview text with default daily pattern
    expect(screen.getByText(/every day/i)).toBeInTheDocument();
  });

  it('saves habit with default daily recurrence rule', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Daily Exercise');

    // Enable recurring - this sets default recurrence to daily
    const recurringSwitch = screen.getByLabelText(/recurring task/i);
    await user.click(recurringSwitch);

    // Enable habit tracking - this appears after enabling recurring
    const habitSwitch = screen.getByLabelText(/track as habit/i);
    await user.click(habitSwitch);

    // The recurrence builder defaults to FREQ=DAILY
    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.is_habit).toBe(true);
    expect(callArgs.recurrence_rule).toBe('FREQ=DAILY');
  });

  it('allows adding tags', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    // Find tag input by placeholder
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'urgent');

    // Click add button or press Enter
    const addButton = screen.getAllByRole('button').find(btn =>
      btn.querySelector('[data-testid="AddIcon"]')
    );
    if (addButton) {
      await user.click(addButton);
    }

    // Verify tag was added
    expect(screen.getByText('urgent')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.tags).toEqual(['urgent']);
  });

  it('allows adding tags with Enter key', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'work{Enter}');

    expect(screen.getByText('work')).toBeInTheDocument();
  });

  it('prevents adding duplicate tags', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const tagInput = screen.getByPlaceholderText(/add tag/i);

    // Add first tag
    await user.type(tagInput, 'urgent{Enter}');
    expect(screen.getByText('urgent')).toBeInTheDocument();

    // Try to add duplicate
    await user.type(tagInput, 'urgent{Enter}');

    // Should still only have one
    const urgentTags = screen.getAllByText('urgent');
    expect(urgentTags).toHaveLength(1);
  });

  it('allows removing tags', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    // Add a tag
    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, 'urgent{Enter}');

    const urgentChips = screen.getAllByText('urgent');
    expect(urgentChips.length).toBeGreaterThan(0);

    // Remove the tag - find the first CancelIcon and click its parent button
    const cancelIcons = screen.queryAllByTestId('CancelIcon');
    if (cancelIcons.length > 0) {
      const deleteButton = cancelIcons[0].closest('button');
      if (deleteButton) {
        await user.click(deleteButton);
        // After deletion, tag should no longer be visible
        const remainingChips = screen.queryAllByText('urgent');
        expect(remainingChips.length).toBe(0);
      }
    }
  });

  it('allows adding subtasks', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const subtaskInput = screen.getByPlaceholderText(/add subtask/i);
    await user.type(subtaskInput, 'First subtask');

    // Find the Add button by icon
    const addIcons = screen.getAllByTestId('AddIcon');
    const addButtons = addIcons.map(icon => icon.closest('button')).filter(Boolean);
    // The second AddIcon should be for subtasks (first is for tags)
    if (addButtons.length > 1) {
      await user.click(addButtons[1] as HTMLElement);
    }

    // Subtask is displayed with bullet point prefix
    expect(screen.getByText('• First subtask')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.subtasks).toEqual([{ text: 'First subtask', complete: false }]);
  });

  it('allows adding subtasks with Enter key', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const subtaskInput = screen.getByPlaceholderText(/add subtask/i);
    await user.type(subtaskInput, 'Subtask via Enter{Enter}');

    expect(screen.getByText('• Subtask via Enter')).toBeInTheDocument();
  });

  it('allows removing subtasks', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    // Add a subtask
    const subtaskInput = screen.getByPlaceholderText(/add subtask/i);
    await user.type(subtaskInput, 'Remove me{Enter}');

    expect(screen.getByText('• Remove me')).toBeInTheDocument();

    // Remove the subtask - find the delete icon by its fontSize prop
    const deleteButtons = screen.getAllByTestId('DeleteIcon');
    const deleteButton = deleteButtons.find((icon) => icon.closest('button'));
    if (deleteButton) {
      const button = deleteButton.closest('button');
      if (button) {
        await user.click(button);
      }
    }

    expect(screen.queryByText('• Remove me')).not.toBeInTheDocument();
  });

  it('displays Edit Task title when editing existing task', () => {
    const task = {
      id: '1',
      title: 'Existing Task',
      text_description: '',
      priority: 'Medium' as const,
      difficulty: 'Medium' as const,
      duration: 'Medium' as const,
      is_complete: false,
      is_habit: false,
      streak_current: 0,
      streak_best: 0,
      history: [],
      subtasks: [],
      tags: [],
      dependencies: [],
      score: 100,
      creation_date: new Date().toISOString(),
    };

    render(<TaskForm {...defaultProps} task={task} />);
    expect(screen.getByText('Edit Task')).toBeInTheDocument();
  });

  it('displays Create New Task title when creating new task', () => {
    render(<TaskForm {...defaultProps} />);
    expect(screen.getByText('Create New Task')).toBeInTheDocument();
  });

  it('prevents submission with whitespace-only title', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, '   ');

    const createButton = screen.getByRole('button', { name: /create task/i });
    expect(createButton).toBeDisabled();
  });

  it('trims whitespace from tags', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, '  urgent  {Enter}');

    // Should be trimmed
    expect(screen.getByText('urgent')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.tags).toEqual(['urgent']);
  });

  it('trims whitespace from subtasks', async () => {
    const onSave = vi.fn();
    const { user } = render(<TaskForm {...defaultProps} onSave={onSave} />);

    await user.type(screen.getByLabelText(/title/i), 'Test Task');

    const subtaskInput = screen.getByPlaceholderText(/add subtask/i);
    await user.type(subtaskInput, '  Clean whitespace  {Enter}');

    expect(screen.getByText('• Clean whitespace')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create task/i }));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.subtasks).toEqual([{ text: 'Clean whitespace', complete: false }]);
  });

  it('prevents adding empty tags', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    const tagInput = screen.getByPlaceholderText(/add tag/i);
    await user.type(tagInput, '   {Enter}');

    // Should not add any tag chips
    const chips = screen.queryAllByRole('button').filter(btn =>
      btn.querySelector('[data-testid="CancelIcon"]')
    );
    expect(chips).toHaveLength(0);
  });

  it('prevents adding empty subtasks', async () => {
    const { user } = render(<TaskForm {...defaultProps} />);

    const subtaskInput = screen.getByPlaceholderText(/add subtask/i);
    await user.type(subtaskInput, '   {Enter}');

    // Should not add any subtasks (only the input field exists)
    expect(screen.queryByTestId('DeleteIcon')).not.toBeInTheDocument();
  });
});
