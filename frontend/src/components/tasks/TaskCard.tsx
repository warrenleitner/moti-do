import {
  Text,
  Box,
  ActionIcon,
  Collapse,
  Group,
  Tooltip,
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
  IconBolt,
  IconArrowBackUp,
  IconCircleCheck,
  IconPlus,
  IconMinus,
} from '../../ui/icons';
import { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { Task } from '../../types';
import { Priority } from '../../types';
import type { SubtaskViewMode } from '../../store/taskStore';
import { useSystemStatus } from '../../store/userStore';
import { DataBadge } from '../ui';
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

/** Map priority → left accent border color (Kinetic Console palette) */
const priorityAccentColor: Record<string, string> = {
  [Priority.DEFCON_ONE]: '#ff6b9b',
  [Priority.HIGH]: '#FFC775',
  [Priority.MEDIUM]: '#81ecff',
  [Priority.LOW]: '#454752',
  [Priority.TRIVIAL]: '#32343F',
};

/** Map priority → DataBadge color variant */
const priorityBadgeColor: Record<string, 'magenta' | 'amber' | 'cyan' | 'muted'> = {
  [Priority.DEFCON_ONE]: 'magenta',
  [Priority.HIGH]: 'amber',
  [Priority.MEDIUM]: 'cyan',
  [Priority.LOW]: 'muted',
  [Priority.TRIVIAL]: 'muted',
};

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
  const [hovered, setHovered] = useState(false);
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

  const accentColor = task.is_complete
    ? '#454752'
    : priorityAccentColor[task.priority] || '#454752';

  return (
    <Box
      {...swipeHandlers}
      style={{
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 8,
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
                ? '#81ecff'
                : 'rgba(129, 236, 255, 0.4)',
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

      {/* Card container: surface bg, ghost border, left accent, hard shadow */}
      <Box
        className="ghost-border"
        data-testid="task-card"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          backgroundColor: hovered && !isMobile ? '#272A34' : '#10131C',
          borderLeft: `4px solid ${accentColor}`,
          boxShadow: '2px 2px 0px rgba(0, 0, 0, 0.3)',
          opacity: task.is_complete ? 0.6 : isBlocked ? 0.5 : 1,
          transition: swipeOffset > 0 ? 'none' : 'background-color 0.15s ease, opacity 0.15s ease',
          transform: isMobile ? `translateX(${swipeOffset}px)` : 'none',
          padding: '12px 16px',
        }}
      >
        {/* Main row: checkbox + content + XP badge */}
        <Group align="flex-start" gap="sm" wrap="nowrap">
          {/* Square checkbox */}
          <Tooltip label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
            <span>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onComplete(task.id)}
                disabled={isBlocked}
                aria-label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
                style={{
                  color: task.is_complete ? '#81ecff' : '#525560',
                  border: task.is_complete ? '1px solid #81ecff' : '1px solid #454752',
                  borderRadius: 0,
                  width: 22,
                  height: 22,
                  minWidth: 22,
                  minHeight: 22,
                  marginTop: 2,
                  transition: 'all 0.15s ease',
                  boxShadow: task.is_complete ? '0 0 6px rgba(129, 236, 255, 0.3)' : 'none',
                }}
              >
                {task.is_complete ? (
                  <IconCircleCheck size={14} />
                ) : (
                  <span />
                )}
              </ActionIcon>
            </span>
          </Tooltip>

          {/* Center content */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <Group gap="xs" wrap="wrap" align="center">
              {task.icon && <span>{task.icon}</span>}
              <Text
                className="font-display"
                fw={500}
                style={{
                  textDecoration: task.is_complete ? 'line-through' : 'none',
                  color: task.is_complete ? '#525560' : '#e6e7f5',
                }}
              >
                {task.title}
              </Text>
              {task.is_habit && (
                <Tooltip label="Recurring habit">
                  <IconRepeat size={16} color="#81ecff" />
                </Tooltip>
              )}
              {task.dependencies.length > 0 && (
                <Tooltip label={`${task.dependencies.length} dependencies`}>
                  <IconLink size={16} color="#525560" />
                </Tooltip>
              )}
              {isBlocked && (
                <DataBadge value="BLOCKED" color="amber" size="sm" />
              )}
            </Group>

            {/* Meta row: task ID style + due date */}
            <Group gap="xs" mt={4} wrap="wrap">
              {/* Task ID micro-label */}
              <span
                className="font-data"
                style={{
                  fontSize: '0.6875rem',
                  color: '#525560',
                  letterSpacing: '0.05em',
                }}
              >
                {task.id.slice(0, 8).toUpperCase()}
              </span>

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
                        style={{ color: '#a8aab7' }}
                      >
                        <IconMinus size={14} />
                      </ActionIcon>
                    </span>
                  </Tooltip>
                  <DataBadge
                    value={`${task.current_count}/${task.target_count}`}
                    color={task.current_count >= task.target_count ? 'cyan' : 'muted'}
                    size="sm"
                  />
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
                        style={{ color: '#a8aab7' }}
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
              <Text
                size="xs"
                mt="xs"
                className="font-data"
                style={{ color: '#525560', fontSize: '0.6875rem', letterSpacing: '0.05em' }}
              >
                SUBTASKS: {completedSubtasks}/{task.subtasks.length}
              </Text>
            )}
          </Box>

          {/* Right side: XP DataBadge */}
          <DataBadge
            value={`${task.score} XP`}
            color={priorityBadgeColor[task.priority] || 'cyan'}
            icon={<IconBolt size={12} />}
            size="sm"
          />

          {/* Expand button */}
          {hasDetails && (
            <ActionIcon
              size="sm"
              variant="subtle"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Collapse details' : 'Expand details'}
              style={{ color: '#a8aab7' }}
            >
              {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
            </ActionIcon>
          )}
        </Group>

        {/* Expanded details */}
        <Collapse expanded={expanded} transitionDuration={0}>
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
              <Text
                size="xs"
                mb="sm"
                className="font-data"
                style={{ color: '#525560', fontSize: '0.6875rem', letterSpacing: '0.05em' }}
              >
                SUBTASKS: {completedSubtasks}/{task.subtasks.length}
              </Text>
            )}

            {task.text_description && (
              <Text size="sm" mb="sm" style={{ color: '#a8aab7' }}>
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
          {onUndo && task.history.length > 0 && (
            <Tooltip label="Undo last change">
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onUndo(task.id)}
                aria-label="Undo last change"
                style={{ color: '#81ecff' }}
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
            style={{ color: '#a8aab7' }}
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
              style={{ color: '#a8aab7' }}
            >
              <IconCopy size={16} />
            </ActionIcon>
          )}
          <ActionIcon
            size="sm"
            variant="subtle"
            onClick={() => onDelete(task.id)}
            title="Delete task"
            aria-label="Delete task"
            style={{ color: '#ff6b9b' }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Box>
    </Box>
  );
}
