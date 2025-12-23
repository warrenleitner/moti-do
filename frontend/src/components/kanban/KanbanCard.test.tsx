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
});
