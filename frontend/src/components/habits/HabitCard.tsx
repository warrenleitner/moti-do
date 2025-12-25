import {
  Card,
  Box,
  Group,
  ActionIcon,
  Checkbox,
  Progress,
  Tooltip,
  Text,
} from '@mantine/core';
import { IconPencil, IconRepeat, IconTrash } from '@tabler/icons-react';
import type { Task } from '../../types';
import { PriorityChip, DateDisplay, StreakBadge } from '../common';

interface HabitCardProps {
  habit: Task;
  onComplete: (id: string) => void;
  onEdit: (habit: Task) => void;
  onDelete: (id: string) => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function HabitCard({ habit, onComplete, onEdit, onDelete }: HabitCardProps) {
  // Calculate streak progress (visual indicator, max at 30 days)
  const streakProgress = Math.min((habit.streak_current / 30) * 100, 100);

  // Determine border color based on state
  const borderColor = habit.is_complete
    ? 'var(--mantine-color-green-6)'
    : habit.streak_current >= 7
    ? 'var(--mantine-color-yellow-6)'
    : 'var(--mantine-color-blue-6)';

  // Determine progress bar color
  const progressColor =
    habit.streak_current >= 30
      ? 'green'
      : habit.streak_current >= 14
      ? 'yellow'
      : 'blue';

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      mb="xs"
      style={{
        opacity: habit.is_complete ? 0.7 : 1,
        borderLeft: `4px solid ${borderColor}`,
        transition: 'all 0.2s ease',
      }}
    >
      <Group align="flex-start" gap="xs" wrap="nowrap">
        <Checkbox
          checked={habit.is_complete}
          onChange={() => onComplete(habit.id)}
          mt={-4}
        />

        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <Group gap="xs" wrap="wrap" align="center">
            {habit.icon && <span>{habit.icon}</span>}
            <Text
              fw={500}
              td={habit.is_complete ? 'line-through' : undefined}
            >
              {habit.title}
            </Text>
            <Tooltip label={habit.recurrence_rule || 'Recurring'}>
              <IconRepeat size={16} color="var(--mantine-color-blue-6)" />
            </Tooltip>
          </Group>

          {/* Streak and metadata row */}
          <Group gap="md" mt="xs">
            <StreakBadge current={habit.streak_current} best={habit.streak_best} />
            <PriorityChip priority={habit.priority} />
            {habit.due_date && <DateDisplay date={habit.due_date} label="Due" />}
          </Group>

          {/* Streak progress bar */}
          <Box mt="sm">
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">
                Streak Progress
              </Text>
              <Text size="xs" c="dimmed">
                {habit.streak_current} / 30 days
              </Text>
            </Group>
            <Progress
              value={streakProgress}
              size="sm"
              radius="xl"
              color={progressColor}
            />
          </Box>

          {/* Recurrence info */}
          <Text size="xs" c="dimmed" mt="xs">
            Repeats: {habit.recurrence_rule || 'Daily'}
          </Text>
        </Box>
      </Group>

      {/* Actions */}
      <Group justify="flex-end" mt="xs" gap="xs">
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={() => onEdit(habit)}
          aria-label="Edit habit"
        >
          <IconPencil size={16} />
        </ActionIcon>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="red"
          onClick={() => onDelete(habit.id)}
          aria-label="Delete habit"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
/* v8 ignore stop */
