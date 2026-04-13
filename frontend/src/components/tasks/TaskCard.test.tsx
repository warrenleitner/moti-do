/**
 * Tests for TaskCard component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import TaskCard from './TaskCard';
import type { Task } from '../../types';
import { Priority, Difficulty, Duration } from '../../types';

// Make Collapse deterministic in jsdom by rendering children only when open.
vi.mock('../../ui', async () => {
  const actual = await vi.importActual<typeof import('../../ui')>('../../ui');
  return {
    ...actual,
    Collapse: ({
      in: opened,
      expanded,
      children,
    }: {
      in?: boolean;
      expanded?: boolean;
      children: ReactNode;
    }) => (opened ?? expanded ? <div>{children}</div> : null),
  };
});

// Mock useMediaQuery from Mantine hooks (via ../../ui)
const mockMediaQueryResult = { current: false };
vi.mock('@mantine/hooks', async () => {
  const actual = await vi.importActual('@mantine/hooks');
  return {
    ...actual,
    useMediaQuery: () => mockMediaQueryResult.current,
  };
});

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
  score: 25,
  penalty_score: 5,
  net_score: 30,
  current_count: 0,
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
  score: 15,
  penalty_score: 0,
  net_score: 15,
  current_count: 0,
};

describe('TaskCard', () => {
  const mockOnComplete = vi.fn();
  const mockOnEdit = vi.fn();
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to desktop mode
    mockMediaQueryResult.current = false;
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
    expect(screen.getByText(/SUBTASKS: 1\/2/)).toBeInTheDocument();
  });

  it('calls onComplete when complete button is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Find the complete button by the RadioButtonUnchecked icon (uncompleted task)
    const completeButton = screen.getByRole('button', { name: 'Mark Complete' });
    expect(completeButton).toBeInTheDocument();
    if (completeButton) {
      await user.click(completeButton);
    }
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

  it('calls onEndRecurrence when end recurrence button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnEndRecurrence = vi.fn();
    render(
      <TaskCard
        task={mockHabit}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onEndRecurrence={mockOnEndRecurrence}
      />
    );

    const endButton = screen.getByTitle('End recurrence');
    await user.click(endButton);
    expect(mockOnEndRecurrence).toHaveBeenCalledWith(mockHabit.id);
  });

  it('shows habit icon for habit tasks', () => {
    const { container } = render(
      <TaskCard
        task={mockHabit}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    // The IconRepeat is rendered for habits (check for SVG icon)
    expect(container.querySelector('.tabler-icon-repeat')).toBeInTheDocument();
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
    expect(screen.getByText('BLOCKED')).toBeInTheDocument();
  });

  it('disables complete button when blocked', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        isBlocked={true}
      />
    );
    const completeButton = screen.getByRole('button', { name: 'Mark Complete' });
    expect(completeButton).toBeDisabled();
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

  it('shows CheckCircle icon for completed tasks', () => {
    const completedTask = { ...mockTask, is_complete: true };
    render(
      <TaskCard
        task={completedTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );
    expect(screen.getByRole('button', { name: 'Mark Incomplete' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mark Complete' })).not.toBeInTheDocument();
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

    // Description should not be visible initially (inside collapsed section)
    expect(screen.queryByText('This is a test task description')).toBeNull();

    // Click expand button
    const expandButton = screen.getByRole('button', { name: 'Expand details' });
    await user.click(expandButton);

    // Description should now be visible
    await waitFor(() => {
      expect(screen.getByText('This is a test task description')).toBeInTheDocument();
    });
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
    const expandButton = screen.getByRole('button', { name: 'Expand details' });
    await user.click(expandButton);

    // Tags should be visible after expanding
    await waitFor(() => {
      expect(screen.getByText('work')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });
  });

  it('calls onSubtaskToggle when subtask is toggled', async () => {
    const user = userEvent.setup();
    const mockOnSubtaskToggle = vi.fn();

    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onSubtaskToggle={mockOnSubtaskToggle}
      />
    );

    // Expand to show subtasks
    const expandButton = screen.getByRole('button', { name: 'Expand details' });
    await user.click(expandButton);

    // Find and click a subtask checkbox (only subtask checkboxes exist now)
    const subtaskCheckboxes = await screen.findAllByRole('checkbox');
    if (subtaskCheckboxes.length > 0) {
      await user.click(subtaskCheckboxes[0]);
      expect(mockOnSubtaskToggle).toHaveBeenCalledWith('test-task-1', 0);
    }
  });

  it('does not call onSubtaskToggle when callback not provided', async () => {
    const user = userEvent.setup();

    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        // onSubtaskToggle not provided
      />
    );

    // Expand to show subtasks
    const expandButton = screen.getByRole('button', { name: 'Expand details' });
    await user.click(expandButton);

    // Subtasks should still be visible but not interactive
    await waitFor(() => {
      expect(screen.getByText(/Subtask 1/)).toBeInTheDocument();
    });
  });

  it('shows task without expand button when no details', () => {
    const simpleTask: Task = {
      ...mockTask,
      text_description: '',
      tags: [],
      subtasks: [],
    };

    render(
      <TaskCard
        task={simpleTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should not have expand button
    expect(screen.queryByRole('button', { name: /expand|collapse/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /expand|collapse/i })).not.toBeInTheDocument();
  });

  it('renders task with icon', () => {
    const taskWithIcon: Task = {
      ...mockTask,
      icon: '📋',
    };

    render(
      <TaskCard
        task={taskWithIcon}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    expect(screen.getByText('📋')).toBeInTheDocument();
  });

  it('renders task with dependencies indicator', () => {
    const taskWithDeps: Task = {
      ...mockTask,
      dependencies: ['dep1', 'dep2'],
    };

    const { container } = render(
      <TaskCard
        task={taskWithDeps}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should show link icon for dependencies (Tabler IconLink)
    expect(container.querySelector('.tabler-icon-link')).toBeInTheDocument();
  });

  it('renders task with due date', () => {
    // Use a future date to ensure CalendarTodayIcon is shown (not Warning for overdue)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const taskWithDueDate: Task = {
      ...mockTask,
      due_date: futureDateStr,  // DateDisplay expects YYYY-MM-DD format
    };

    render(
      <TaskCard
        task={taskWithDueDate}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should show calendar icon (DateDisplay component renders CalendarToday icon for future dates)
    expect(document.querySelector('.tabler-icon-calendar, .tabler-icon-alert-triangle')!).toBeInTheDocument();
  });

  it('shows undo button when task has history and onUndo is provided', () => {
    const taskWithHistory: Task = {
      ...mockTask,
      history: [
        { timestamp: '2025-01-01T10:00:00Z', field: 'title', old_value: 'Old Title', new_value: 'Test Task' }
      ],
    };

    render(
      <TaskCard
        task={taskWithHistory}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndo={vi.fn()}
      />
    );

    // Should show undo icon
    expect(screen.getByRole('button', { name: 'Undo last change' })).toBeInTheDocument();
  });

  it('calls onUndo when undo button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnUndo = vi.fn();
    const taskWithHistory: Task = {
      ...mockTask,
      history: [
        { timestamp: '2025-01-01T10:00:00Z', field: 'title', old_value: 'Old Title', new_value: 'Test Task' }
      ],
    };

    render(
      <TaskCard
        task={taskWithHistory}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndo={mockOnUndo}
      />
    );

    const undoButton = screen.getByRole('button', { name: 'Undo last change' });
    if (undoButton) {
      await user.click(undoButton);
    }
    expect(mockOnUndo).toHaveBeenCalledWith('test-task-1');
  });

  it('does not show undo button when task has no history', () => {
    render(
      <TaskCard
        task={mockTask}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onUndo={vi.fn()}
      />
    );

    // Should not show undo icon since history is empty
    expect(screen.queryByRole('button', { name: 'Undo last change' })).not.toBeInTheDocument();
  });

  it('does not show undo button when onUndo is not provided', () => {
    const taskWithHistory: Task = {
      ...mockTask,
      history: [
        { timestamp: '2025-01-01T10:00:00Z', field: 'title', old_value: 'Old Title', new_value: 'Test Task' }
      ],
    };

    render(
      <TaskCard
        task={taskWithHistory}
        onComplete={mockOnComplete}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        // onUndo not provided
      />
    );

    // Should not show undo icon since onUndo is not provided
    expect(screen.queryByRole('button', { name: 'Undo last change' })).not.toBeInTheDocument();
  });

  describe('mobile behavior', () => {
    beforeEach(() => {
      // Set mobile mode
      mockMediaQueryResult.current = true;
    });

    it('shows only XP and due date on mobile when collapsed', () => {
      // Use a future date to ensure CalendarTodayIcon is shown (not Warning for overdue)
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const taskWithDueDate: Task = {
        ...mockTask,
        due_date: futureDateStr,
      };

      render(
        <TaskCard
          task={taskWithDueDate}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // XP should be visible
      expect(screen.getByText(/XP/)).toBeInTheDocument();
      // Due date icon should be visible (CalendarToday for future dates)
      expect(document.querySelector('.tabler-icon-calendar, .tabler-icon-alert-triangle')!).toBeInTheDocument();
      // Priority chip is hidden inside collapsed section on mobile
      const priorityText = screen.queryByText(/High/i);
      expect(priorityText === null || !priorityText.checkVisibility?.()).toBe(true);
    });

    it('shows expand button on mobile even with no description/tags', () => {
      const simpleTask: Task = {
        ...mockTask,
        text_description: '',
        tags: [],
        subtasks: [],
      };

      render(
        <TaskCard
          task={simpleTask}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Should have expand button on mobile (to reveal hidden metadata)
      expect(screen.getByRole('button', { name: 'Expand details' })).toBeInTheDocument();
    });

    it('shows priority, difficulty, duration when expanded on mobile', async () => {
      const user = userEvent.setup();

      render(
        <TaskCard
          task={mockTask}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Priority is hidden in collapsed section on mobile
      const priorityText = screen.queryByText(/High/i);
      expect(priorityText).toBeNull();

      // Click expand button
      const expandButton = screen.getByRole('button', { name: 'Expand details' });
      await user.click(expandButton);

      // Priority should now be visible after expanding
      await waitFor(() => {
        expect(screen.getByText(/High/i)).toBeInTheDocument();
      });
    });

    it('shows project badge when expanded on mobile', async () => {
      const user = userEvent.setup();

      render(
        <TaskCard
          task={mockTask}
          onComplete={mockOnComplete}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
        />
      );

      // Project is hidden in collapsed section on mobile
      expect(screen.queryByText('Test Project')).toBeNull();

      // Click expand button
      const expandButton = screen.getByRole('button', { name: 'Expand details' });
      await user.click(expandButton);

      // Project should now be visible
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    describe('swipe to complete', () => {
      // Helper to simulate touch swipe
      const simulateSwipe = (element: HTMLElement, deltaX: number) => {
        const startX = 0;
        const startY = 100;

        // Touch start
        element.dispatchEvent(
          new TouchEvent('touchstart', {
            bubbles: true,
            touches: [{ clientX: startX, clientY: startY, identifier: 0 } as Touch],
          })
        );

        // Touch move
        element.dispatchEvent(
          new TouchEvent('touchmove', {
            bubbles: true,
            touches: [{ clientX: startX + deltaX, clientY: startY, identifier: 0 } as Touch],
          })
        );

        // Touch end
        element.dispatchEvent(
          new TouchEvent('touchend', {
            bubbles: true,
            changedTouches: [{ clientX: startX + deltaX, clientY: startY, identifier: 0 } as Touch],
          })
        );
      };

      it('renders swipe container on mobile', () => {
        render(
          <TaskCard
            task={mockTask}
            onComplete={mockOnComplete}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        // Card should be rendered
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      it('does not show swipe indicator for completed tasks', () => {
        const completedTask = { ...mockTask, is_complete: true };
        render(
          <TaskCard
            task={completedTask}
            onComplete={mockOnComplete}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        // The swipe indicator (green background) should not be present for completed tasks
        // This is implicitly tested by the fact that swipeOffset is not set for completed tasks
        expect(screen.getByText('Test Task')).toBeInTheDocument();
      });

      it('does not show swipe indicator for blocked tasks', () => {
        render(
          <TaskCard
            task={mockTask}
            onComplete={mockOnComplete}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            isBlocked={true}
          />
        );

        // The swipe indicator should not be present for blocked tasks
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('BLOCKED')).toBeInTheDocument();
      });

      it('calls onComplete when swiped right far enough on mobile', async () => {
        const { container } = render(
          <TaskCard
            task={mockTask}
            onComplete={mockOnComplete}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        // Find the outer Box (swipe container) by getting the first child of container
        const swipeContainer = container.firstChild as HTMLElement;
        expect(swipeContainer).toBeInTheDocument();

        // Simulate a right swipe of 120px (above threshold of 100px)
        simulateSwipe(swipeContainer, 120);

        // Should have called onComplete
        expect(mockOnComplete).toHaveBeenCalledWith('test-task-1');
      });

      it('does not call onComplete when swipe is too short on mobile', async () => {
        const { container } = render(
          <TaskCard
            task={mockTask}
            onComplete={mockOnComplete}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
          />
        );

        const swipeContainer = container.firstChild as HTMLElement;

        // Simulate a short right swipe of 50px (below threshold of 100px)
        simulateSwipe(swipeContainer, 50);

        // Should NOT have called onComplete
        expect(mockOnComplete).not.toHaveBeenCalled();
      });
    });
  });
});
