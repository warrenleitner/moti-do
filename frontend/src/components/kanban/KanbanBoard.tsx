import { useMemo } from 'react';
import { Box, Text, Select, Group } from '../../ui';
import { IconArrowsSort } from '../../ui/icons';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import type { Task, TaskStatus } from '../../types';
import { Priority } from '../../types';
import KanbanColumn, { type KanbanStatus } from './KanbanColumn';
import { useTaskStore } from '../../store';
import { useDefinedProjects } from '../../store/userStore';
import { FilterBar } from '../common';

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onEditTask?: (task: Task) => void;
  onCompleteTask?: (taskId: string) => void;
  onUncompleteTask?: (taskId: string) => void;
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
export default function KanbanBoard({
  tasks,
  onUpdateTask,
  onEditTask,
  onCompleteTask,
  onUncompleteTask,
}: KanbanBoardProps) {
  const { filters, setFilters, resetFilters, sort, setSort } = useTaskStore();
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

    // Sort within each column using global sort settings
    const priorityOrder: Record<Priority, number> = {
      [Priority.TRIVIAL]: 0,
      [Priority.LOW]: 1,
      [Priority.MEDIUM]: 2,
      [Priority.HIGH]: 3,
      [Priority.DEFCON_ONE]: 4,
    };

    Object.keys(grouped).forEach((status) => {
      grouped[status as KanbanStatus].sort((a, b) => {
        let comparison = 0;

        switch (sort.field) {
          case 'priority':
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          case 'due_date':
            if (!a.due_date && !b.due_date) comparison = 0;
            else if (!a.due_date) comparison = 1;
            else if (!b.due_date) comparison = -1;
            else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'creation_date':
            comparison = new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'score':
            comparison = a.score - b.score;
            break;
          default:
            comparison = 0;
        }

        return sort.order === 'asc' ? comparison : -comparison;
      });
    });

    return grouped;
  }, [filteredTasks, sort]);

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    const newStatus = destination.droppableId as KanbanStatus;
    const oldStatus = source.droppableId as KanbanStatus;
    const task = tasks.find((t) => t.id === draggableId);

    if (!task) return;

    // Case 1: Dragging TO done column - trigger full completion
    if (newStatus === 'done' && oldStatus !== 'done') {
      if (onCompleteTask) {
        onCompleteTask(draggableId);
        return;
      }
      // Fallback if no handler provided
      onUpdateTask(draggableId, {
        is_complete: true,
        completion_date: new Date().toISOString(),
        status: undefined,
      });
      return;
    }

    // Case 2: Dragging FROM done column - uncomplete and update status
    if (oldStatus === 'done' && newStatus !== 'done') {
      if (onUncompleteTask) {
        onUncompleteTask(draggableId);
      }
      // newStatus is 'backlog' | 'todo' | 'in_progress' | 'blocked' (not 'done')
      const taskStatus = newStatus === 'backlog' ? undefined : (newStatus as TaskStatus);
      onUpdateTask(draggableId, {
        is_complete: false,
        completion_date: undefined,
        status: taskStatus,
      });
      return;
    }

    // Case 3: Moving between non-done columns
    // newStatus is 'backlog' | 'todo' | 'in_progress' | 'blocked' (not 'done')
    const taskStatus = newStatus === 'backlog' ? undefined : (newStatus as TaskStatus);
    onUpdateTask(draggableId, {
      is_complete: false,
      completion_date: undefined,
      status: taskStatus,
    });
  };

  // Sort field options
  const sortFieldData = [
    { value: 'score', label: 'Score (XP)' },
    { value: 'priority', label: 'Priority' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'creation_date', label: 'Created' },
    { value: 'title', label: 'Title' },
  ];

  // Sort order options
  const sortOrderData = [
    { value: 'desc', label: 'Descending' },
    { value: 'asc', label: 'Ascending' },
  ];

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
        maxDueDate={filters.maxDueDate}
        onMaxDueDateChange={(maxDueDate) => setFilters({ maxDueDate })}
        onReset={resetFilters}
      />

      {/* Sort controls */}
      <Group gap="md" mb="md" align="center" wrap="wrap">
        <IconArrowsSort size={20} color="var(--mantine-color-gray-6)" />
        <Select
          label="Sort by"
          value={sort.field}
          onChange={(v) =>
            setSort({ ...sort, field: (v || 'score') as typeof sort.field })
          }
          data={sortFieldData}
          size="sm"
          w={150}
          role="combobox"
        />
        <Select
          label="Order"
          value={sort.order}
          onChange={(v) =>
            setSort({ ...sort, order: (v || 'desc') as 'asc' | 'desc' })
          }
          data={sortOrderData}
          size="sm"
          w={120}
          role="combobox"
        />
        <Box style={{ flex: 1 }} />
        <Text size="sm" c="dimmed">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
        </Text>
      </Group>

      {/* Kanban columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Box
          style={{
            display: 'flex',
            gap: 'var(--mantine-spacing-md)',
            overflowX: 'auto',
            paddingBottom: 'var(--mantine-spacing-md)',
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
