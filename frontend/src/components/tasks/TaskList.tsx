import { Box, Typography, FormControl, InputLabel, Select, MenuItem, Stack } from '@mui/material';
import { Sort } from '@mui/icons-material';
import type { Task } from '../../types';
import { EmptyState, FilterBar } from '../common';
import TaskCard from './TaskCard';
import { useTaskStore, useFilteredTasks } from '../../store';

interface TaskListProps {
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskIndex: number) => void;
  onCreateNew?: () => void;
}

export default function TaskList({
  onEdit,
  onDelete,
  onComplete,
  onSubtaskToggle,
  onCreateNew,
}: TaskListProps) {
  const { filters, sort, setFilters, resetFilters, setSort, tasks: allTasks } = useTaskStore();
  const filteredTasks = useFilteredTasks();

  // Get unique projects and tags from tasks
  const projects = [...new Set(allTasks.map((t) => t.project).filter(Boolean))] as string[];
  const tags = [...new Set(allTasks.flatMap((t) => t.tags))];

  // Check if task is blocked
  const isTaskBlocked = (task: Task) => {
    if (task.dependencies.length === 0) return false;
    return task.dependencies.some((depId) => {
      const dep = allTasks.find((t) => t.id === depId);
      return dep && !dep.is_complete;
    });
  };

  return (
    <Box>
      {/* Filters */}
      <FilterBar
        search={filters.search || ''}
        onSearchChange={(search) => setFilters({ search: search || undefined })}
        status={filters.status}
        onStatusChange={(status) => setFilters({ status })}
        priority={filters.priority}
        onPriorityChange={(priority) => setFilters({ priority })}
        project={filters.project}
        onProjectChange={(project) => setFilters({ project })}
        tag={filters.tag}
        onTagChange={(tag) => setFilters({ tag })}
        projects={projects}
        tags={tags}
        onReset={resetFilters}
      />

      {/* Sort controls */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
        <Sort color="action" />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort by</InputLabel>
          <Select
            value={sort.field}
            label="Sort by"
            onChange={(e) =>
              setSort({ ...sort, field: e.target.value as typeof sort.field })
            }
          >
            <MenuItem value="score">Score (XP)</MenuItem>
            <MenuItem value="priority">Priority</MenuItem>
            <MenuItem value="due_date">Due Date</MenuItem>
            <MenuItem value="creation_date">Created</MenuItem>
            <MenuItem value="title">Title</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Order</InputLabel>
          <Select
            value={sort.order}
            label="Order"
            onChange={(e) =>
              setSort({ ...sort, order: e.target.value as 'asc' | 'desc' })
            }
          >
            <MenuItem value="desc">Descending</MenuItem>
            <MenuItem value="asc">Ascending</MenuItem>
          </Select>
        </FormControl>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </Typography>
      </Stack>

      {/* Task list */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description={
            filters.search || filters.priority || filters.project || filters.tag
              ? 'Try adjusting your filters to see more tasks.'
              : "You're all caught up! Create a new task to get started."
          }
          actionLabel={onCreateNew ? 'Create Task' : undefined}
          onAction={onCreateNew}
        />
      ) : (
        <Box>
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={onComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              onSubtaskToggle={onSubtaskToggle}
              isBlocked={isTaskBlocked(task)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
