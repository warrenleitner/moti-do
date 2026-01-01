import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Collapse,
  Stack,
  Tooltip,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Edit,
  Delete,
  Loop,
  Link as LinkIcon,
  Star,
  Undo,
  CheckCircle,
  RadioButtonUnchecked,
} from '@mui/icons-material';
import { useState, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import type { Task } from '../../types';
import type { SubtaskViewMode } from '../../store/taskStore';
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
  onSubtaskToggle?: (taskId: string, subtaskIndex: number) => void;
  onUndo?: (id: string) => void;
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
  onSubtaskToggle,
  onUndo,
  isBlocked = false,
  subtaskViewMode = 'inline',
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

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

  return (
    <Box
      {...swipeHandlers}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        mb: 1,
        borderRadius: 1,
      }}
    >
      {/* Swipe indicator background - only show on mobile when swiping incomplete tasks */}
      {isMobile && !task.is_complete && !isBlocked && swipeOffset > 0 && (
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: swipeOffset,
            bgcolor: swipeProgress >= 1 ? 'success.main' : 'success.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            pl: 2,
            transition: swipeProgress >= 1 ? 'background-color 0.2s' : 'none',
          }}
        >
          <CheckCircle
            sx={{
              color: 'white',
              opacity: swipeProgress,
              transform: `scale(${0.5 + swipeProgress * 0.5})`,
              transition: 'transform 0.1s',
            }}
          />
        </Box>
      )}
      <Card
        sx={{
          opacity: task.is_complete ? 0.7 : isBlocked ? 0.6 : 1,
          borderLeft: 4,
          borderColor: task.is_complete
            ? 'success.main'
            : isBlocked
            ? 'grey.400'
            : 'primary.main',
          transition: swipeOffset > 0 ? 'none' : 'all 0.2s ease',
          transform: isMobile ? `translateX(${swipeOffset}px)` : 'none',
          '&:hover': {
            boxShadow: 3,
          },
        }}
      >
      <CardContent sx={{ pb: 1 }}>
        {/* Main row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {task.icon && <span>{task.icon}</span>}
              <Typography
                variant="body1"
                sx={{
                  textDecoration: task.is_complete ? 'line-through' : 'none',
                  fontWeight: 500,
                }}
              >
                {task.title}
              </Typography>
              {task.is_habit && (
                <Tooltip title="Recurring habit">
                  <Loop fontSize="small" color="primary" />
                </Tooltip>
              )}
              {task.dependencies.length > 0 && (
                <Tooltip title={`${task.dependencies.length} dependencies`}>
                  <LinkIcon fontSize="small" color="action" />
                </Tooltip>
              )}
              {isBlocked && (
                <Chip label="Blocked" size="small" color="warning" variant="outlined" />
              )}
            </Box>

            {/* Metadata row - on mobile, show only XP and due date when collapsed */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              <Tooltip title="XP reward for completing this task">
                <Chip
                  icon={<Star sx={{ fontSize: 16 }} />}
                  label={`${task.score} XP`}
                  size="small"
                  color="secondary"
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              </Tooltip>
              {/* Show full metadata on desktop, minimal on mobile */}
              {!isMobile && (
                <>
                  <PriorityChip priority={task.priority} />
                  <DifficultyChip difficulty={task.difficulty} />
                  <DurationChip duration={task.duration} />
                </>
              )}
              {task.due_date && <DateDisplay date={task.due_date} label="Due" />}
              {!isMobile && task.is_habit && (
                <StreakBadge current={task.streak_current} best={task.streak_best} />
              )}
              {/* Project badge - inline with other metadata (desktop only) */}
              {!isMobile && task.project && <ProjectChip project={task.project} />}
            </Stack>

            {/* Subtask progress - show in inline and top-level modes (desktop only when collapsed) */}
            {!isMobile && hasSubtasks && subtaskViewMode !== 'hidden' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Subtasks: {completedSubtasks}/{task.subtasks.length}
              </Typography>
            )}
          </Box>

          {/* Expand button */}
          {hasDetails && (
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>

        {/* Expanded details */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pl: 4 }}>
            {/* Mobile-only: show hidden metadata when expanded */}
            {isMobile && (
              <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <PriorityChip priority={task.priority} />
                <DifficultyChip difficulty={task.difficulty} />
                <DurationChip duration={task.duration} />
                {task.is_habit && (
                  <StreakBadge current={task.streak_current} best={task.streak_best} />
                )}
                {task.project && <ProjectChip project={task.project} />}
              </Stack>
            )}

            {/* Mobile: show subtask progress in expanded section */}
            {isMobile && hasSubtasks && subtaskViewMode !== 'hidden' && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                Subtasks: {completedSubtasks}/{task.subtasks.length}
              </Typography>
            )}

            {task.text_description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {task.text_description}
              </Typography>
            )}

            {task.tags.length > 0 && (
              <Stack direction="row" spacing={0.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                {task.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
              </Stack>
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
      </CardContent>

      <CardActions sx={{ px: 2, pt: 0 }}>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
          <span>
            <IconButton
              size="small"
              onClick={() => onComplete(task.id)}
              disabled={isBlocked}
              color={task.is_complete ? 'success' : 'default'}
              aria-label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
            >
              {task.is_complete ? (
                <CheckCircle fontSize="small" />
              ) : (
                <RadioButtonUnchecked fontSize="small" />
              )}
            </IconButton>
          </span>
        </Tooltip>
        {onUndo && task.history.length > 0 && (
          <Tooltip title="Undo last change">
            <IconButton size="small" onClick={() => onUndo(task.id)} color="info">
              <Undo fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <IconButton size="small" onClick={() => onEdit(task)} title="Edit task">
          <Edit fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onDelete(task.id)}
          color="error"
          title="Delete task"
        >
          <Delete fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
    </Box>
  );
}
