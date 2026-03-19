import {
  Card,
  Text,
  Box,
  ActionIcon,
  Collapse,
  Group,
  Tooltip,
  Badge,
  useMediaQuery,
} from '../../ui';
import {
  IconChevronDown,
  IconChevronUp,
  IconEdit,
  IconTrash,
  IconRepeat,
  IconCopy,
  IconLink,
  IconStar,
  IconArrowBackUp,
  IconCircleCheck,
  IconCircle,
  IconPlus,
  IconMinus,
} from '../../ui/icons';
import { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { Task } from '../../types';
import type { SubtaskViewMode } from '../../store/taskStore';
import { useSystemStatus } from '../../store/userStore';
import {
  PriorityChip,
  DifficultyChip,
  DurationChip,
  TagChip,
  ProjectChip,
  DateDisplay,
  StreakBadge,
} from '../common';
import SubtaskList from './SubtaskList';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskIndex: number) => void;
  onUndo?: (id: string) => void;
  onIncrement?: (id: string) => void;
  onDecrement?: (id: string) => void;
  isBlocked?: boolean;
  subtaskViewMode?: SubtaskViewMode;
}

// Threshold for completing a swipe action (in pixels)
const SWIPE_THRESHOLD = 100;

export default function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onSubtaskToggle,
  onUndo,
  onIncrement,
  onDecrement,
  isBlocked = false,
  subtaskViewMode = 'inline',
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const isMobile = useMediaQuery('(max-width: 48em)');
  const systemStatus = useSystemStatus();

  // Calculate current processing date (last_processed_date + 1 day) for relative date display
  const currentProcessingDate = systemStatus?.last_processed_date
    ? (() => {
        const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
        const nextDay = new Date(year, month - 1, day + 1);
        return nextDay.toISOString().split('T')[0]; // Return as YYYY-MM-DD
      })()
    : undefined;

  // Handle swipe completion
  const handleSwipeComplete = useCallback(() => {
    if (!isBlocked && !task.is_complete) {
      onComplete(task.id);
    }
    setSwipeOffset(0);
  }, [isBlocked, task.is_complete, task.id, onComplete]);

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwiping: (eventData) => {
      // Only track right swipes on mobile
      if (isMobile && eventData.dir === 'Right' && !isBlocked && !task.is_complete) {
        setSwipeOffset(Math.min(eventData.deltaX, SWIPE_THRESHOLD * 1.5));
      }
    },
    onSwipedRight: (eventData) => {
      if (isMobile && eventData.deltaX >= SWIPE_THRESHOLD) {
        handleSwipeComplete();
      } else {
        setSwipeOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      // Reset if swipe wasn't completed
      if (swipeOffset < SWIPE_THRESHOLD) {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: false,
  });

  // Calculate swipe progress (0 to 1)
  const swipeProgress = Math.min(swipeOffset / SWIPE_THRESHOLD, 1);

  const completedSubtasks = task.subtasks.filter((s) => s.complete).length;
  const hasSubtasks = task.subtasks.length > 0;
  // In hidden and top-level modes, subtasks don't contribute to hasDetails
  const showSubtasksInline = subtaskViewMode === 'inline' && hasSubtasks;
  // On mobile, always show expand button since we hide some metadata when collapsed
  const hasDetails = isMobile || task.text_description || showSubtasksInline || task.tags.length > 0;

  const borderColor = task.is_complete
    ? 'var(--mantine-color-green-6)'
    : isBlocked
    ? 'var(--mantine-color-gray-5)'
    : 'var(--mantine-color-blue-6)';

  return (
    <Box
      {...swipeHandlers}
      style={{
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 8,
        borderRadius: 4,
      }}
    >
      {/* Swipe indicator background - only show on mobile when swiping incomplete tasks */}
      {isMobile && !task.is_complete && !isBlocked && swipeOffset > 0 && (
        <Box
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: swipeOffset,
            backgroundColor:
              swipeProgress >= 1
                ? 'var(--mantine-color-green-6)'
                : 'var(--mantine-color-green-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingLeft: 16,
            transition: swipeProgress >= 1 ? 'background-color 0.2s' : 'none',
          }}
        >
          <IconCircleCheck
            size={24}
            color="white"
            style={{
              opacity: swipeProgress,
              transform: `scale(${0.5 + swipeProgress * 0.5})`,
              transition: 'transform 0.1s',
            }}
          />
        </Box>
      )}
      <Card
        shadow="sm"
        padding="md"
        radius="md"
        withBorder
        data-testid="task-card"
        style={{
          opacity: task.is_complete ? 0.7 : isBlocked ? 0.6 : 1,
          borderLeft: `4px solid ${borderColor}`,
          transition: swipeOffset > 0 ? 'none' : 'all 0.2s ease',
          transform: isMobile ? `translateX(${swipeOffset}px)` : 'none',
        }}
      >
        {/* Main row */}
        <Group align="flex-start" gap="sm" wrap="nowrap">
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

            {/* Metadata row - on mobile, show only XP and due date when collapsed */}
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
              {/* Counter controls for counter tasks */}
              {task.target_count !== undefined && task.target_count > 0 && (
                <Group gap={4} align="center" wrap="nowrap">
                  <Tooltip label="Decrease count">
                    <span>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onDecrement?.(task.id);
                        }}
                        disabled={task.current_count <= 0 || task.is_complete}
                      >
                        <IconMinus size={14} />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                  <Badge
                    size="sm"
                    variant="outline"
                    color={task.current_count >= task.target_count ? 'green' : 'gray'}
                    fw={600}
                    style={{ minWidth: 50 }}
                  >
                    {task.current_count}/{task.target_count}
                  </Badge>
                  <Tooltip label="Increase count">
                    <span>
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          onIncrement?.(task.id);
                        }}
                        disabled={task.is_complete}
                      >
                        <IconPlus size={14} />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                </Group>
              )}
              {/* Show full metadata on desktop, minimal on mobile */}
              {!isMobile && (
                <>
                  <PriorityChip priority={task.priority} />
                  <DifficultyChip difficulty={task.difficulty} />
                  <DurationChip duration={task.duration} />
                </>
              )}
              {task.due_date && <DateDisplay date={task.due_date} label="Due" referenceDate={currentProcessingDate} />}
              {!isMobile && task.is_habit && (
                <StreakBadge current={task.streak_current} best={task.streak_best} />
              )}
              {/* Project badge - inline with other metadata (desktop only) */}
              {!isMobile && task.project && <ProjectChip project={task.project} />}
            </Group>

            {/* Subtask progress - show in inline and top-level modes (desktop only when collapsed) */}
            {!isMobile && hasSubtasks && subtaskViewMode !== 'hidden' && (
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
        <Collapse in={expanded} transitionDuration={0}>
          <Box mt="md" pl={40}>
            {/* Mobile-only: show hidden metadata when expanded */}
            {isMobile && (
              <Group gap="xs" mb="sm" wrap="wrap">
                <PriorityChip priority={task.priority} />
                <DifficultyChip difficulty={task.difficulty} />
                <DurationChip duration={task.duration} />
                {task.is_habit && (
                  <StreakBadge current={task.streak_current} best={task.streak_best} />
                )}
                {task.project && <ProjectChip project={task.project} />}
              </Group>
            )}

            {/* Mobile: show subtask progress in expanded section */}
            {isMobile && hasSubtasks && subtaskViewMode !== 'hidden' && (
              <Text size="xs" c="dimmed" mb="sm">
                Subtasks: {completedSubtasks}/{task.subtasks.length}
              </Text>
            )}

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
        <Group justify="flex-end" gap="xs" mt="xs">
          <Tooltip label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
            <span>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onComplete(task.id)}
                disabled={isBlocked}
                color={task.is_complete ? 'green' : 'gray'}
                aria-label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
              >
                {task.is_complete ? (
                  <IconCircleCheck size={16} />
                ) : (
                  <IconCircle size={16} />
                )}
              </ActionIcon>
            </span>
          </Tooltip>
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
            title="Edit task"
            aria-label="Edit task"
          >
            <IconEdit size={16} />
          </ActionIcon>
          {onDuplicate && (
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => onDuplicate(task.id)}
              title="Duplicate task"
              aria-label="Duplicate task"
            >
              <IconCopy size={16} />
            </ActionIcon>
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            color="red"
            onClick={() => onDelete(task.id)}
            title="Delete task"
            aria-label="Delete task"
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Card>
    </Box>
  );
}
