import { Box, Card, Text, SimpleGrid, Group, Title } from '@mantine/core';
import {
  IconFlame,
  IconTrendingUp,
  IconTrophy,
  IconCalendar,
} from '@tabler/icons-react';
import type { Task } from '../../types';

interface HabitStatsProps {
  habits: Task[];
}

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

  // Habits with active streaks (7+ days)
  const hotHabits = activeHabits.filter((h) => h.streak_current >= 7);

  const stats = [
    {
      icon: <IconFlame size={32} />,
      label: 'Total Streak Days',
      value: totalStreakDays,
      color: '#ff9800',
    },
    {
      icon: <IconTrendingUp size={32} />,
      label: 'Average Streak',
      value: `${avgStreak} days`,
      color: '#2196f3',
    },
    {
      icon: <IconTrophy size={32} />,
      label: 'Best Ever Streak',
      value: `${bestStreak} days`,
      color: '#4caf50',
    },
    {
      icon: <IconCalendar size={32} />,
      label: 'Active Habits',
      value: `${activeHabits.length}`,
      color: '#9c27b0',
    },
  ];

  return (
    <Box mb="xl">
      <Title order={4} mb="sm">
        Habit Statistics
      </Title>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        {stats.map((stat) => (
          <Card key={stat.label} shadow="sm" padding="md" radius="md">
            <Box ta="center" py="xs">
              <Box style={{ color: stat.color }} mb="xs">{stat.icon}</Box>
              <Text size="xl" fw={700}>
                {stat.value}
              </Text>
              <Text size="xs" c="dimmed">
                {stat.label}
              </Text>
            </Box>
          </Card>
        ))}
      </SimpleGrid>

      {/* Hot habits (7+ day streaks) */}
      {hotHabits.length > 0 && (
        <Card withBorder mt="md" padding="md" radius="md">
          <Group gap="xs" mb="xs">
            <IconFlame size={20} color="var(--mantine-color-yellow-6)" />
            <Text size="sm" fw={500} c="yellow.7">
              Hot Streaks (7+ days)
            </Text>
          </Group>
          <Group gap="xs" wrap="wrap">
            {hotHabits.map((habit) => (
              <Box
                key={habit.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '4px 12px',
                  borderRadius: 'var(--mantine-radius-md)',
                  backgroundColor: 'var(--mantine-color-yellow-1)',
                  color: 'var(--mantine-color-yellow-9)',
                }}
              >
                {habit.icon && <span>{habit.icon}</span>}
                <Text size="sm" fw={500}>
                  {habit.title}
                </Text>
                <Text size="xs">
                  ({habit.streak_current} days)
                </Text>
              </Box>
            ))}
          </Group>
        </Card>
      )}

      {/* Longest current streak */}
      {longestCurrentStreak > 0 && (
        <Text size="sm" c="dimmed" mt="md">
          Your longest active streak is {longestCurrentStreak} days. Keep it going!
        </Text>
      )}
    </Box>
  );
}
