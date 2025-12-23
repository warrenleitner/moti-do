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
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} />);
  });

  it('displays empty state when no habits', () => {
    render(<HabitList habits={[]} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText(/No habits/i)).toBeInTheDocument();
  });

  it('renders habit list', () => {
    render(<HabitList habits={mockHabits} allTasks={[]} onEdit={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByText('Exercise')).toBeInTheDocument();
    expect(screen.getByText('Reading')).toBeInTheDocument();
  });

  it('passes callbacks to habit cards', async () => {
    const onEdit = vi.fn();
    const { user } = render(<HabitList habits={mockHabits} allTasks={[]} onEdit={onEdit} onComplete={vi.fn()} />);

    const editButtons = screen.getAllByTitle(/Edit habit/);
    await user.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalled();
  });
});
