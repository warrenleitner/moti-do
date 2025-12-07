import { Box, Paper, Typography, Badge } from '@mui/material';
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
      sx={{
        width: 280,
        minWidth: 280,
        backgroundColor: 'grey.50',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          p: 2,
          borderBottom: `3px solid ${color}`,
          backgroundColor: 'background.paper',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {title}
          </Typography>
          <Badge
            badgeContent={tasks.length}
            color={isOverWipLimit ? 'error' : 'primary'}
            sx={{
              '& .MuiBadge-badge': {
                position: 'static',
                transform: 'none',
              },
            }}
          />
        </Box>
        {wipLimit !== undefined && (
          <Typography
            variant="caption"
            color={isOverWipLimit ? 'error.main' : 'text.secondary'}
          >
            WIP Limit: {wipLimit}
          </Typography>
        )}
      </Box>

      {/* Droppable area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <Box
            ref={provided.innerRef}
            {...provided.droppableProps}
            sx={{
              p: 1,
              flexGrow: 1,
              overflowY: 'auto',
              minHeight: 100,
              backgroundColor: snapshot.isDraggingOver ? 'action.hover' : 'transparent',
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
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No tasks
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
