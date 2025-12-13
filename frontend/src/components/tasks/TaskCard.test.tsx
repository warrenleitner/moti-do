/**
 * Tests for TaskCard component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import TaskCard from './TaskCard';
import type { Task } from '../../types';
import { Priority, Difficulty, Duration } from '../../types';

const mockTask: Task = {
  id: 'test-task-1',
  title: 'Test Task',
  priority: Priority.HIGH,
  difficulty: Difficulty.MEDIUM,
  duration: Duration.SHORT,
  is_complete: false,
  is_habit: false,
  tags: ['work', 'important'],
  subtasks: [
    { text: 'Subtask 1', complete: false },
    { text: 'Subtask 2', complete: true },
  ],
  dependencies: [],
  creation_date: '2025-01-01T10:00:00Z',
  streak_current: 0,
  streak_best: 0,
  history: [],
  text_description: 'This is a test task description',
  project: 'Test Project',
};

const mockHabit: Task = {
  id: 'test-habit-1',
  title: 'Daily Exercise',
  priority: Priority.MEDIUM,
  difficulty: Difficulty.LOW,
  duration: Duration.MEDIUM,
  is_complete: false,
  is_habit: true,
  recurrence_rule: 'daily',
  tags: [],
  subtasks: [],
  dependencies: [],
  creation_date: '2025-01-01T08:00:00Z',
  streak_current: 5,
  streak_best: 10,
  history: [],
};

describe('TaskCard', () => {
  const mockOnComplete = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders task title', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders priority chip', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it('renders project badge', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('renders subtask progress', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByText(/Subtasks: 1\/2/)).toBeInTheDocument();
  });

  it('calls onComplete when checkbox is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const checkbox = screen.getByRole('checkbox');
    await user.click(checkbox);
    expect(mockOnComplete).toHaveBeenCalledWith('test-task-1');
  });

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const editButton = screen.getByTitle('Edit task');
    await user.click(editButton);
    expect(mockOnEdit).toHaveBeenCalledWith(mockTask);
  });

  it('calls onDelete when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    const deleteButton = screen.getByTitle('Delete task');
    await user.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('test-task-1');
  });

  it('shows habit icon for habit tasks', () => {
    render(
      <TaskCard
        task={mockHabit}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // The Loop icon is rendered for habits
    expect(screen.getByTestId('LoopIcon')).toBeInTheDocument();
  });

  it('shows streak badge for habits', () => {
    render(
      <TaskCard
        task={mockHabit}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // Current streak (5) and best streak (10) are both displayed
    // Use getAllByText since "5" appears in the streak badge
    const streakElements = screen.getAllByText((content, element) => {
      return element?.tagName === 'P' && content === '5';
    });
    expect(streakElements.length).toBeGreaterThan(0);
  });

  it('shows blocked chip when isBlocked is true', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isBlocked={true}
      />
    );
    expect(screen.getByText('Blocked')).toBeInTheDocument();
  });

  it('disables checkbox when blocked', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isBlocked={true}
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });

  it('shows strikethrough for completed tasks', () => {
    const completedTask = { ...mockTask, is_complete: true };
    render(
      <TaskCard
        task={completedTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    const title = screen.getByText('Test Task');
    expect(title).toHaveStyle('text-decoration: line-through');
  });

  it('expands to show description when expand button clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Description should not be visible initially
    expect(screen.queryByText('This is a test task description')).not.toBeVisible();

    // Click expand button
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    if (expandButton) {
      await user.click(expandButton);
    }

    // Description should now be visible
    expect(screen.getByText('This is a test task description')).toBeVisible();
  });

  it('expands to show tags when expanded', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Click expand button
    const expandButton = screen.getByTestId('ExpandMoreIcon').closest('button');
    if (expandButton) {
      await user.click(expandButton);
    }

    // Tags should be visible
    expect(screen.getByText('work')).toBeVisible();
    expect(screen.getByText('important')).toBeVisible();
  });
});
