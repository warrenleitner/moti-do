import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Paper, Text, Group, Box } from '@mantine/core';
import { IconCircleCheck, IconCircle } from '@tabler/icons-react';
import type { Task } from '../../types';

interface TaskNodeProps {
  data: {
    task: Task;
    isSelected: boolean;
    color: string;
  };
}

// React Flow node component - tested via integration tests
/* v8 ignore start */
function TaskNode({ data }: TaskNodeProps) {
  const { task, isSelected, color } = data;

  return (
    <Paper
      shadow={isSelected ? 'lg' : 'xs'}
      p="sm"
      style={{
        minWidth: 180,
        maxWidth: 220,
        borderLeft: `4px solid ${color}`,
        backgroundColor: isSelected
          ? 'var(--mantine-color-gray-1)'
          : 'var(--mantine-color-white)',
        cursor: 'pointer',
        transition: 'all 0.2s',
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
      <Group gap="xs" align="flex-start" wrap="nowrap">
        {task.is_complete ? (
          <IconCircleCheck size={18} color="var(--mantine-color-green-6)" style={{ marginTop: 2 }} />
        ) : (
          <IconCircle size={18} color="var(--mantine-color-gray-5)" style={{ marginTop: 2 }} />
        )}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text
            size="sm"
            fw={500}
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            td={task.is_complete ? 'line-through' : undefined}
            c={task.is_complete ? 'dimmed' : undefined}
          >
            {task.icon && <span style={{ marginRight: 4 }}>{task.icon}</span>}
            {task.title}
          </Text>
          {task.project && (
            <Text size="xs" c="dimmed">
              {task.project}
            </Text>
          )}
        </Box>
      </Group>

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
/* v8 ignore stop */

export default memo(TaskNode);
