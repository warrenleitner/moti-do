import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Task } from '../../types';
import { Priority } from '../../types';
import KanbanColumn, { type KanbanStatus } from './KanbanColumn';
import { useTaskStore } from '../../store';
import { useDefinedProjects } from '../../store/userStore';
import { FilterBar } from '../common';

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
  const { filters, setFilters, resetFilters } = useTaskStore();
  const definedProjects = useDefinedProjects();

  // Get projects from defined projects, and tags from tasks
  const projects = definedProjects.map((p) => p.name);

  const tags = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.tags?.forEach((tag) => set.add(tag)));
    return Array.from(set);
  }, [tasks]);

  // Filter tasks using global store filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude habits (they have their own view)
      if (task.is_habit) return false;

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !task.title.toLowerCase().includes(searchLower) &&
          !task.text_description?.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // Priority filter (multi-select)
      if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
        return false;
      }

      // Difficulty filter (multi-select)
      if (filters.difficulties.length > 0 && !filters.difficulties.includes(task.difficulty)) {
        return false;
      }

      // Duration filter (multi-select)
      if (filters.durations.length > 0 && !filters.durations.includes(task.duration)) {
        return false;
      }

      // Project filter (multi-select)
      if (filters.projects.length > 0 && (!task.project || !filters.projects.includes(task.project))) {
        return false;
      }

      // Tag filter (multi-select - task must have at least one of the selected tags)
      if (filters.tags.length > 0 && !filters.tags.some((tag) => task.tags.includes(tag))) {
        return false;
      }

      // Note: Status filter is ignored in Kanban - we show all statuses in columns
      // Blocked filter is also ignored - blocked status is a column

      return true;
    });
  }, [tasks, filters]);

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
      {/* Filters - using global FilterBar */}
      <FilterBar
        search={filters.search || ''}
        onSearchChange={(search) => setFilters({ search: search || undefined })}
        status={filters.status}
        onStatusChange={(status) => setFilters({ status })}
        priorities={filters.priorities}
        onPrioritiesChange={(priorities) => setFilters({ priorities })}
        difficulties={filters.difficulties}
        onDifficultiesChange={(difficulties) => setFilters({ difficulties })}
        durations={filters.durations}
        onDurationsChange={(durations) => setFilters({ durations })}
        selectedProjects={filters.projects}
        onProjectsChange={(projects) => setFilters({ projects })}
        selectedTags={filters.tags}
        onTagsChange={(tags) => setFilters({ tags })}
        projects={projects}
        tags={tags}
        onReset={resetFilters}
      />

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
