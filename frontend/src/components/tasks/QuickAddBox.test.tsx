/**
 * Tests for QuickAddBox component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import QuickAddBox from './QuickAddBox';
import * as stores from '../../store';

vi.mock('../../store', () => ({
  useTaskStore: vi.fn(),
}));

describe('QuickAddBox', () => {
  const mockCreateTask = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTask.mockResolvedValue({ id: '1', title: 'Test Task' });
    vi.mocked(stores.useTaskStore).mockImplementation((selector) => {
      const state = { createTask: mockCreateTask };
      return typeof selector === 'function' ? selector(state as never) : state;
    });
  });

  it('renders input field', () => {
    render(<QuickAddBox />);
    expect(screen.getByPlaceholderText(/add a task/i)).toBeInTheDocument();
  });

  it('renders add button', () => {
    render(<QuickAddBox />);
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
  });

  it('add button is disabled when input is empty', () => {
    render(<QuickAddBox />);
    const addButton = screen.getByRole('button', { name: /add task/i });
    expect(addButton).toBeDisabled();
  });

  it('add button is enabled when input has text', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task');

    const addButton = screen.getByRole('button', { name: /add task/i });
    expect(addButton).not.toBeDisabled();
  });

  it('creates task on Enter key', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task{Enter}');

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task',
        })
      );
    });
  });

  it('creates task on add button click', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task');

    const addButton = screen.getByRole('button', { name: /add task/i });
    await user.click(addButton);

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task',
        })
      );
    });
  });

  it('clears input after successful creation', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task{Enter}');

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });

  it('shows success message after task creation', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task{Enter}');

    await waitFor(() => {
      expect(screen.getByText(/task "test task" created/i)).toBeInTheDocument();
    });
  });

  it('calls onTaskCreated callback after creation', async () => {
    const onTaskCreated = vi.fn();
    const { user } = render(<QuickAddBox onTaskCreated={onTaskCreated} />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task{Enter}');

    await waitFor(() => {
      expect(onTaskCreated).toHaveBeenCalled();
    });
  });

  it('shows help text when help button clicked', async () => {
    const { user } = render(<QuickAddBox />);

    const helpButton = screen.getByRole('button', { name: /show syntax help/i });
    await user.click(helpButton);

    expect(screen.getByText(/quick-add syntax/i)).toBeInTheDocument();
  });

  it('shows priority chip when priority modifier used', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task !high');

    expect(screen.getByText(/high/i)).toBeInTheDocument();
  });

  it('shows tag chips when tag modifiers used', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task #work #urgent');

    expect(screen.getByText('#work')).toBeInTheDocument();
    expect(screen.getByText('#urgent')).toBeInTheDocument();
  });

  it('shows project chip when project modifier used', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task ~home');

    expect(screen.getByText('~home')).toBeInTheDocument();
  });

  it('parses priority and passes to createTask', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task !high{Enter}');

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task',
          priority: 'High',
        })
      );
    });
  });

  it('parses tags and passes to createTask', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task #work #urgent{Enter}');

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task',
          tags: ['work', 'urgent'],
        })
      );
    });
  });

  it('parses project and passes to createTask', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Test task ~home{Enter}');

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test task',
          project: 'home',
        })
      );
    });
  });

  it('applies default values for missing fields', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, 'Simple task{Enter}');

    await waitFor(() => {
      expect(mockCreateTask).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Simple task',
          priority: 'Medium',
          difficulty: 'Medium',
          duration: 'Medium',
          is_habit: false,
          subtasks: [],
          dependencies: [],
        })
      );
    });
  });

  it('does not create task with empty title', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, '   {Enter}');

    expect(mockCreateTask).not.toHaveBeenCalled();
  });

  it('does not create task with only modifiers', async () => {
    const { user } = render(<QuickAddBox />);

    const input = screen.getByPlaceholderText(/add a task/i);
    await user.type(input, '!high #tag{Enter}');

    expect(mockCreateTask).not.toHaveBeenCalled();
  });
});
