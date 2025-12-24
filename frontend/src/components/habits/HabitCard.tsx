import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  IconButton,
  Checkbox,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { Edit, Loop, Delete } from '@mui/icons-material';
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

  return (
    <Card
      sx={{
        mb: 1,
        opacity: habit.is_complete ? 0.7 : 1,
        borderLeft: 4,
        borderColor: habit.is_complete
          ? 'success.main'
          : habit.streak_current >= 7
          ? 'warning.main'
          : 'primary.main',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Checkbox
            checked={habit.is_complete}
            onChange={() => onComplete(habit.id)}
            sx={{ mt: -0.5, ml: -1 }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Title row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              {habit.icon && <span>{habit.icon}</span>}
              <Typography
                variant="body1"
                sx={{
                  textDecoration: habit.is_complete ? 'line-through' : 'none',
                  fontWeight: 500,
                }}
              >
                {habit.title}
              </Typography>
              <Tooltip title={habit.recurrence_rule || 'Recurring'}>
                <Loop fontSize="small" color="primary" />
              </Tooltip>
            </Box>

            {/* Streak and metadata row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
              <StreakBadge current={habit.streak_current} best={habit.streak_best} />
              <PriorityChip priority={habit.priority} />
              {habit.due_date && <DateDisplay date={habit.due_date} label="Due" />}
            </Box>

            {/* Streak progress bar */}
            <Box sx={{ mt: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Streak Progress
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {habit.streak_current} / 30 days
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={streakProgress}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: 'action.hover',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor:
                      habit.streak_current >= 30
                        ? 'success.main'
                        : habit.streak_current >= 14
                        ? 'warning.main'
                        : 'primary.main',
                  },
                }}
              />
            </Box>

            {/* Recurrence info */}
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Repeats: {habit.recurrence_rule || 'Daily'}
            </Typography>
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ px: 2, pt: 0 }}>
        <Box sx={{ flex: 1 }} />
        <IconButton size="small" onClick={() => onEdit(habit)} title="Edit habit">
          <Edit fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(habit.id)} title="Delete habit" color="error">
          <Delete fontSize="small" />
        </IconButton>
      </CardActions>
    </Card>
  );
}
/* v8 ignore stop */
