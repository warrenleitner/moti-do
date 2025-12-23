import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import KanbanColumn from './KanbanColumn';
import { DragDropContext } from '@hello-pangea/dnd';

const renderWithDnD = (ui: React.ReactElement) => {
  return render(
    <DragDropContext onDragEnd={vi.fn()}>
      {ui}
    </DragDropContext>
  );
};

describe('KanbanColumn', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Task 1',
      text_description: '',
      priority: 'medium' as const,
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

  it('renders column title', () => {
    renderWithDnD(<KanbanColumn id="backlog" title="Backlog" tasks={[]} color="#999" />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
  });

  it('renders task count', () => {
    renderWithDnD(<KanbanColumn id="backlog" title="Backlog" tasks={mockTasks} color="#999" />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders tasks', () => {
    renderWithDnD(<KanbanColumn id="backlog" title="Backlog" tasks={mockTasks} color="#999" />);
    expect(screen.getByText('Task 1')).toBeInTheDocument();
  });

  it('handles empty column', () => {
    renderWithDnD(<KanbanColumn id="backlog" title="Backlog" tasks={[]} color="#999" />);
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    // Badge shows count, and empty state message appears
    expect(screen.getByText(/No tasks/i)).toBeInTheDocument();
  });
});
