import {
  Box,
  Text,
  Select,
  Group,
  SegmentedControl,
  Tooltip,
} from '../../ui';
import {
  IconArrowsSort,
  IconEyeOff,
  IconList,
  IconListDetails,
} from '../../ui/icons';
import type { Task } from '../../types';
import { EmptyState, FilterDialog } from '../common';
import TaskCard from './TaskCard';
import SubtaskCard from './SubtaskCard';
import { useTaskStore, useFilteredTasks } from '../../store';
import { useSystemStatus, useDefinedProjects } from '../../store/userStore';
import type { SubtaskViewMode } from '../../store/taskStore';

interface TaskListProps {
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
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
  onDuplicate,
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
      <FilterDialog
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
        maxDueDate={filters.maxDueDate}
        onMaxDueDateChange={(maxDueDate) => setFilters({ maxDueDate })}
        onReset={resetFilters}
      />

      {/* Sort controls */}
      <Group gap="md" align="center" mb="md" wrap="wrap">
        <IconArrowsSort size={20} color="#a8aab7" />
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
          styles={{
            input: {
              backgroundColor: '#0B0E17',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8125rem',
            },
            dropdown: {
              backgroundColor: '#181B25',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
            },
            option: {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8125rem',
              color: '#e6e7f5',
            },
          }}
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
          styles={{
            input: {
              backgroundColor: '#0B0E17',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
              color: '#e6e7f5',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8125rem',
            },
            dropdown: {
              backgroundColor: '#181B25',
              borderColor: 'rgba(69, 71, 82, 0.15)',
              borderRadius: 0,
            },
            option: {
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.8125rem',
              color: '#e6e7f5',
            },
          }}
        />
        <SegmentedControl
          value={subtaskViewMode}
          onChange={(value) => setSubtaskViewMode(value as SubtaskViewMode)}
          size="xs"
          aria-label="subtask view mode"
          styles={{
            root: {
              backgroundColor: '#272A34',
              borderRadius: 0,
            },
            indicator: {
              backgroundColor: '#10131C',
              borderRadius: 0,
              boxShadow: '0 0 6px rgba(129, 236, 255, 0.2)',
            },
            label: {
              color: '#a8aab7',
              '&[data-active]': {
                color: '#81ecff',
              },
            },
          }}
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
        <Text size="sm" className="font-data" style={{ color: '#525560', letterSpacing: '0.05em' }}>
          {filteredTasks.length} TASK{filteredTasks.length !== 1 ? 'S' : ''}
        </Text>
      </Group>

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
                onDuplicate={onDuplicate}
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
