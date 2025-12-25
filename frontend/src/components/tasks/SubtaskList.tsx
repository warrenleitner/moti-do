import { Stack, Group, Checkbox, Text, UnstyledButton } from '@mantine/core';
import type { Subtask } from '../../types';

interface SubtaskListProps {
  subtasks: Subtask[];
  onToggle?: (index: number) => void;
  readOnly?: boolean;
}

export default function SubtaskList({ subtasks, onToggle, readOnly = false }: SubtaskListProps) {
  if (subtasks.length === 0) {
    return null;
  }

  return (
    <Stack gap="xs">
      {subtasks.map((subtask, index) => (
        <Group key={index} gap="xs" wrap="nowrap">
          {onToggle && !readOnly ? (
            <UnstyledButton onClick={() => onToggle(index)} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Checkbox
                checked={subtask.complete}
                readOnly
                size="sm"
              />
              <Text
                size="sm"
                style={{
                  textDecoration: subtask.complete ? 'line-through' : 'none',
                }}
                c={subtask.complete ? 'dimmed' : undefined}
              >
                {subtask.text}
              </Text>
            </UnstyledButton>
          ) : (
            <Group gap="xs" wrap="nowrap">
              <Checkbox
                checked={subtask.complete}
                disabled
                size="sm"
              />
              <Text
                size="sm"
                style={{
                  textDecoration: subtask.complete ? 'line-through' : 'none',
                }}
                c={subtask.complete ? 'dimmed' : undefined}
              >
                {subtask.text}
              </Text>
            </Group>
          )}
        </Group>
      ))}
    </Stack>
  );
}
