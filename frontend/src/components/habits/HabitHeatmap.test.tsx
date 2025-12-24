import { render, screen } from '../../test/utils';
import HabitHeatmap from './HabitHeatmap';
import type { Task } from '../../types';

describe('HabitHeatmap', () => {
  const mockHabit: Task = {
    id: 1,
    title: 'Test Habit',
    icon: '🏃',
    description: 'Test description',
    project: null,
    tags: [],
    due_date: null,
    priority: 'medium',
    difficulty: 'medium',
    duration: 'medium',
    is_complete: false,
    parent_id: null,
    parent_habit_id: null,
    recurrence_rule: null,
    score: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it('renders without crashing', () => {
    const { container } = render(<HabitHeatmap habit={mockHabit} allTasks={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('renders with completions', () => {
    const completedTask: Task = {
      ...mockHabit,
      id: 2,
      parent_habit_id: 1,
      is_complete: true,
      due_date: new Date().toISOString(),
    };
    const { container } = render(<HabitHeatmap habit={mockHabit} allTasks={[completedTask]} />);
    expect(container).toBeInTheDocument();
    expect(screen.getByText(/completion/i)).toBeInTheDocument();
  });

  it('handles empty completions', () => {
    const { container } = render(<HabitHeatmap habit={mockHabit} allTasks={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders multiple months of data', () => {
    const tasks: Task[] = [
      { ...mockHabit, id: 2, parent_habit_id: 1, is_complete: true, due_date: new Date().toISOString() },
      {
        ...mockHabit,
        id: 3,
        parent_habit_id: 1,
        is_complete: true,
        due_date: new Date(Date.now() - 30 * 86400000).toISOString(),
      },
      {
        ...mockHabit,
        id: 4,
        parent_habit_id: 1,
        is_complete: true,
        due_date: new Date(Date.now() - 60 * 86400000).toISOString(),
      },
    ];
    const { container } = render(<HabitHeatmap habit={mockHabit} allTasks={tasks} />);
    expect(container).toBeInTheDocument();
  });
});
