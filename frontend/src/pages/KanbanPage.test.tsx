import { render, screen } from '../test/utils';
import { vi } from 'vitest';
import KanbanPage from './KanbanPage';
import * as stores from '../store';

vi.mock('../store', () => ({
  useTaskStore: vi.fn(),
}));

describe('KanbanPage', () => {
  beforeEach(() => {
    vi.mocked(stores.useTaskStore).mockReturnValue({
      tasks: [],
      fetchTasks: vi.fn(),
      saveTask: vi.fn(),
    } as unknown as ReturnType<typeof stores.useTaskStore>);
  });

  it('renders without crashing', () => {
    render(<KanbanPage />);
    expect(screen.getByText(/Kanban/i)).toBeInTheDocument();
  });

  it('displays kanban board columns', () => {
    render(<KanbanPage />);
    expect(screen.getByText(/Backlog/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
  });
});
