import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import KanbanBoard from './KanbanBoard';
import { DragDropContext } from '@hello-pangea/dnd';

// Wrap component in DnD context for testing
const renderWithDnD = (ui: React.ReactElement) => {
  return render(
    <DragDropContext onDragEnd={vi.fn()}>
      {ui}
    </DragDropContext>
  );
};

describe('KanbanBoard', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Backlog Task',
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
      kanban_status: 'backlog' as const,
    },
  ];

  it('renders without crashing', () => {
    renderWithDnD(<KanbanBoard tasks={[]} onTaskMove={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
  });

  it('displays kanban columns', () => {
    renderWithDnD(<KanbanBoard tasks={[]} onTaskMove={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
  });

  it('displays tasks in correct columns', () => {
    renderWithDnD(<KanbanBoard tasks={mockTasks} onTaskMove={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getByText('Backlog Task')).toBeInTheDocument();
  });

  it('handles empty task list', () => {
    renderWithDnD(<KanbanBoard tasks={[]} onTaskMove={vi.fn()} onTaskClick={vi.fn()} />);
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
  });
});
