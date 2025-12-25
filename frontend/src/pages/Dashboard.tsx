import { Box, Card, Title, Text, Progress, Badge, Group, SimpleGrid, Alert } from '@mantine/core';
import {
  IconTrophy,
  IconCircleCheck,
  IconTrendingUp,
  IconStar,
  IconAlertTriangle,
} from '@tabler/icons-react';
import { useUserStore, useTaskStore } from '../store';
import { useUserStats, useSystemStatus } from '../store/userStore';

// UI component - tested via integration tests
/* v8 ignore start */
export default function Dashboard() {
  const { user } = useUserStore();
  const { tasks } = useTaskStore();
  const stats = useUserStats();
  const systemStatus = useSystemStatus();

  // Calculate stats from tasks (fallback if API stats not available)
  const completedToday = tasks.filter(
    (t) =>
      t.is_complete &&
      t.completion_date &&
      new Date(t.completion_date).toDateString() === new Date().toDateString()
  ).length;

  const activeTasks = stats?.pending_tasks ?? tasks.filter((t) => !t.is_complete).length;
  const habitsCount = stats?.habits_count ?? tasks.filter((t) => t.is_habit && !t.is_complete).length;
  const dueToday = tasks.filter((t) => {
    if (!t.due_date || t.is_complete) return false;
    return new Date(t.due_date).toDateString() === new Date().toDateString();
  }).length;

  // XP progress to next level (100 XP per level)
  const totalXP = stats?.total_xp ?? user?.xp ?? 0;
  const currentLevel = stats?.level ?? user?.level ?? 1;
  const xpProgress = totalXP % 100;
  const badgesEarned = stats?.badges_earned ?? user?.badges.length ?? 0;

  return (
    <Box>
      <Title order={2} mb="md">
        Welcome back{user ? `, ${user.username}` : ''}!
      </Title>

      {/* Pending days warning */}
      {systemStatus && systemStatus.pending_days > 0 && (
        <Alert color="yellow" icon={<IconAlertTriangle size={16} />} mb="lg">
          You have {systemStatus.pending_days} day{systemStatus.pending_days > 1 ? 's' : ''} to process.
          Visit Settings to advance the date and apply any pending penalties.
        </Alert>
      )}

      {/* Vacation mode notice */}
      {systemStatus?.vacation_mode && (
        <Alert color="blue" mb="lg">
          Vacation mode is active. No penalties will be applied until you disable it in Settings.
        </Alert>
      )}

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg" mb="xl">
        {/* XP Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconTrophy size={20} color="var(--mantine-color-blue-6)" />
            <Text size="sm" c="dimmed">
              Experience
            </Text>
          </Group>
          <Title order={3} fw={700}>
            {totalXP} XP
          </Title>
          <Box mt="xs">
            <Progress
              value={xpProgress}
              size="md"
              radius="xl"
            />
            <Text size="xs" c="dimmed" mt={4}>
              {xpProgress}/100 to Level {currentLevel + 1}
            </Text>
          </Box>
        </Card>

        {/* Completed Today Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconCircleCheck size={20} color="var(--mantine-color-green-6)" />
            <Text size="sm" c="dimmed">
              Completed Today
            </Text>
          </Group>
          <Title order={3} fw={700}>
            {completedToday}
          </Title>
          <Text size="xs" c="dimmed">
            {dueToday} due today
          </Text>
        </Card>

        {/* Active Tasks Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconTrendingUp size={20} color="var(--mantine-color-orange-6)" />
            <Text size="sm" c="dimmed">
              Active Tasks
            </Text>
          </Group>
          <Title order={3} fw={700}>
            {activeTasks}
          </Title>
          <Text size="xs" c="dimmed">
            {habitsCount} habits pending
          </Text>
        </Card>

        {/* Badges Card */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group gap="xs" mb="md">
            <IconStar size={20} color="var(--mantine-color-violet-6)" />
            <Text size="sm" c="dimmed">
              Badges Earned
            </Text>
          </Group>
          <Title order={3} fw={700}>
            {badgesEarned}
          </Title>
          <Text size="xs" c="dimmed">
            Level {currentLevel}
          </Text>
        </Card>
      </SimpleGrid>

      {/* Recent Badges */}
      {user && user.badges.length > 0 && (
        <Card shadow="sm" padding="lg" radius="md" mb="lg" withBorder>
          <Title order={4} mb="md">
            Recent Badges
          </Title>
          <Group gap="xs" wrap="wrap">
            {user.badges.slice(-5).map((badge) => (
              <Badge
                key={badge.id}
                leftSection={<span>{badge.glyph}</span>}
                variant="outline"
                color="blue"
              >
                {badge.name}
              </Badge>
            ))}
          </Group>
        </Card>
      )}

      {/* Quick Actions */}
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Title order={4} mb="xs">
          Quick Start
        </Title>
        <Text size="sm" c="dimmed">
          Use the sidebar to navigate to Tasks, view your Calendar, or see your habits.
          This dashboard will show your daily progress and achievements.
        </Text>
      </Card>
    </Box>
  );
}
/* v8 ignore stop */
