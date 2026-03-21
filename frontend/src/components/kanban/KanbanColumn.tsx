import { Box, Text, Group } from '../../ui';
import { Droppable } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import { DataBadge } from '../ui';
import KanbanCard from './KanbanCard';

export type KanbanStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done';

interface KanbanColumnProps {
  id: KanbanStatus;
  title: string;
  tasks: Task[];
  color: string;
  wipLimit?: number;
  onEditTask?: (task: Task) => void;
  crisisModeActive?: boolean;
  crisisTaskIds?: Set<string>;
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
  crisisModeActive = false,
  crisisTaskIds,
}: KanbanColumnProps) {
  const isOverWipLimit = wipLimit !== undefined && tasks.length > wipLimit;

  return (
    <div
      data-testid="kanban-column"
      style={{
        width: 280,
        minWidth: 280,
        backgroundColor: 'var(--kc-surface)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
        border: '1px solid rgba(59, 73, 76, 0.15)',
        borderTop: `3px solid ${color}`,
      }}
    >
      {/* Column header */}
      <Box
        p="sm"
        style={{
          backgroundColor: 'var(--kc-surface)',
          borderBottom: '1px solid rgba(59, 73, 76, 0.15)',
        }}
      >
        <Group justify="space-between" align="center">
          <Text
            fw={700}
            data-column-title={title}
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.75rem',
              color: 'var(--kc-text-primary)',
            }}
          >
            {title}
          </Text>
          <DataBadge
            value={tasks.length}
            color={isOverWipLimit ? 'magenta' : 'muted'}
            size="sm"
          />
        </Group>
        {wipLimit !== undefined && (
          <Text
            size="xs"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.625rem',
              letterSpacing: '0.05em',
              color: isOverWipLimit ? 'var(--kc-magenta)' : 'var(--kc-text-muted)',
              marginTop: 4,
            }}
          >
            WIP LIMIT: {wipLimit}
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
                ? 'var(--kc-surface-high)'
                : 'var(--kc-surface-low)',
              transition: 'background-color 0.2s',
            }}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.id}
                task={task}
                index={index}
                onEdit={onEditTask}
                isCrisisTask={crisisModeActive && crisisTaskIds?.has(task.id)}
              />
            ))}
            {provided.placeholder}
          </Box>
        )}
      </Droppable>

      {/* Empty state */}
      {tasks.length === 0 && (
        <Box p="md" ta="center">
          <Text
            size="xs"
            style={{
              fontFamily: '"JetBrains Mono", monospace',
              color: 'var(--kc-text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            NO TASKS
          </Text>
        </Box>
      )}
    </div>
  );
}
/* v8 ignore stop */
