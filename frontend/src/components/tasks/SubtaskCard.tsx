import { Card, CardContent, Box, Checkbox, Typography, Chip } from '@mui/material';
import { SubdirectoryArrowRight } from '@mui/icons-material';
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
      sx={{
        mb: 1,
        ml: 4,
        opacity: subtask.complete ? 0.7 : 1,
        borderLeft: 3,
        borderColor: subtask.complete ? 'success.light' : 'grey.400',
        backgroundColor: 'grey.50',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 2,
        },
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SubdirectoryArrowRight fontSize="small" color="action" sx={{ ml: -0.5 }} />
          <Checkbox
            checked={subtask.complete}
            onChange={() => onToggle?.(parentTask.id, subtaskIndex)}
            disabled={!onToggle || parentTask.is_complete}
            size="small"
            sx={{ p: 0.5 }}
          />
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              textDecoration: subtask.complete ? 'line-through' : 'none',
              color: subtask.complete ? 'text.secondary' : 'text.primary',
            }}
          >
            {subtask.text}
          </Typography>
          <Chip
            label={parentTask.title}
            size="small"
            variant="outlined"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
/* v8 ignore stop */
