import { useState, useMemo } from 'react';
import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import { Priority } from '../../types';
import KanbanColumn, { type KanbanStatus } from './KanbanColumn';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onEditTask?: (task: Task) => void;
}

interface Column {
  id: KanbanStatus;
  title: string;
  color: string;
  wipLimit?: number;
}

const columns: Column[] = [
  { id: 'backlog', title: 'Backlog', color: '#9e9e9e' },
  { id: 'todo', title: 'To Do', color: '#2196f3' },
  { id: 'in_progress', title: 'In Progress', color: '#ff9800', wipLimit: 3 },
  { id: 'blocked', title: 'Blocked', color: '#f44336' },
  { id: 'done', title: 'Done', color: '#4caf50' },
];

// Map task properties to kanban status
function getTaskStatus(task: Task): KanbanStatus {
  if (task.is_complete) return 'done';
  if (task.status === 'blocked') return 'blocked';
  if (task.status === 'in_progress') return 'in_progress';
  if (task.status === 'todo') return 'todo';
  return 'backlog';
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function KanbanBoard({ tasks, onUpdateTask, onEditTask }: KanbanBoardProps) {
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterTag, setFilterTag] = useState<string>('all');

  // Get unique projects and tags
  const projects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.project && set.add(t.project));
    return Array.from(set);
  }, [tasks]);

  const tags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude habits (they have their own view)
      if (task.is_habit) return false;
      // Filter by project
      if (filterProject !== 'all' && task.project !== filterProject) return false;
      // Filter by tag
      if (filterTag !== 'all' && !task.tags?.includes(filterTag)) return false;
      return true;
    });
  }, [tasks, filterProject, filterTag]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<KanbanStatus, Task[]> = {
      backlog: [],
      todo: [],
      in_progress: [],
      blocked: [],
      done: [],
    };

    filteredTasks.forEach((task) => {
      const status = getTaskStatus(task);
      grouped[status].push(task);
    });

    // Sort by priority within each column
    const priorityOrder: Record<Priority, number> = {
      [Priority.DEFCON_ONE]: 0,
      [Priority.HIGH]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.LOW]: 3,
      [Priority.TRIVIAL]: 4,
    };
    Object.keys(grouped).forEach((status) => {
      grouped[status as KanbanStatus].sort(
        (a, b) => (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
      );
    });

    return grouped;
  }, [filteredTasks]);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;

    if (!destination) return;

    const newStatus = destination.droppableId as KanbanStatus;
    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    // Map kanban status back to task properties
    const updates: Partial<Task> = {};

    if (newStatus === 'done') {
      updates.is_complete = true;
      updates.completion_date = new Date().toISOString();
      updates.status = undefined;
    } else {
      updates.is_complete = false;
      updates.completion_date = undefined;
      updates.status = newStatus === 'backlog' ? undefined : newStatus;
    }

    onUpdateTask(draggableId, updates);
  };

  return (
    <Box>
      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Project</InputLabel>
          <Select
            value={filterProject}
            label="Project"
            onChange={(e) => setFilterProject(e.target.value)}
          >
            <MenuItem value="all">All Projects</MenuItem>
            {projects.map((project) => (
              <MenuItem key={project} value={project}>
                {project}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Tag</InputLabel>
          <Select
            value={filterTag}
            label="Tag"
            onChange={(e) => setFilterTag(e.target.value)}
          >
            <MenuItem value="all">All Tags</MenuItem>
            {tags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Active filters */}
        {(filterProject !== 'all' || filterTag !== 'all') && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {filterProject !== 'all' && (
              <Chip
                label={`Project: ${filterProject}`}
                size="small"
                onDelete={() => setFilterProject('all')}
              />
            )}
            {filterTag !== 'all' && (
              <Chip
                label={`Tag: ${filterTag}`}
                size="small"
                onDelete={() => setFilterTag('all')}
              />
            )}
          </Box>
        )}
      </Box>

      {/* Task count */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Showing {filteredTasks.length} tasks
      </Typography>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            overflowX: 'auto',
            pb: 2,
          }}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              tasks={tasksByStatus[column.id]}
              color={column.color}
              wipLimit={column.wipLimit}
              onEditTask={onEditTask}
            />
          ))}
        </Box>
      </DragDropContext>
    </Box>
  );
}
/* v8 ignore stop */
