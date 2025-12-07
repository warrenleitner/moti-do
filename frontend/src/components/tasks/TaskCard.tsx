import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Checkbox,
  Collapse,
  Stack,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Edit,
  Delete,
  Loop,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import type { Task } from '../../types';
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
  isBlocked?: boolean;
}

export default function TaskCard({
  task,
  onComplete,
  onEdit,
  onDelete,
  onSubtaskToggle,
  isBlocked = false,
}: TaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  const completedSubtasks = task.subtasks.filter((s) => s.complete).length;
  const hasSubtasks = task.subtasks.length > 0;
  const hasDetails = task.text_description || hasSubtasks || task.tags.length > 0;

  return (
    <Card
      sx={{
        mb: 1,
        opacity: task.is_complete ? 0.7 : isBlocked ? 0.6 : 1,
        borderLeft: 4,
        borderColor: task.is_complete
          ? 'success.main'
          : isBlocked
          ? 'grey.400'
          : 'primary.main',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Main row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Checkbox
            checked={task.is_complete}
            onChange={() => onComplete(task.id)}
            disabled={isBlocked}
            sx={{ mt: -0.5, ml: -1 }}
          />

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

            {/* Metadata row */}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              <PriorityChip priority={task.priority} />
              <DifficultyChip difficulty={task.difficulty} />
              <DurationChip duration={task.duration} />
              {task.due_date && <DateDisplay date={task.due_date} label="Due" />}
              {task.is_habit && (
                <StreakBadge current={task.streak_current} best={task.streak_best} />
              )}
            </Stack>

            {/* Project badge */}
            {task.project && (
              <Chip
                label={task.project}
                size="small"
                sx={{ mt: 1 }}
                variant="outlined"
              />
            )}

            {/* Subtask progress */}
            {hasSubtasks && (
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

            {hasSubtasks && (
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
  );
}
