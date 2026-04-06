import React, { useCallback, useMemo, useState } from 'react';
import {
  Table,
  Checkbox,
  ActionIcon,
  Tooltip,
  Badge,
  Box,
  Group,
  Text,
  Popover,
  Stack,
  DatePickerInput,
} from '../../ui';
import {
  IconEdit,
  IconTrash,
  IconCircleCheck,
  IconCircle,
  IconSettings,
  IconChevronUp,
  IconChevronDown,
  IconBan,
  IconRepeat,
  IconDownload,
  IconCopy,
  IconClock,
  IconPlayerSkipForward,
  IconAlertTriangle,
  IconBolt,
  IconFilter,
} from '../../ui/icons';
import { ArcadeButton, DataBadge } from '../ui';
import type { Task } from '../../types/models';
import {
  Priority,
  Difficulty,
  Duration,
  PriorityEmoji,
  DifficultyEmoji,
  DurationEmoji,
} from '../../types/models';
import PriorityChip from '../common/PriorityChip';
import DifficultyChip from '../common/DifficultyChip';
import DurationChip from '../common/DurationChip';
import ProjectChip from '../common/ProjectChip';
import { EditableCell, SelectEditor, DateEditor, TextEditor, ProjectEditor, TagsEditor } from '../table';
import { format } from 'date-fns';
import ColumnConfigDialog from './ColumnConfigDialog';
import { useSystemStatus } from '../../store/userStore';
import { getCombinedTags } from '../../utils/tags';
import { deriveLifecycleStatus, type LifecycleStatus } from '../../utils/taskStatus';
import type { StatusFilter, TaskFilters } from '../../types/filters';

export type ColumnId =
  | 'select'
  | 'icon'
  | 'title'
  | 'score'
  | 'priority'
  | 'difficulty'
  | 'duration'
  | 'start_date'
  | 'due_date'
  | 'creation_date'
  | 'project'
  | 'tags'
  | 'streak'
  | 'subtasks'
  | 'kanban_status'
  | 'status'
  | 'actions';

export interface ColumnConfig {
  id: ColumnId;
  label: string;
  visible: boolean;
  sortable: boolean;
  width?: number;
  minWidth?: number;
}

export interface SortConfig {
  columnId: ColumnId;
  direction: 'asc' | 'desc';
}

interface TaskTableProps {
  tasks: Task[];
  allTasks?: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onInlineEdit?: (taskId: string, updates: Partial<Task>) => Promise<void>;
  selectedTasks?: string[];
  onSelectTask?: (taskId: string) => void;
  onSelectAll?: (selected: boolean) => void;
  onBulkComplete?: (taskIds: string[]) => void;
  onBulkDelete?: (taskIds: string[]) => void;
  onDuplicate?: (taskId: string) => void;
  onBulkDuplicate?: (taskIds: string[]) => void;
  onBulkDefer?: (taskIds: string[]) => void;
  onBulkJumpToCurrent?: (taskIds: string[]) => void;
  onActivateCrisisMode?: (taskIds: string[]) => void;
  filters?: TaskFilters;
  onFiltersChange?: (filters: Partial<TaskFilters>) => void;
  availableProjects?: string[];
  availableTags?: string[];
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: '', visible: true, sortable: false, width: 50 },
  { id: 'icon', label: '', visible: true, sortable: false, width: 50 },
  { id: 'title', label: 'Task', visible: true, sortable: true, minWidth: 200 },
  { id: 'score', label: 'XP', visible: true, sortable: true, width: 80 },
  { id: 'priority', label: 'Priority', visible: true, sortable: true, width: 120 },
  { id: 'difficulty', label: 'Difficulty', visible: true, sortable: true, width: 120 },
  { id: 'duration', label: 'Duration', visible: true, sortable: true, width: 120 },
  { id: 'start_date', label: 'Start Date', visible: false, sortable: true, width: 120 },
  { id: 'due_date', label: 'Due Date', visible: true, sortable: true, width: 120 },
  { id: 'creation_date', label: 'Created', visible: false, sortable: true, width: 120 },
  { id: 'project', label: 'Project', visible: true, sortable: true, width: 120 },
  { id: 'tags', label: 'Tags', visible: true, sortable: false, minWidth: 150 },
  { id: 'streak', label: 'Streak', visible: false, sortable: true, width: 80 },
  { id: 'subtasks', label: 'Subtasks', visible: false, sortable: false, width: 100 },
  { id: 'kanban_status', label: 'Kanban Status', visible: false, sortable: true, width: 140 },
  { id: 'status', label: 'Status', visible: false, sortable: true, width: 120 },
  { id: 'actions', label: 'Actions', visible: true, sortable: false, width: 150 },
];

// Columns that support filtering (module-scope to avoid re-creation on every render)
const FILTERABLE_COLUMNS = new Set<ColumnId>(['priority', 'difficulty', 'duration', 'project', 'tags', 'due_date', 'start_date', 'status']);

// UI component - tested via integration tests
/* v8 ignore start */
const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  allTasks,
  onEdit,
  onDelete,
  onComplete,
  onInlineEdit,
  selectedTasks = [],
  onSelectTask,
  onSelectAll,
  onBulkComplete,
  onBulkDelete,
  onDuplicate,
  onBulkDuplicate,
  onBulkDefer,
  onBulkJumpToCurrent,
  onActivateCrisisMode,
  filters,
  onFiltersChange,
  availableProjects = [],
  availableTags = [],
}) => {
  const loadColumns = (): ColumnConfig[] => {
    const saved = localStorage.getItem('taskTableColumns');
    if (!saved) return DEFAULT_COLUMNS;

    const savedColumns = JSON.parse(saved) as ColumnConfig[];
    const migratedColumns: ColumnConfig[] = savedColumns.map((col) =>
      col.id === 'status' ? { ...col, id: 'kanban_status', label: 'Kanban Status' } : col
    );
    const savedIds = new Set<ColumnId>(migratedColumns.map((c) => c.id));

    // Find new columns that aren't in saved config
    const newColumns = DEFAULT_COLUMNS.filter((c) => !savedIds.has(c.id));

    if (newColumns.length === 0) return migratedColumns;

    // Insert new columns at their default positions
    const merged: ColumnConfig[] = [...migratedColumns];
    for (const newCol of newColumns) {
      const defaultIndex = DEFAULT_COLUMNS.findIndex((c) => c.id === newCol.id);
      // Find the best insertion point based on surrounding columns
      let insertIndex = merged.length;
      for (let i = defaultIndex - 1; i >= 0; i--) {
        const prevColId = DEFAULT_COLUMNS[i].id;
        const prevIndex = merged.findIndex((c) => c.id === prevColId);
        if (prevIndex !== -1) {
          insertIndex = prevIndex + 1;
          break;
        }
      }
      merged.splice(insertIndex, 0, newCol);
    }

    // Save the merged config
    localStorage.setItem('taskTableColumns', JSON.stringify(merged));
    return merged;
  };

  // Load saved column config from localStorage, merging in any new columns
  const [columns, setColumns] = useState<ColumnConfig[]>(loadColumns);

  // Load saved sort config from localStorage
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(() => {
    const saved = localStorage.getItem('taskTableSort');
    return saved ? JSON.parse(saved) : [{ columnId: 'priority', direction: 'desc' }];
  });

  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  const systemStatus = useSystemStatus();

  const lifecycleStatusById = useMemo(() => {
    const statuses = new Map<string, LifecycleStatus>();
    const sourceTasks = allTasks ?? tasks;
    for (const task of tasks) {
      statuses.set(
        task.id,
        deriveLifecycleStatus(task, {
          allTasks: sourceTasks,
          lastProcessedDate: systemStatus?.last_processed_date,
        })
      );
    }
    return statuses;
  }, [allTasks, systemStatus?.last_processed_date, tasks]);

  const getLifecycleStatus = useCallback(
    (task: Task): LifecycleStatus => {
      const cached = lifecycleStatusById.get(task.id);
      if (cached) return cached;
      return deriveLifecycleStatus(task, {
        allTasks: allTasks ?? tasks,
        lastProcessedDate: systemStatus?.last_processed_date,
      });
    },
    [allTasks, lifecycleStatusById, systemStatus?.last_processed_date, tasks]
  );

  // Calculate current processing date (last_processed_date + 1 day) for date comparisons
  const currentProcessingDate = (() => {
    if (!systemStatus?.last_processed_date) return new Date();
    const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
    return new Date(year, month - 1, day + 1);
  })();

  // Save column config to localStorage when it changes
  const updateColumns = (newColumns: ColumnConfig[]) => {
    setColumns(newColumns);
    localStorage.setItem('taskTableColumns', JSON.stringify(newColumns));
  };

  // Save sort config to localStorage when it changes
  const updateSortConfig = (newSort: SortConfig[]) => {
    setSortConfig(newSort);
    localStorage.setItem('taskTableSort', JSON.stringify(newSort));
  };

  const handleSort = (columnId: ColumnId) => {
    const existingIndex = sortConfig.findIndex((s) => s.columnId === columnId);

    if (existingIndex >= 0) {
      // Column already in sort - toggle direction or remove
      const existing = sortConfig[existingIndex];
      if (existing.direction === 'asc') {
        // Change to desc
        const newSort = [...sortConfig];
        newSort[existingIndex] = { ...existing, direction: 'desc' };
        updateSortConfig(newSort);
      } else {
        // Remove from sort
        const newSort = sortConfig.filter((s) => s.columnId !== columnId);
        updateSortConfig(newSort.length > 0 ? newSort : [{ columnId: 'priority', direction: 'desc' }]);
      }
    } else {
      // Add to sort (at the end)
      updateSortConfig([...sortConfig, { columnId, direction: 'asc' }]);
    }
  };

  const sortedTasks = useMemo(() => {
    const sorted = [...tasks];

    sorted.sort((a, b) => {
      for (const sort of sortConfig) {
        let comparison = 0;

        switch (sort.columnId) {
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'score':
            comparison = a.score - b.score;
            break;
          case 'priority': {
            const priorityOrder = { Trivial: 0, Low: 1, Medium: 2, High: 3, 'Defcon One': 4 };
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
          }
          case 'difficulty': {
            const difficultyOrder = { Trivial: 0, Low: 1, Medium: 2, High: 3, Herculean: 4 };
            comparison = difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty];
            break;
          }
          case 'duration': {
            const durationOrder = { Minuscule: 0, Short: 1, Medium: 2, Long: 3, Odysseyan: 4 };
            comparison = durationOrder[a.duration] - durationOrder[b.duration];
            break;
          }
          case 'start_date': {
            if (!a.start_date && !b.start_date) comparison = 0;
            else if (!a.start_date) comparison = 1;
            else if (!b.start_date) comparison = -1;
            else {
              // Handle both date-only (YYYY-MM-DD) and datetime formats
              const aDate = a.start_date.includes('T') ? a.start_date : a.start_date + 'T00:00:00';
              const bDate = b.start_date.includes('T') ? b.start_date : b.start_date + 'T00:00:00';
              comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
            }
            break;
          }
          case 'due_date': {
            if (!a.due_date && !b.due_date) comparison = 0;
            else if (!a.due_date) comparison = 1;
            else if (!b.due_date) comparison = -1;
            else {
              // Handle both date-only (YYYY-MM-DD) and datetime formats
              const aDate = a.due_date.includes('T') ? a.due_date : a.due_date + 'T00:00:00';
              const bDate = b.due_date.includes('T') ? b.due_date : b.due_date + 'T00:00:00';
              comparison = new Date(aDate).getTime() - new Date(bDate).getTime();
            }
            break;
          }
          case 'creation_date':
            comparison = new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
            break;
          case 'project':
            comparison = (a.project || '').localeCompare(b.project || '');
            break;
          case 'streak':
            comparison = a.streak_current - b.streak_current;
            break;
          case 'kanban_status':
            comparison = (a.status || '').localeCompare(b.status || '');
            break;
          case 'status': {
            const statusOrder: Record<LifecycleStatus, number> = {
              active: 0,
              blocked: 1,
              future: 2,
              completed: 3,
            };
            comparison = statusOrder[getLifecycleStatus(a)] - statusOrder[getLifecycleStatus(b)];
            break;
          }
          default:
            break;
        }

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });

    return sorted;
  }, [tasks, sortConfig, getLifecycleStatus]);

  const visibleColumns = columns.filter((col) => col.visible);
  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const handleExportCSV = () => {
    // Get visible columns excluding 'select' and 'actions'
    const exportColumns = visibleColumns.filter(
      (col) => col.id !== 'select' && col.id !== 'actions' && col.id !== 'icon'
    );

    // Helper to escape CSV values
    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Helper to get cell value as string
    const getCellValue = (task: Task, columnId: ColumnId): string => {
      switch (columnId) {
        case 'title':
          return task.title;
        case 'score':
          return String(task.score);
        case 'priority':
          return task.priority;
        case 'difficulty':
          return task.difficulty;
        case 'duration':
          return task.duration;
        case 'start_date':
          return task.start_date
            ? format(new Date(task.start_date.includes('T') ? task.start_date : task.start_date + 'T00:00:00'), 'yyyy-MM-dd')
            : '';
        case 'due_date':
          return task.due_date
            ? format(new Date(task.due_date.includes('T') ? task.due_date : task.due_date + 'T00:00:00'), 'yyyy-MM-dd')
            : '';
        case 'creation_date':
          return format(new Date(task.creation_date), 'yyyy-MM-dd');
        case 'project':
          return task.project || '';
        case 'tags':
          return getCombinedTags(task).join('; ');
        case 'streak':
          return task.is_habit ? String(task.streak_current) : '';
        case 'subtasks': {
          const completed = task.subtasks.filter((st) => st.complete).length;
          const total = task.subtasks.length;
          return total > 0 ? `${completed}/${total}` : '';
        }
        case 'kanban_status':
          return task.status ? task.status.replace('_', ' ') : '';
        case 'status': {
          const lifecycleStatus = getLifecycleStatus(task);
          return lifecycleStatus.charAt(0).toUpperCase() + lifecycleStatus.slice(1);
        }
        default:
          return '';
      }
    };

    // Build CSV content
    const headers = exportColumns.map((col) => escapeCSV(col.label)).join(',');
    const rows = sortedTasks.map((task) =>
      exportColumns.map((col) => escapeCSV(getCellValue(task, col.id))).join(',')
    );
    const csvContent = [headers, ...rows].join('\n');

    // Create and download file
    type BlobWithOptionalText = Blob & { text?: () => Promise<string> };
    const blob: BlobWithOptionalText = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    if (!blob.text) {
      blob.text = async () => csvContent;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderCellContent = (task: Task, columnId: ColumnId) => {
    switch (columnId) {
      case 'select':
        return (
          <Checkbox
            checked={selectedTasks.includes(task.id)}
            onChange={() => onSelectTask?.(task.id)}
            size="sm"
          />
        );

      case 'icon': {
        // Icon column with inline editing
        const iconDisplay = (
          <Group gap={4} wrap="nowrap" align="center">
            {task.icon ? (
              <Tooltip label="Task Icon">
                <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>{task.icon}</span>
              </Tooltip>
            ) : (
              <Tooltip label="Add Icon">
                <span style={{ fontSize: '1.5rem', opacity: 0.3, cursor: 'pointer' }}>+</span>
              </Tooltip>
            )}
            {task.status === 'blocked' && (
              <Tooltip label="Blocked">
                <span style={{ lineHeight: 1, display: 'inline-flex' }}>
                  <IconBan size={16} color="var(--mantine-color-red-6)" />
                </span>
              </Tooltip>
            )}
            {(task.is_habit || task.recurrence_rule) && (
              <Tooltip label="Recurring">
                <span style={{ lineHeight: 1, display: 'inline-flex' }}>
                  <IconRepeat size={16} color="var(--mantine-color-blue-6)" />
                </span>
              </Tooltip>
            )}
          </Group>
        );

        return onInlineEdit ? (
          <EditableCell
            value={task.icon || ''}
            taskId={task.id}
            field="icon"
            displayComponent={iconDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <TextEditor
                value={value}
                placeholder="Emoji"
                maxLength={5}
                style={{ width: 80 }}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          iconDisplay
        );
      }

      case 'title': {
        const titleDisplay = (
          <span
            className="font-display"
            style={{
              textDecoration: task.is_complete ? 'line-through' : 'none',
              color: task.is_complete ? '#525560' : '#e6e7f5',
            }}
          >
            {task.title}
          </span>
        );

        return onInlineEdit ? (
          <EditableCell
            value={task.title}
            taskId={task.id}
            field="title"
            displayComponent={titleDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <TextEditor
                value={value}
                placeholder="Task title"
                required
                minLength={1}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          titleDisplay
        );
      }

      case 'score':
        return (
          <DataBadge
            value={`${task.score} XP`}
            color="cyan"
            icon={<IconBolt size={12} />}
            size="sm"
          />
        );

      case 'priority':
        return onInlineEdit ? (
          <EditableCell
            value={task.priority}
            taskId={task.id}
            field="priority"
            displayComponent={<PriorityChip priority={task.priority} />}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <SelectEditor
                value={value}
                options={Object.values(Priority)}
                emojis={PriorityEmoji}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          <PriorityChip priority={task.priority} />
        );

      case 'difficulty':
        return onInlineEdit ? (
          <EditableCell
            value={task.difficulty}
            taskId={task.id}
            field="difficulty"
            displayComponent={<DifficultyChip difficulty={task.difficulty} />}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <SelectEditor
                value={value}
                options={Object.values(Difficulty)}
                emojis={DifficultyEmoji}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          <DifficultyChip difficulty={task.difficulty} />
        );

      case 'duration':
        return onInlineEdit ? (
          <EditableCell
            value={task.duration}
            taskId={task.id}
            field="duration"
            displayComponent={<DurationChip duration={task.duration} />}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <SelectEditor
                value={value}
                options={Object.values(Duration)}
                emojis={DurationEmoji}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          <DurationChip duration={task.duration} />
        );

      case 'start_date': {
        const startDateDisplay = (() => {
          if (!task.start_date) return '-';
          // Parse date as local to avoid timezone issues
          const startDateStr = task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date;
          const [year, month, day] = startDateStr.split('-').map(Number);
          const startDate = new Date(year, month - 1, day);
          const isFuture = startDate > currentProcessingDate;
          return (
            <span className="font-data" style={{ color: isFuture ? '#525560' : '#e6e7f5', fontSize: '0.8125rem' }}>
              {format(startDate, 'MMM d, yyyy')}
            </span>
          );
        })();

        return onInlineEdit ? (
          <EditableCell
            value={task.start_date}
            taskId={task.id}
            field="start_date"
            displayComponent={startDateDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <DateEditor
                value={value}
                label="Start Date"
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          startDateDisplay
        );
      }

      case 'due_date': {
        const dueDateDisplay = (() => {
          if (!task.due_date) return '-';
          // Parse date as local to avoid timezone issues
          const dueDateStr = task.due_date.includes('T') ? task.due_date.split('T')[0] : task.due_date;
          const [year, month, day] = dueDateStr.split('-').map(Number);
          const dueDate = new Date(year, month - 1, day);
          const isOverdue = dueDate < currentProcessingDate;
          return (
            <span className="font-data" style={{ color: isOverdue ? '#ff6b9b' : '#e6e7f5', fontSize: '0.8125rem' }}>
              {format(dueDate, 'MMM d, yyyy')}
            </span>
          );
        })();

        return onInlineEdit ? (
          <EditableCell
            value={task.due_date}
            taskId={task.id}
            field="due_date"
            displayComponent={dueDateDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <DateEditor
                value={value}
                label="Due Date"
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          dueDateDisplay
        );
      }

      case 'creation_date':
        return (
          <span className="font-data" style={{ color: '#a8aab7', fontSize: '0.8125rem' }}>
            {format(new Date(task.creation_date), 'MMM d, yyyy')}
          </span>
        );

      case 'project': {
        const projectDisplay = task.project ? <ProjectChip project={task.project} /> : '-';

        return onInlineEdit ? (
          <EditableCell
            value={task.project}
            taskId={task.id}
            field="project"
            displayComponent={projectDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <ProjectEditor
                value={value}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          projectDisplay
        );
      }

      case 'tags': {
        const combinedTags = getCombinedTags(task);
        const explicitTags = new Set(task.tags.map((tag) => tag.toLowerCase()));
        const tagsDisplay = combinedTags.length > 0 ? (
          <Group gap={4} wrap="wrap">
            {combinedTags.slice(0, 2).map((tag) => {
              const isImplicit = !explicitTags.has(tag.toLowerCase());
              const badge = (
                <Badge
                  key={tag}
                  size="sm"
                  variant={isImplicit ? 'outline' : 'filled'}
                  color={isImplicit ? 'gray' : undefined}
                >
                  {tag}
                </Badge>
              );
              return isImplicit ? (
                <Tooltip key={tag} label="Implicit tag">
                  {badge}
                </Tooltip>
              ) : (
                badge
              );
            })}
            {combinedTags.length > 2 && (
              <Badge size="sm" variant="outline">
                +{combinedTags.length - 2}
              </Badge>
            )}
          </Group>
        ) : (
          '-'
        );

        return onInlineEdit ? (
          <EditableCell
            value={task.tags}
            taskId={task.id}
            field="tags"
            displayComponent={tagsDisplay}
            renderEditor={({ value, onChange, onClose, onSave }) => (
              <TagsEditor
                value={value}
                onChange={onChange}
                onClose={onClose}
                onSave={onSave}
              />
            )}
            onSave={onInlineEdit}
          />
        ) : (
          tagsDisplay
        );
      }

      case 'streak':
        return task.is_habit && task.streak_current > 0 ? (
          <DataBadge value={`🔥 ${task.streak_current}`} color="amber" size="sm" />
        ) : (
          '-'
        );

      case 'subtasks': {
        const completed = task.subtasks.filter((st) => st.complete).length;
        const total = task.subtasks.length;
        return total > 0 ? `${completed}/${total}` : '-';
      }

      case 'kanban_status':
        return task.status ? (
          <DataBadge
            value={task.status.replace('_', ' ').toUpperCase()}
            color={
              task.status === 'in_progress'
                ? 'cyan'
                : task.status === 'blocked'
                ? 'magenta'
                : 'muted'
            }
            size="sm"
          />
        ) : (
          '-'
        );

      case 'status': {
        const lifecycleStatus = getLifecycleStatus(task);
        const label = lifecycleStatus.toUpperCase();
        const statusColor: Record<string, 'cyan' | 'magenta' | 'amber' | 'muted'> = {
          active: 'cyan',
          blocked: 'magenta',
          future: 'amber',
          completed: 'muted',
        };

        return <DataBadge value={label} color={statusColor[lifecycleStatus] || 'muted'} size="sm" />;
      }

      case 'actions':
        return (
          <Group gap={4}>
            <Tooltip label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => onComplete(task.id)}
                aria-label={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}
                style={{ color: task.is_complete ? '#81ecff' : '#a8aab7' }}
              >
                {task.is_complete ? (
                  <IconCircle size={16} />
                ) : (
                  <IconCircleCheck size={16} />
                )}
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit">
              <ActionIcon size="sm" variant="subtle" onClick={() => onEdit(task)} aria-label="Edit" style={{ color: '#a8aab7' }}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            {onDuplicate && (
              <Tooltip label="Duplicate">
                <ActionIcon size="sm" variant="subtle" onClick={() => onDuplicate(task.id)} aria-label="Duplicate" style={{ color: '#a8aab7' }}>
                  <IconCopy size={16} />
                </ActionIcon>
              </Tooltip>
            )}
            <Tooltip label="Delete">
              <ActionIcon size="sm" variant="subtle" onClick={() => onDelete(task.id)} aria-label="Delete" style={{ color: '#ff6b9b' }}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        );

      default:
        return null;
    }
  };

  const getSortLabel = (columnId: ColumnId) => {
    const sortIndex = sortConfig.findIndex((s) => s.columnId === columnId);
    if (sortIndex < 0) return undefined;

    const sort = sortConfig[sortIndex];
    return {
      active: true,
      direction: sort.direction,
      index: sortConfig.length > 1 ? sortIndex + 1 : undefined,
    };
  };

  // Helper to toggle a value in an array (for multi-select checkboxes)
  const toggleArrayValue = <T,>(arr: T[], value: T): T[] => {
    return arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
  };

  // Determine if a column has an active filter
  const hasColumnFilter = (columnId: ColumnId): boolean => {
    if (!filters) return false;
    switch (columnId) {
      case 'priority': return filters.priorities.length > 0;
      case 'difficulty': return filters.difficulties.length > 0;
      case 'duration': return filters.durations.length > 0;
      case 'project': return filters.projects.length > 0;
      case 'tags': return filters.tags.length > 0;
      case 'due_date': return !!(filters.minDueDate || filters.maxDueDate);
      case 'start_date': return !!(filters.minStartDate || filters.maxStartDate);
      case 'status': return !(filters.statuses.length === 1 && filters.statuses[0] === 'active');
      default: return false;
    }
  };

  // Columns that support filtering
  const filterableColumns = FILTERABLE_COLUMNS;

  // Render filter popover content for a column
  const renderFilterContent = (columnId: ColumnId) => {
    if (!filters || !onFiltersChange) return null;

    const checkboxLabelStyle = {
      color: '#e6e7f5',
      fontFamily: '"JetBrains Mono", monospace',
      fontSize: '0.8125rem',
    };

    switch (columnId) {
      case 'priority':
        return (
          <Stack gap={4}>
            {[Priority.DEFCON_ONE, Priority.HIGH, Priority.MEDIUM, Priority.LOW, Priority.TRIVIAL].map((p) => (
              <Checkbox
                key={p}
                label={`${PriorityEmoji[p]} ${p}`}
                checked={filters.priorities.includes(p)}
                onChange={() => onFiltersChange({ priorities: toggleArrayValue(filters.priorities, p) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        );
      case 'difficulty':
        return (
          <Stack gap={4}>
            {[Difficulty.HERCULEAN, Difficulty.HIGH, Difficulty.MEDIUM, Difficulty.LOW, Difficulty.TRIVIAL].map((d) => (
              <Checkbox
                key={d}
                label={`${DifficultyEmoji[d]} ${d}`}
                checked={filters.difficulties.includes(d)}
                onChange={() => onFiltersChange({ difficulties: toggleArrayValue(filters.difficulties, d) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        );
      case 'duration':
        return (
          <Stack gap={4}>
            {[Duration.ODYSSEYAN, Duration.LONG, Duration.MEDIUM, Duration.SHORT, Duration.MINUSCULE].map((d) => (
              <Checkbox
                key={d}
                label={`${DurationEmoji[d]} ${d}`}
                checked={filters.durations.includes(d)}
                onChange={() => onFiltersChange({ durations: toggleArrayValue(filters.durations, d) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        );
      case 'project':
        return availableProjects.length > 0 ? (
          <Stack gap={4}>
            {availableProjects.map((p) => (
              <Checkbox
                key={p}
                label={p}
                checked={filters.projects.includes(p)}
                onChange={() => onFiltersChange({ projects: toggleArrayValue(filters.projects, p) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed">No projects</Text>
        );
      case 'tags':
        return availableTags.length > 0 ? (
          <Stack gap={4}>
            {availableTags.map((t) => (
              <Checkbox
                key={t}
                label={t}
                checked={filters.tags.includes(t)}
                onChange={() => onFiltersChange({ tags: toggleArrayValue(filters.tags, t) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        ) : (
          <Text size="xs" c="dimmed">No tags</Text>
        );
      case 'due_date':
        return (
          <Stack gap={4}>
            <Text size="xs" style={{ color: '#a8aab7', fontFamily: '"JetBrains Mono", monospace' }}>From</Text>
            <DatePickerInput
              size="xs"
              value={filters.minDueDate ? new Date(filters.minDueDate + 'T00:00:00') : null}
              onChange={(date: string | Date | null) => {
                const d = date ? new Date(date) : null;
                if (d && !isNaN(d.getTime())) {
                  onFiltersChange({ minDueDate: format(d, 'yyyy-MM-dd') });
                } else {
                  onFiltersChange({ minDueDate: undefined });
                }
              }}
              clearable
              placeholder="Start date"
              styles={{
                input: {
                  backgroundColor: '#0B0E17',
                  borderColor: 'rgba(69, 71, 82, 0.15)',
                  borderRadius: 0,
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              }}
            />
            <Text size="xs" style={{ color: '#a8aab7', fontFamily: '"JetBrains Mono", monospace' }}>To</Text>
            <DatePickerInput
              size="xs"
              value={filters.maxDueDate ? new Date(filters.maxDueDate + 'T00:00:00') : null}
              onChange={(date: string | Date | null) => {
                const d = date ? new Date(date) : null;
                if (d && !isNaN(d.getTime())) {
                  onFiltersChange({ maxDueDate: format(d, 'yyyy-MM-dd') });
                } else {
                  onFiltersChange({ maxDueDate: undefined });
                }
              }}
              clearable
              placeholder="End date"
              styles={{
                input: {
                  backgroundColor: '#0B0E17',
                  borderColor: 'rgba(69, 71, 82, 0.15)',
                  borderRadius: 0,
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              }}
            />
          </Stack>
        );
      case 'start_date':
        return (
          <Stack gap={4}>
            <Text size="xs" style={{ color: '#a8aab7', fontFamily: '"JetBrains Mono", monospace' }}>From</Text>
            <DatePickerInput
              size="xs"
              value={filters.minStartDate ? new Date(filters.minStartDate + 'T00:00:00') : null}
              onChange={(date: string | Date | null) => {
                const d = date ? new Date(date) : null;
                if (d && !isNaN(d.getTime())) {
                  onFiltersChange({ minStartDate: format(d, 'yyyy-MM-dd') });
                } else {
                  onFiltersChange({ minStartDate: undefined });
                }
              }}
              clearable
              placeholder="Start date"
              styles={{
                input: {
                  backgroundColor: '#0B0E17',
                  borderColor: 'rgba(69, 71, 82, 0.15)',
                  borderRadius: 0,
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              }}
            />
            <Text size="xs" style={{ color: '#a8aab7', fontFamily: '"JetBrains Mono", monospace' }}>To</Text>
            <DatePickerInput
              size="xs"
              value={filters.maxStartDate ? new Date(filters.maxStartDate + 'T00:00:00') : null}
              onChange={(date: string | Date | null) => {
                const d = date ? new Date(date) : null;
                if (d && !isNaN(d.getTime())) {
                  onFiltersChange({ maxStartDate: format(d, 'yyyy-MM-dd') });
                } else {
                  onFiltersChange({ maxStartDate: undefined });
                }
              }}
              clearable
              placeholder="End date"
              styles={{
                input: {
                  backgroundColor: '#0B0E17',
                  borderColor: 'rgba(69, 71, 82, 0.15)',
                  borderRadius: 0,
                  color: '#e6e7f5',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.75rem',
                },
              }}
            />
          </Stack>
        );
      case 'status':
        return (
          <Stack gap={4}>
            {(['active', 'blocked', 'future', 'completed', 'all'] as StatusFilter[]).map((s) => (
              <Checkbox
                key={s}
                label={s.toUpperCase()}
                checked={filters.statuses.includes(s)}
                onChange={() => onFiltersChange({ statuses: toggleArrayValue(filters.statuses, s) })}
                size="xs"
                styles={{ label: checkboxLabelStyle }}
              />
            ))}
          </Stack>
        );
      default:
        return null;
    }
  };

  const numSelected = selectedTasks.length;

  return (
    <>
      {/* Bulk Actions Toolbar — Kinetic Console styled */}
      {numSelected > 0 && (
        <Box
          p="xs"
          px="sm"
          mb="xs"
          className="ghost-border"
          style={{
            backgroundColor: '#272A34',
            borderTop: '2px solid #81ecff',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <Text
            fw={700}
            className="font-data"
            style={{ flex: '1 1 auto', color: '#81ecff', letterSpacing: '0.05em' }}
          >
            {numSelected} TASK{numSelected > 1 ? 'S' : ''} SELECTED
          </Text>
          <Group gap="xs">
            {onBulkComplete && (
              <ArcadeButton
                variant="primary"
                size="xs"
                onClick={() => onBulkComplete(selectedTasks)}
              >
                <Group gap={4}>
                  <IconCircleCheck size={16} />
                  EXECUTE BATCH
                </Group>
              </ArcadeButton>
            )}
            {onBulkDuplicate && (
              <ArcadeButton
                variant="ghost"
                size="xs"
                onClick={() => onBulkDuplicate(selectedTasks)}
              >
                <Group gap={4}>
                  <IconCopy size={16} />
                  DUPLICATE
                </Group>
              </ArcadeButton>
            )}
            {onBulkDefer && (
              <ArcadeButton
                variant="ghost"
                size="xs"
                onClick={() => onBulkDefer(selectedTasks)}
              >
                <Group gap={4}>
                  <IconClock size={16} />
                  DELAY
                </Group>
              </ArcadeButton>
            )}
            {onBulkJumpToCurrent && (
              <ArcadeButton
                variant="ghost"
                size="xs"
                onClick={() => onBulkJumpToCurrent(selectedTasks)}
              >
                <Group gap={4}>
                  <IconPlayerSkipForward size={16} />
                  JUMP
                </Group>
              </ArcadeButton>
            )}
            {onActivateCrisisMode && (
              <ArcadeButton
                variant="ghost"
                size="xs"
                onClick={() => onActivateCrisisMode(selectedTasks)}
                style={{ borderColor: '#FFC775', color: '#FFC775' }}
              >
                <Group gap={4}>
                  <IconAlertTriangle size={16} />
                  CRISIS
                </Group>
              </ArcadeButton>
            )}
            {onBulkDelete && (
              <ArcadeButton
                variant="secondary"
                size="xs"
                onClick={() => onBulkDelete(selectedTasks)}
              >
                <Group gap={4}>
                  <IconTrash size={16} />
                  DELETE
                </Group>
              </ArcadeButton>
            )}
          </Group>
        </Box>
      )}

      <Group mb="sm" justify="flex-end" gap="xs">
        <Tooltip label="Export to CSV">
          <ActionIcon variant="subtle" onClick={handleExportCSV} aria-label="Export to CSV">
            <IconDownload size={20} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Configure Columns">
          <ActionIcon variant="subtle" onClick={() => setConfigDialogOpen(true)} aria-label="Configure Columns">
            <IconSettings size={20} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Table.ScrollContainer minWidth={800}>
        <Table highlightOnHover withTableBorder verticalSpacing="xs" stickyHeader
          styles={{
            table: {
              borderColor: 'rgba(69, 71, 82, 0.15)',
            },
            thead: {
              backgroundColor: '#181B25',
            },
            th: {
              fontFamily: '"JetBrains Mono", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontSize: '0.6875rem',
              color: '#a8aab7',
              fontWeight: 600,
              backgroundColor: '#181B25',
              borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
              padding: '6px 8px',
            },
            td: {
              borderBottom: '1px solid rgba(69, 71, 82, 0.08)',
              padding: '4px 8px',
              backgroundColor: '#10131C',
              transition: 'background-color 0.1s ease',
            },
            tr: {
              '&:hover td': {
                backgroundColor: '#181B25',
              },
            },
          }}
        >
          <Table.Thead>
            <Table.Tr>
              {visibleColumns.map((col) => (
                <Table.Th
                  key={col.id}
                  style={{ width: col.width, minWidth: col.minWidth, fontWeight: 600 }}
                >
                  {col.id === 'select' && onSelectAll ? (
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => onSelectAll(e.currentTarget.checked)}
                      size="sm"
                    />
                  ) : (
                    <Group
                      gap={4}
                      wrap="nowrap"
                      align="center"
                    >
                      {col.sortable ? (
                        <Group
                          gap={4}
                          wrap="nowrap"
                          style={{ cursor: 'pointer', flex: 1 }}
                          onClick={() => handleSort(col.id)}
                        >
                          <Text
                            size="xs"
                            fw={600}
                            className="font-data"
                            style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a8aab7' }}
                          >
                            {col.label}
                          </Text>
                          {getSortLabel(col.id)?.active && (
                            <>
                              {getSortLabel(col.id)?.direction === 'asc' ? (
                                <IconChevronUp size={14} color="#81ecff" />
                              ) : (
                                <IconChevronDown size={14} color="#81ecff" />
                              )}
                              {getSortLabel(col.id)?.index && (
                                <Text size="xs" fw={700} style={{ color: '#81ecff' }}>
                                  {getSortLabel(col.id)?.index}
                                </Text>
                              )}
                            </>
                          )}
                        </Group>
                      ) : (
                        <Text
                          size="xs"
                          fw={600}
                          className="font-data"
                          style={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a8aab7', flex: 1 }}
                        >
                          {col.label}
                        </Text>
                      )}
                      {filters && onFiltersChange && filterableColumns.has(col.id) && (
                        <Popover position="bottom" withArrow shadow="md" styles={{
                          dropdown: {
                            backgroundColor: '#181B25',
                            border: '1px solid rgba(69, 71, 82, 0.15)',
                            borderRadius: 0,
                            padding: 8,
                            minWidth: 160,
                          },
                        }}>
                          <Popover.Target>
                            <ActionIcon
                              size="xs"
                              variant="subtle"
                              aria-label={`Filter ${col.label}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                color: hasColumnFilter(col.id) ? '#81ecff' : '#525560',
                              }}
                            >
                              <IconFilter size={12} />
                            </ActionIcon>
                          </Popover.Target>
                          <Popover.Dropdown>
                            {renderFilterContent(col.id)}
                          </Popover.Dropdown>
                        </Popover>
                      )}
                    </Group>
                  )}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sortedTasks.map((task) => (
              <Table.Tr key={task.id}>
                {visibleColumns.map((col) => (
                  <Table.Td key={col.id}>{renderCellContent(task, col.id)}</Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>

      <ColumnConfigDialog
        open={configDialogOpen}
        columns={columns}
        onClose={() => setConfigDialogOpen(false)}
        onSave={(newColumns) => {
          updateColumns(newColumns);
          setConfigDialogOpen(false);
        }}
        onReset={() => {
          updateColumns(DEFAULT_COLUMNS);
          updateSortConfig([{ columnId: 'priority', direction: 'desc' }]);
        }}
      />
    </>
  );
};

export default TaskTable;
/* v8 ignore stop */
