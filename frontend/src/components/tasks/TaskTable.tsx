import React, { useCallback, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  IconButton,
  Tooltip,
  Chip,
  Box,
  TableSortLabel,
  Toolbar,
  Typography,
  Button,
  alpha,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Settings as SettingsIcon,
  Block as BlockIcon,
  Repeat as RepeatIcon,
  Download as DownloadIcon,
  ContentCopy as ContentCopyIcon,
} from '@mui/icons-material';
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
            comparison = 0;
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
            size="small"
          />
        );

      case 'icon': {
        // Icon column with inline editing
        const iconDisplay = (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {task.icon ? (
              <Tooltip title="Task Icon">
                <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>{task.icon}</span>
              </Tooltip>
            ) : (
              <Tooltip title="Add Icon">
                <span style={{ fontSize: '1.5rem', opacity: 0.3, cursor: 'pointer' }}>+</span>
              </Tooltip>
            )}
            {task.status === 'blocked' && (
              <Tooltip title="Blocked">
                <BlockIcon fontSize="small" color="error" />
              </Tooltip>
            )}
            {(task.is_habit || task.recurrence_rule) && (
              <Tooltip title="Recurring">
                <RepeatIcon fontSize="small" color="primary" />
              </Tooltip>
            )}
          </Box>
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
                sx={{ width: 80 }}
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
          <span style={{ textDecoration: task.is_complete ? 'line-through' : 'none' }}>
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
          <Chip
            label={`${task.score} XP`}
            size="small"
            icon={<span>⭐</span>}
            sx={{ fontWeight: 'bold' }}
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
            <span style={{ color: isFuture ? '#9e9e9e' : 'inherit' }}>
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
            <span style={{ color: isOverdue ? '#f44336' : 'inherit' }}>
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
        return format(new Date(task.creation_date), 'MMM d, yyyy');

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
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {combinedTags.slice(0, 2).map((tag) => {
              const isImplicit = !explicitTags.has(tag.toLowerCase());
              const chip = (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant={isImplicit ? 'outlined' : 'filled'}
                  color={isImplicit ? 'default' : 'primary'}
                />
              );
              return isImplicit ? (
                <Tooltip key={tag} title="Implicit tag">
                  {chip}
                </Tooltip>
              ) : (
                chip
              );
            })}
            {combinedTags.length > 2 && (
              <Chip label={`+${combinedTags.length - 2}`} size="small" variant="outlined" />
            )}
          </Box>
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
          <Chip label={`🔥 ${task.streak_current}`} size="small" color="warning" />
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
          <Chip
            label={task.status.replace('_', ' ')}
            size="small"
            color={
              task.status === 'in_progress'
                ? 'primary'
                : task.status === 'blocked'
                ? 'error'
                : 'default'
            }
          />
        ) : (
          '-'
        );

      case 'status': {
        const lifecycleStatus = getLifecycleStatus(task);
        const label = lifecycleStatus.charAt(0).toUpperCase() + lifecycleStatus.slice(1);
        const color =
          lifecycleStatus === 'completed'
            ? 'success'
            : lifecycleStatus === 'blocked'
            ? 'error'
            : lifecycleStatus === 'future'
            ? 'info'
            : 'primary';

        return <Chip label={label} size="small" color={color} variant={lifecycleStatus === 'active' ? 'outlined' : 'filled'} />;
      }

      case 'actions':
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
              <IconButton
                size="small"
                onClick={() => onComplete(task.id)}
              >
                {task.is_complete ? (
                  <RadioButtonUncheckedIcon fontSize="small" />
                ) : (
                  <CheckCircleIcon fontSize="small" />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(task)}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {onDuplicate && (
              <Tooltip title="Duplicate">
                <IconButton size="small" onClick={() => onDuplicate(task.id)}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(task.id)} color="error">
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
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

  const numSelected = selectedTasks.length;

  return (
    <>
      {/* Bulk Actions Toolbar */}
      {numSelected > 0 && (
        <Toolbar
          sx={{
            pl: { sm: 2 },
            pr: { xs: 1, sm: 1 },
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
            borderRadius: 1,
            mb: 1,
          }}
        >
          <Typography sx={{ flex: '1 1 100%' }} color="inherit" variant="subtitle1" component="div">
            {numSelected} task{numSelected > 1 ? 's' : ''} selected
          </Typography>
          {onBulkComplete && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<CheckCircleIcon />}
              onClick={() => onBulkComplete(selectedTasks)}
              sx={{ mr: 1 }}
            >
              Complete Selected
            </Button>
          )}
          {onBulkDuplicate && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => onBulkDuplicate(selectedTasks)}
              sx={{ mr: 1 }}
            >
              Duplicate Selected
            </Button>
          )}
          {onBulkDelete && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => onBulkDelete(selectedTasks)}
            >
              Delete Selected
            </Button>
          )}
        </Toolbar>
      )}

      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Tooltip title="Export to CSV">
          <IconButton onClick={handleExportCSV} aria-label="Export to CSV">
            <DownloadIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Configure Columns">
          <IconButton onClick={() => setConfigDialogOpen(true)}>
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {visibleColumns.map((col) => (
                <TableCell
                  key={col.id}
                  style={{ width: col.width, minWidth: col.minWidth }}
                  sx={{ fontWeight: 'bold' }}
                >
                  {col.id === 'select' && onSelectAll ? (
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected}
                      onChange={(e) => onSelectAll(e.target.checked)}
                      size="small"
                    />
                  ) : col.sortable ? (
                    <TableSortLabel
                      active={getSortLabel(col.id)?.active}
                      direction={getSortLabel(col.id)?.direction}
                      onClick={() => handleSort(col.id)}
                    >
                      {col.label}
                      {getSortLabel(col.id)?.index && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.5,
                            fontSize: '0.75rem',
                            color: 'primary.main',
                            fontWeight: 'bold',
                          }}
                        >
                          {getSortLabel(col.id)?.index}
                        </Box>
                      )}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow key={task.id} hover>
                {visibleColumns.map((col) => (
                  <TableCell key={col.id}>{renderCellContent(task, col.id)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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
