import { Card, CardContent, Typography, Box, Chip, IconButton } from '@mui/material';
import { Draggable } from '@hello-pangea/dnd';
import { Edit, Schedule, LocalFireDepartment } from '@mui/icons-material';
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

export default function KanbanCard({ task, index, onEdit }: KanbanCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !task.is_complete;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          sx={{
            mb: 1,
            borderLeft: `4px solid ${priorityColors[task.priority] || '#1976d2'}`,
            backgroundColor: snapshot.isDragging ? 'action.hover' : 'background.paper',
            boxShadow: snapshot.isDragging ? 4 : 1,
            transition: 'box-shadow 0.2s',
            '&:hover': {
              boxShadow: 2,
            },
          }}
        >
          <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Typography
                variant="body2"
                fontWeight="medium"
                sx={{
                  flex: 1,
                  textDecoration: task.is_complete ? 'line-through' : 'none',
                  color: task.is_complete ? 'text.secondary' : 'text.primary',
                }}
              >
                {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
                {task.title}
              </Typography>
              {onEdit && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  sx={{ ml: 0.5, p: 0.5 }}
                >
                  <Edit fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {task.tags.slice(0, 3).map((tag) => (
                  <Chip key={tag} label={tag} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                ))}
                {task.tags.length > 3 && (
                  <Chip label={`+${task.tags.length - 3}`} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                )}
              </Box>
            )}

            {/* Meta info */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <PriorityChip priority={task.priority} size="small" />
              <DurationChip duration={task.duration} size="small" />

              {/* Streak for habits */}
              {task.is_habit && task.streak_current > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                  <LocalFireDepartment sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" color="warning.main">
                    {task.streak_current}
                  </Typography>
                </Box>
              )}

              {/* Due date */}
              {task.due_date && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.25,
                    color: isOverdue ? 'error.main' : 'text.secondary',
                  }}
                >
                  <Schedule sx={{ fontSize: 14 }} />
                  <Typography variant="caption">
                    {new Date(task.due_date).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Subtask progress */}
            {task.subtasks && task.subtasks.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {task.subtasks.filter((s) => s.complete).length}/{task.subtasks.length} subtasks
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Draggable>
  );
}
