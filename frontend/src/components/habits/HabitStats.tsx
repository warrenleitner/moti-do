import { Box, SimpleGrid, Text } from '../../ui';
import {
  IconFlame,
  IconTrendingUp,
  IconTrophy,
  IconCalendar,
} from '../../ui/icons';
import { StatCard } from '../ui';
import type { Task } from '../../types';

interface HabitStatsProps {
  habits: Task[];
}

// UI component — Kinetic Console redesign
/* v8 ignore start */
export default function HabitStats({ habits }: HabitStatsProps) {
  // Calculate aggregate statistics
  const activeHabits = habits.filter((h) => !h.parent_habit_id);
  const totalStreakDays = activeHabits.reduce((sum, h) => sum + h.streak_current, 0);
  const avgStreak =
    activeHabits.length > 0
      ? Math.round(totalStreakDays / activeHabits.length)
      : 0;
  const bestStreak = Math.max(...activeHabits.map((h) => h.streak_best), 0);
  const longestCurrentStreak = Math.max(...activeHabits.map((h) => h.streak_current), 0);

  // Hot streaks (7+ days)
  const hotHabits = activeHabits.filter((h) => h.streak_current >= 7);

  return (
    <Box mb="xl">
      <div
        className="micro-meta"
        style={{ marginBottom: '0.75rem', fontSize: '0.75rem' }}
      >
        Habit Statistics
      </div>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        <StatCard
          label="Total Streak Days"
          value={totalStreakDays}
          accentColor="magenta"
          progress={Math.min((totalStreakDays / Math.max(activeHabits.length * 30, 1)) * 100, 100)}
          icon={<IconFlame size={20} color="#FF007F" />}
        />
        <StatCard
          label="Average Streak"
          value={`${avgStreak} days`}
          accentColor="cyan"
          progress={Math.min((avgStreak / 30) * 100, 100)}
          icon={<IconTrendingUp size={20} color="#00E5FF" />}
        />
        <StatCard
          label="Best Ever Streak"
          value={`${bestStreak} days`}
          accentColor="amber"
          progress={Math.min((bestStreak / 30) * 100, 100)}
          icon={<IconTrophy size={20} color="#FFC775" />}
        />
        <StatCard
          label="Active Habits"
          value={`${activeHabits.length}`}
          accentColor="cyan"
          icon={<IconCalendar size={20} color="#00E5FF" />}
        />
      </SimpleGrid>

      {/* Hot streaks row */}
      {hotHabits.length > 0 && (
        <div
          style={{
            backgroundColor: '#10131C',
            border: '1px solid rgba(59, 73, 76, 0.15)',
            borderLeft: '4px solid #FF007F',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <IconFlame size={16} color="#FF007F" />
            <span
              className="font-data"
              style={{
                fontSize: '0.6875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#FF007F',
                fontWeight: 600,
              }}
            >
              HOT_STREAKS (7+ DAYS)
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {hotHabits.map((habit) => (
              <span
                key={habit.id}
                className="font-data"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  backgroundColor: 'rgba(255, 0, 127, 0.1)',
                  border: '1px solid rgba(255, 0, 127, 0.3)',
                  color: '#FF007F',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                }}
              >
                {habit.icon && <span>{habit.icon}</span>}
                {habit.title}
                <span style={{ color: '#9BA3AF' }}>({habit.streak_current}D)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Longest streak callout */}
      {longestCurrentStreak > 0 && (
        <Text size="sm" c="dimmed" mt="md">
          Your longest active streak is {longestCurrentStreak} days. Keep it going!
        </Text>
      )}
    </Box>
  );
}
/* v8 ignore stop */
