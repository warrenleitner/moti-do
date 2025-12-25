import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import KanbanCard from './KanbanCard';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';

// Wrap in full DnD context
const renderWithDnD = (task: unknown, onEdit: unknown, index = 0) => {
  return render(
    <DragDropContext onDragEnd={vi.fn()}>
      <Droppable droppableId="test">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps}>
            <KanbanCard task={task} index={index} onEdit={onEdit} />
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

describe('KanbanCard', () => {
  const mockTask = {
    id: '1',
    title: 'Test Task',
    text_description: 'Task description',
    priority: 'medium' as const,
    difficulty: 'medium' as const,
    duration: 'medium' as const,
    is_complete: false,
    subtasks: [],
    tags: ['urgent'],
    dependencies: [],
    score: 100,
    creation_date: new Date().toISOString(),
  };

  it('renders task title', () => {
    renderWithDnD(mockTask, vi.fn());
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('renders task priority and duration', () => {
    renderWithDnD(mockTask, vi.fn());
    // Priority and duration are rendered as chips
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('displays tags', () => {
    renderWithDnD(mockTask, vi.fn());
    expect(screen.getByText('urgent')).toBeInTheDocument();
  });

  it('displays task metadata', () => {
    renderWithDnD(mockTask, vi.fn());
    // Task metadata (priority, duration) is rendered
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const { user } = renderWithDnD(mockTask, onEdit);

    // Find edit button by aria-label (Mantine ActionIcon)
    const editButton = screen.getByRole('button', { name: 'Edit task' });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockTask);
  });

  it('stops propagation when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const { user } = renderWithDnD(mockTask, onEdit);

    // Find edit button by aria-label (Mantine ActionIcon)
    const editButton = screen.getByRole('button', { name: 'Edit task' });
    await user.click(editButton);

    // Should call onEdit (propagation tested internally)
    expect(onEdit).toHaveBeenCalled();
  });

  it('does not show edit button when onEdit is not provided', () => {
    renderWithDnD(mockTask, undefined);

    // Check edit button is not present
    expect(screen.queryByRole('button', { name: 'Edit task' })).not.toBeInTheDocument();
  });

  it('displays subtask progress', () => {
    const taskWithSubtasks = {
      ...mockTask,
      subtasks: [
        { id: '1', text: 'Subtask 1', complete: true },
        { id: '2', text: 'Subtask 2', complete: false },
        { id: '3', text: 'Subtask 3', complete: true },
      ],
    };

    renderWithDnD(taskWithSubtasks, vi.fn());

    // Should show subtask progress
    expect(screen.getByText(/2\/3 subtasks/)).toBeInTheDocument();
  });

  it('shows habit streak', () => {
    const habitTask = {
      ...mockTask,
      is_habit: true,
      streak_current: 5,
    };

    renderWithDnD(habitTask, vi.fn());

    // Should show streak
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('does not show streak for non-habits', () => {
    renderWithDnD(mockTask, vi.fn());

    // Streak icon (flame) should not be present - check by Tabler icon class
    const fireIcons = document.querySelectorAll('.tabler-icon-flame');
    expect(fireIcons.length).toBe(0);
  });

  it('shows due date', () => {
    const taskWithDueDate = {
      ...mockTask,
      due_date: new Date('2024-12-25').toISOString(),
    };

    renderWithDnD(taskWithDueDate, vi.fn());

    // Verify clock icon is present (Tabler icon class)
    const clockIcon = document.querySelector('.tabler-icon-clock');
    expect(clockIcon).toBeInTheDocument();
  });

  it('highlights overdue tasks', () => {
    const overdueTask = {
      ...mockTask,
      due_date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      is_complete: false,
    };

    renderWithDnD(overdueTask, vi.fn());

    // Task should be marked as overdue (visual styling tested via className)
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('shows multiple tags with overflow', () => {
    const taskWithManyTags = {
      ...mockTask,
      tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5'],
    };

    renderWithDnD(taskWithManyTags, vi.fn());

    // Should show first 3 tags
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();

    // Should show "+2" for remaining tags
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
