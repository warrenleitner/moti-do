import { Box, Paper, Text, Badge, Group } from '@mantine/core';
import { Droppable } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import KanbanCard from './KanbanCard';

export type KanbanStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';

interface KanbanColumnProps {
  id: KanbanStatus;
  title: string;
  tasks: Task[];
  color: string;
  wipLimit?: number;
  onEditTask?: (task: Task) => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function KanbanColumn({
  id,
  title,
  tasks,
  color,
  wipLimit,
  onEditTask,
}: KanbanColumnProps) {
  const isOverWipLimit = wipLimit !== undefined && tasks.length > wipLimit;

  return (
    <Paper
      style={{
        width: 280,
        minWidth: 280,
        backgroundColor: 'var(--mantine-color-gray-0)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
      radius="sm"
    >
      {/* Column header */}
      <Box
        p="md"
        style={{
          borderBottom: `3px solid ${color}`,
          backgroundColor: 'var(--mantine-color-white)',
        }}
      >
        <Group justify="space-between" align="center">
          <Text fw={700}>{title}</Text>
          <Badge
            color={isOverWipLimit ? 'red' : 'blue'}
            variant="filled"
            size="sm"
          >
            {tasks.length}
          </Badge>
        </Group>
        {wipLimit !== undefined && (
          <Text
            size="xs"
            c={isOverWipLimit ? 'red' : 'dimmed'}
          >
            WIP Limit: {wipLimit}
          </Text>
        )}
      </Box>

      {/* Droppable area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            p="xs"
            style={{
              flexGrow: 1,
              overflowY: 'auto',
              minHeight: 100,
              backgroundColor: snapshot.isDraggingOver
                ? 'var(--mantine-color-gray-1)'
                : 'transparent',
              transition: 'background-color 0.2s',
            }}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>

      {/* Empty state */}
      {tasks.length === 0 && (
        <Box p="md" ta="center">
          <Text size="sm" c="dimmed">
            No tasks
          </Text>
        </Box>
      )}
    </Paper>
  );
}
/* v8 ignore stop */
