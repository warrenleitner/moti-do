import { Card, Checkbox, Text, Badge, Group } from '@mantine/core';
import { IconCornerDownRight } from '@tabler/icons-react';
import type { Subtask, Task } from '../../types';

interface SubtaskCardProps {
  subtask: Subtask;
  subtaskIndex: number;
  parentTask: Task;
  onToggle?: (taskId: string, subtaskIndex: number) => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function SubtaskCard({
  subtask,
  subtaskIndex,
  parentTask,
  onToggle,
}: SubtaskCardProps) {
  return (
    <Card
      shadow="xs"
      padding="sm"
      radius="sm"
      mb="xs"
      ml="xl"
      withBorder
      style={{
        opacity: subtask.complete ? 0.7 : 1,
        borderLeft: `3px solid ${subtask.complete ? 'var(--mantine-color-green-4)' : 'var(--mantine-color-gray-4)'}`,
        backgroundColor: 'var(--mantine-color-gray-0)',
        transition: 'all 0.2s ease',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <IconCornerDownRight size={16} color="var(--mantine-color-gray-5)" style={{ marginLeft: -4 }} />
        <Checkbox
          checked={subtask.complete}
          onChange={() => onToggle?.(parentTask.id, subtaskIndex)}
          disabled={!onToggle || parentTask.is_complete}
          size="sm"
        />
        <Text
          size="sm"
          style={{
            flex: 1,
            textDecoration: subtask.complete ? 'line-through' : 'none',
          }}
          c={subtask.complete ? 'dimmed' : undefined}
        >
          {subtask.text}
        </Text>
        <Badge
          size="xs"
          variant="outline"
          style={{ fontSize: '0.65rem' }}
        >
          {parentTask.title}
        </Badge>
      </Group>
    </Card>
  );
}
/* v8 ignore stop */
