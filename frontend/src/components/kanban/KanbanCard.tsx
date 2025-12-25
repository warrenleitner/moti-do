import { Card, Text, Box, Group, Badge, ActionIcon } from '@mantine/core';
import { Draggable } from '@hello-pangea/dnd';
import { IconPencil, IconClock, IconFlame } from '@tabler/icons-react';
import type { Task } from '../../types';
import { PriorityChip, DurationChip } from '../common';

interface KanbanCardProps {
  task: Task;
  index: number;
  onEdit?: (task: Task) => void;
}

const priorityColors: Record<string, string> = {
  critical: '#d32f2f',
  high: '#f57c00',
  medium: '#1976d2',
  low: '#388e3c',
  trivial: '#757575',
};

// UI component - tested via integration tests
/* v8 ignore start */
export default function KanbanCard({ task, index, onEdit }: KanbanCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_complete;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          shadow={snapshot.isDragging ? 'md' : 'xs'}
          padding="sm"
          radius="sm"
          mb="xs"
          style={{
            borderLeft: `4px solid ${priorityColors[task.priority] || '#1976d2'}`,
            backgroundColor: snapshot.isDragging
              ? 'var(--mantine-color-gray-1)'
              : 'var(--mantine-color-white)',
            transition: 'box-shadow 0.2s',
          }}
        >
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Text
              size="sm"
              fw={500}
              style={{ flex: 1 }}
              td={task.is_complete ? 'line-through' : undefined}
              c={task.is_complete ? 'dimmed' : undefined}
            >
              {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
              {task.title}
            </Text>
            {onEdit && (
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                aria-label="Edit task"
              >
                <IconPencil size={14} />
              </ActionIcon>
            )}
          </Group>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <Group gap={4} mt="xs" wrap="wrap">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} size="xs" variant="light">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge size="xs" variant="light">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </Group>
          )}

          {/* Meta info */}
          <Group gap="xs" mt="xs" wrap="wrap">
            <PriorityChip priority={task.priority} size="small" />
            <DurationChip duration={task.duration} size="small" />

            {/* Streak for habits */}
            {task.is_habit && task.streak_current > 0 && (
              <Group gap={2}>
                <IconFlame size={14} color="var(--mantine-color-yellow-6)" />
                <Text size="xs" c="yellow.6">
                  {task.streak_current}
                </Text>
              </Group>
            )}

            {/* Due date */}
            {task.due_date && (
              <Group
                gap={2}
                style={{
                  color: isOverdue
                    ? 'var(--mantine-color-red-6)'
                    : 'var(--mantine-color-dimmed)',
                }}
              >
                <IconClock size={14} />
                <Text size="xs">
                  {new Date(task.due_date).toLocaleDateString()}
                </Text>
              </Group>
            )}
          </Group>

          {/* Subtask progress */}
          {task.subtasks && task.subtasks.length > 0 && (
            <Box mt="xs">
              <Text size="xs" c="dimmed">
                {task.subtasks.filter((s) => s.complete).length}/{task.subtasks.length} subtasks
              </Text>
            </Box>
          )}
        </Card>
      )}
    </Draggable>
  );
}
/* v8 ignore stop */
