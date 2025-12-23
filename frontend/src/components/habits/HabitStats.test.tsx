import { render, screen } from '../../test/utils';
import HabitStats from './HabitStats';
import type { Task } from '../../types';

describe('HabitStats', () => {
  const mockHabits: Task[] = [
    {
      id: '1',
      title: 'Exercise',
      text_description: 'Daily workout',
      priority: 'medium' as const,
      difficulty: 'medium' as const,
      duration: 'medium' as const,
      is_complete: false,
      is_habit: true,
      subtasks: [],
      tags: [],
      dependencies: [],
      score: 100,
      creation_date: new Date().toISOString(),
      streak_current: 5,
      streak_best: 10,
    },
    {
      id: '2',
      title: 'Reading',
      text_description: 'Read 30 minutes',
      priority: 'low' as const,
      difficulty: 'low' as const,
      duration: 'short' as const,
      is_complete: false,
      is_habit: true,
      subtasks: [],
      tags: [],
      dependencies: [],
      score: 50,
      creation_date: new Date().toISOString(),
      streak_current: 8,
      streak_best: 12,
    },
  ];

  it('renders without crashing', () => {
    render(<HabitStats habits={[]} />);
    expect(screen.getByText('Habit Statistics')).toBeInTheDocument();
  });

  it('displays total streak days', () => {
    render(<HabitStats habits={mockHabits} />);
    expect(screen.getByText('Total Streak Days')).toBeInTheDocument();
    // 5 + 8 = 13 total streak days
    expect(screen.getByText('13')).toBeInTheDocument();
  });

  it('displays best ever streak', () => {
    render(<HabitStats habits={mockHabits} />);
    expect(screen.getByText('Best Ever Streak')).toBeInTheDocument();
    // Best is 12 days from Reading habit
    expect(screen.getByText('12 days')).toBeInTheDocument();
  });

  it('displays active habits count', () => {
    render(<HabitStats habits={mockHabits} />);
    expect(screen.getByText('Active Habits')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    const zeroHabits: Task[] = [
      {
        ...mockHabits[0],
        streak_current: 0,
        streak_best: 0,
      },
    ];
    render(<HabitStats habits={zeroHabits} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
