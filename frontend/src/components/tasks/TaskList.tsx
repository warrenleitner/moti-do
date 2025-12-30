import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import {
  Sort,
  VisibilityOff,
  ListAlt,
  FormatListBulleted,
} from '@mui/icons-material';
import type { Task } from '../../types';
import { EmptyState, FilterBar } from '../common';
import TaskCard from './TaskCard';
import SubtaskCard from './SubtaskCard';
import { useTaskStore, useFilteredTasks } from '../../store';
import { useSystemStatus, useDefinedProjects } from '../../store/userStore';
import type { SubtaskViewMode } from '../../store/taskStore';

interface TaskListProps {
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskIndex: number) => void;
  onUndo?: (id: string) => void;
  onCreateNew?: () => void;
}

// UI component - tested via integration tests
/* v8 ignore start */
export default function TaskList({
  onEdit,
  onDelete,
  onComplete,
  onSubtaskToggle,
  onUndo,
  onCreateNew,
}: TaskListProps) {
  const {
    filters,
    sort,
    setFilters,
    resetFilters,
    setSort,
    tasks: allTasks,
    subtaskViewMode,
    setSubtaskViewMode,
  } = useTaskStore();
  const systemStatus = useSystemStatus();
  const filteredTasks = useFilteredTasks(systemStatus?.last_processed_date);
  const definedProjects = useDefinedProjects();

  // Get projects from defined projects, and tags from tasks
  const projects = definedProjects.map((p) => p.name);
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
        <ToggleButtonGroup
          value={subtaskViewMode}
          exclusive
          onChange={(_, value: SubtaskViewMode | null) => {
            if (value) setSubtaskViewMode(value);
          }}
          size="small"
          aria-label="subtask view mode"
        >
          <ToggleButton value="hidden" aria-label="hide subtasks">
            <Tooltip title="Hide Subtasks">
              <VisibilityOff fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="inline" aria-label="show subtasks inline">
            <Tooltip title="Show Inline">
              <ListAlt fontSize="small" />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="top-level" aria-label="show subtasks as tasks">
            <Tooltip title="Show as Tasks">
              <FormatListBulleted fontSize="small" />
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
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
            filters.search ||
            filters.priorities.length > 0 ||
            filters.difficulties.length > 0 ||
            filters.durations.length > 0 ||
            filters.projects.length > 0 ||
            filters.tags.length > 0
              ? 'Try adjusting your filters to see more tasks.'
              : "You're all caught up! Create a new task to get started."
          }
          actionLabel={onCreateNew ? 'Create Task' : undefined}
          onAction={onCreateNew}
        />
      ) : (
        <Box>
          {filteredTasks.map((task) => (
            <Box key={task.id}>
              <TaskCard
                task={task}
                onComplete={onComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onSubtaskToggle={onSubtaskToggle}
                onUndo={onUndo}
                isBlocked={isTaskBlocked(task)}
                subtaskViewMode={subtaskViewMode}
              />
              {subtaskViewMode === 'top-level' &&
                task.subtasks.map((subtask, index) => (
                  <SubtaskCard
                    key={`${task.id}-subtask-${index}`}
                    subtask={subtask}
                    subtaskIndex={index}
                    parentTask={task}
                    onToggle={onSubtaskToggle}
                  />
                ))}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
/* v8 ignore stop */
