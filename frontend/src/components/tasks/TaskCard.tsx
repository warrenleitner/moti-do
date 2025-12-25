import {
  Card,
  Text,
  Box,
  ActionIcon,
  Checkbox,
  Collapse,
  Group,
  Tooltip,
  Badge,
} from '@mantine/core';
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconLink,
  IconStar,
  IconArrowBackUp,
} from '@tabler/icons-react';
import { useState } from 'react';
import type { Task } from '../../types';
import type { SubtaskViewMode } from '../../store/taskStore';
import {
  PriorityChip,
  DifficultyChip,
  DurationChip,
  TagChip,
  DateDisplay,
  StreakBadge,
} from '../common';
import SubtaskList from './SubtaskList';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskIndex: number) => void;
  onUndo?: (id: string) => void;
  isBlocked?: boolean;
  subtaskViewMode?: SubtaskViewMode;
}

export default function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onSubtaskToggle,
  onUndo,
  isBlocked = false,
  subtaskViewMode = 'inline',
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedSubtasks = task.subtasks.filter((s) => s.complete).length;
  const hasSubtasks = task.subtasks.length > 0;
  // In hidden and top-level modes, subtasks don't contribute to hasDetails
  const showSubtasksInline = subtaskViewMode === 'inline' && hasSubtasks;
  const hasDetails = task.text_description || showSubtasksInline || task.tags.length > 0;

  const borderColor = task.is_complete
    ? 'var(--mantine-color-green-6)'
    : isBlocked
    ? 'var(--mantine-color-gray-5)'
    : 'var(--mantine-color-blue-6)';

  return (
    <Card
      shadow="sm"
      padding="md"
      radius="md"
      mb="xs"
      withBorder
      style={{
        opacity: task.is_complete ? 0.7 : isBlocked ? 0.6 : 1,
        borderLeft: `4px solid ${borderColor}`,
        transition: 'all 0.2s ease',
      }}
    >
      {/* Main row */}
      <Group align="flex-start" gap="sm" wrap="nowrap">
        <Checkbox
          checked={task.is_complete}
          onChange={() => onComplete(task.id)}
          disabled={isBlocked}
          mt={-2}
        />

        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Title row */}
          <Group gap="xs" wrap="wrap" align="center">
            {task.icon && <span>{task.icon}</span>}
            <Text
              fw={500}
              style={{
                textDecoration: task.is_complete ? 'line-through' : 'none',
              }}
            >
              {task.title}
            </Text>
            {task.is_habit && (
              <Tooltip label="Recurring habit">
                <IconRepeat size={16} color="var(--mantine-color-blue-6)" />
              </Tooltip>
            )}
            {task.dependencies.length > 0 && (
              <Tooltip label={`${task.dependencies.length} dependencies`}>
                <IconLink size={16} color="var(--mantine-color-gray-6)" />
              </Tooltip>
            )}
            {isBlocked && (
              <Badge size="sm" variant="outline" color="yellow">
                Blocked
              </Badge>
            )}
          </Group>

          {/* Metadata row */}
          <Group gap="xs" mt="xs" wrap="wrap">
            <Tooltip label="XP reward for completing this task">
              <Badge
                leftSection={<IconStar size={12} />}
                size="sm"
                variant="outline"
                color="grape"
                fw={600}
              >
                {task.score} XP
              </Badge>
            </Tooltip>
            <PriorityChip priority={task.priority} />
            <DifficultyChip difficulty={task.difficulty} />
            <DurationChip duration={task.duration} />
            {task.due_date && <DateDisplay date={task.due_date} label="Due" />}
            {task.is_habit && (
              <StreakBadge current={task.streak_current} best={task.streak_best} />
            )}
          </Group>

          {/* Project badge */}
          {task.project && (
            <Badge size="sm" variant="outline" mt="xs">
              {task.project}
            </Badge>
          )}

          {/* Subtask progress - show in inline and top-level modes */}
          {hasSubtasks && subtaskViewMode !== 'hidden' && (
            <Text size="xs" c="dimmed" mt="xs">
              Subtasks: {completedSubtasks}/{task.subtasks.length}
            </Text>
          )}
        </Box>

        {/* Expand button */}
        {hasDetails && (
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
          >
            {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
          </ActionIcon>
        )}
      </Group>

      {/* Expanded details */}
      <Collapse in={expanded}>
        <Box mt="md" pl={40}>
          {task.text_description && (
            <Text size="sm" c="dimmed" mb="sm">
              {task.text_description}
            </Text>
          )}

          {task.tags.length > 0 && (
            <Group gap={4} mb="sm" wrap="wrap">
              {task.tags.map((tag) => (
                <TagChip key={tag} tag={tag} />
              ))}
            </Group>
          )}

          {showSubtasksInline && (
            <SubtaskList
              subtasks={task.subtasks}
              onToggle={
                onSubtaskToggle
                  ? (index) => onSubtaskToggle(task.id, index)
                  : undefined
              }
            />
          )}
        </Box>
      </Collapse>

      {/* Actions */}
      <Group justify="flex-end" gap="xs" mt="sm">
        {onUndo && task.history.length > 0 && (
          <Tooltip label="Undo last change">
            <ActionIcon
              size="sm"
              variant="subtle"
              color="blue"
              onClick={() => onUndo(task.id)}
              aria-label="Undo last change"
            >
              <IconArrowBackUp size={16} />
            </ActionIcon>
          </Tooltip>
        )}
        <ActionIcon
          size="sm"
          variant="subtle"
          onClick={() => onEdit(task)}
          aria-label="Edit task"
        >
          <IconEdit size={16} />
        </ActionIcon>
        <ActionIcon
          size="sm"
          variant="subtle"
          color="red"
          onClick={() => onDelete(task.id)}
          aria-label="Delete task"
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
