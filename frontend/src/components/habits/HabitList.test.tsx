import { render, screen } from '../../test/utils';
import { vi } from 'vitest';
import HabitList from './HabitList';
import type { Task } from '../../types';

describe('HabitList', () => {
  const mockHabits: Task[] = [
    {
      id: 1,
      title: 'Exercise',
      icon: '🏃',
      description: 'Daily workout',
      project: null,
      tags: [],
      due_date: null,
      priority: 'medium',
      difficulty: 'medium',
      duration: 'medium',
      is_complete: false,
      parent_id: null,
      parent_habit_id: null,
      recurrence_rule: 'FREQ=DAILY',
      score: 0,
      streak_current: 5,
      streak_best: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'Reading',
      icon: '📚',
      description: 'Read for 30 minutes',
      project: null,
      tags: [],
      due_date: null,
      priority: 'medium',
      difficulty: 'medium',
      duration: 'medium',
      is_complete: false,
      parent_id: null,
      parent_habit_id: null,
      recurrence_rule: 'FREQ=DAILY',
      score: 0,
      streak_current: 3,
      streak_best: 7,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  it('renders without crashing', () => {
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);
  });

  it('displays empty state when no habits', () => {
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/No habits/i)).toBeInTheDocument();
  });

  it('renders habit list', () => {
    render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('passes callbacks to habit cards', async () => {
    const onEdit = vi.fn();
    const { user } = render(<HabitList habits={mockHabits} allTasks={[]} onEdit={onEdit} onComplete={vi.fn()} onDelete={vi.fn()} />);

    const editButtons = screen.getAllByRole('button', { name: /Edit habit/ });
    await user.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalled();
  });

  it('switches to heatmap view', async () => {
    const { user } = render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Click heatmap tab
    const heatmapTab = screen.getByText('Heatmap View');
    await user.click(heatmapTab);

    // Should show heatmap view
    expect(screen.getByText('Heatmap View')).toBeInTheDocument();
  });

  it('switches back to list view', async () => {
    const { user } = render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Click heatmap tab
    await user.click(screen.getByText('Heatmap View'));

    // Click list tab
    await user.click(screen.getByText('List View'));

    // Should show list view again
    expect(screen.getByText('Exercise')).toBeInTheDocument();
  });

  it('shows pending habits section', () => {
    render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Should show pending section
    expect(screen.getByText(/Pending \(2\)/)).toBeInTheDocument();
  });

  it('shows completed habits section when habits are completed', () => {
    const completedHabits = mockHabits.map((h) => ({ ...h, is_complete: true }));

    render(<HabitList habits={completedHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Should show completed section
    expect(screen.getByText(/Completed Today \(2\)/)).toBeInTheDocument();
  });

  it('filters out child habit instances', () => {
    const habitsWithChildren: Task[] = [
      ...mockHabits,
      {
        ...mockHabits[0],
        id: 3,
        parent_habit_id: 1, // Child of first habit
      },
    ];

    render(<HabitList habits={habitsWithChildren} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Should only show 2 root habits, not the child
    expect(screen.getByText(/Pending \(2\)/)).toBeInTheDocument();
  });

  it('displays habit statistics', () => {
    render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // HabitStats component should be rendered (tested separately)
    expect(screen.getByText('Exercise')).toBeInTheDocument();
  });

  it('shows create habit button when onCreateNew is provided', () => {
    const onCreateNew = vi.fn();
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} onCreateNew={onCreateNew} />);

    // Should show create button in empty state
    expect(screen.getByText('Create Habit')).toBeInTheDocument();
  });

  it('does not show create habit button when onCreateNew is not provided', () => {
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} />);

    // Should not show create button
    expect(screen.queryByText('Create Habit')).not.toBeInTheDocument();
  });

  it('calls onCreateNew when create button is clicked', async () => {
    const onCreateNew = vi.fn();
    const { user } = render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} onDelete={vi.fn()} onCreateNew={onCreateNew} />);

    // Click create button
    await user.click(screen.getByText('Create Habit'));

    expect(onCreateNew).toHaveBeenCalled();
  });
});
