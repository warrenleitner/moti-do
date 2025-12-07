import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Typography, Box } from '@mui/material';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';
import type { Task } from '../../types';

interface TaskNodeProps {
  data: {
    task: Task;
    isSelected: boolean;
    color: string;
  };
}

function TaskNode({ data }: TaskNodeProps) {
  const { task, isSelected, color } = data;

  return (
    <Paper
      elevation={isSelected ? 8 : 2}
      sx={{
        p: 1.5,
        minWidth: 180,
        maxWidth: 220,
        borderLeft: `4px solid ${color}`,
        backgroundColor: isSelected ? 'action.selected' : 'background.paper',
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          elevation: 4,
          transform: 'scale(1.02)',
        },
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#666',
          width: 8,
          height: 8,
        }}
      />

      {/* Content */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        {task.is_complete ? (
          <CheckCircle sx={{ fontSize: 18, color: 'success.main', mt: 0.25 }} />
        ) : (
          <RadioButtonUnchecked sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight="medium"
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textDecoration: task.is_complete ? 'line-through' : 'none',
              color: task.is_complete ? 'text.secondary' : 'text.primary',
            }}
          >
            {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
            {task.title}
          </Typography>
          {task.project && (
            <Typography variant="caption" color="text.secondary">
              {task.project}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#666',
          width: 8,
          height: 8,
        }}
      />
    </Paper>
  );
}

export default memo(TaskNode);
