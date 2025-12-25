import { Box, Text, Select, Group, SegmentedControl, Tooltip } from '@mantine/core';
import {
  IconArrowsSort,
  IconEyeOff,
  IconList,
  IconListDetails,
} from '@tabler/icons-react';
import type { Task } from '../../types';
import { EmptyState, FilterBar } from '../common';
import TaskCard from './TaskCard';
import SubtaskCard from './SubtaskCard';
import { useTaskStore, useFilteredTasks } from '../../store';
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
      <Group gap="md" align="center" mb="md">
        <IconArrowsSort size={20} color="var(--mantine-color-gray-6)" />
        <Select
          value={sort.field}
          onChange={(value) => {
            if (value) setSort({ ...sort, field: value as typeof sort.field });
          }}
          data={[
            { value: 'score', label: 'Score (XP)' },
            { value: 'priority', label: 'Priority' },
            { value: 'due_date', label: 'Due Date' },
            { value: 'creation_date', label: 'Created' },
            { value: 'title', label: 'Title' },
          ]}
          size="sm"
          w={150}
          aria-label="Sort by"
        />
        <Select
          value={sort.order}
          onChange={(value) => {
            if (value) setSort({ ...sort, order: value as 'asc' | 'desc' });
          }}
          data={[
            { value: 'desc', label: 'Descending' },
            { value: 'asc', label: 'Ascending' },
          ]}
          size="sm"
          w={120}
          aria-label="Order"
        />
        <SegmentedControl
          value={subtaskViewMode}
          onChange={(value) => setSubtaskViewMode(value as SubtaskViewMode)}
          size="xs"
          aria-label="subtask view mode"
          data={[
            {
              value: 'hidden',
              label: (
                <Tooltip label="Hide Subtasks">
                  <IconEyeOff size={16} />
                </Tooltip>
              ),
            },
            {
              value: 'inline',
              label: (
                <Tooltip label="Show Inline">
                  <IconList size={16} />
                </Tooltip>
              ),
            },
            {
              value: 'top-level',
              label: (
                <Tooltip label="Show as Tasks">
                  <IconListDetails size={16} />
                </Tooltip>
              ),
            },
          ]}
        />
        <Box style={{ flex: 1 }} />
        <Text size="sm" c="dimmed">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </Text>
      </Group>

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
