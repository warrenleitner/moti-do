import React, { useMemo, useState } from 'react';
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
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import type { Task } from '../../types/models';
import { useTaskStore } from '../../store/taskStore';
import PriorityChip from '../common/PriorityChip';
import DifficultyChip from '../common/DifficultyChip';
import DurationChip from '../common/DurationChip';
import { format } from 'date-fns';
import ColumnConfigDialog from './ColumnConfigDialog';

export type ColumnId =
  | 'select'
  | 'icon'
  | 'title'
  | 'score'
  | 'priority'
  | 'difficulty'
  | 'duration'
  | 'due_date'
  | 'creation_date'
  | 'project'
  | 'tags'
  | 'streak'
  | 'subtasks'
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
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  selectedTasks?: string[];
  onSelectTask?: (taskId: string) => void;
  onSelectAll?: (selected: boolean) => void;
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'select', label: '', visible: true, sortable: false, width: 50 },
  { id: 'icon', label: '', visible: true, sortable: false, width: 50 },
  { id: 'title', label: 'Task', visible: true, sortable: true, minWidth: 200 },
  { id: 'score', label: 'XP', visible: true, sortable: true, width: 80 },
  { id: 'priority', label: 'Priority', visible: true, sortable: true, width: 120 },
  { id: 'difficulty', label: 'Difficulty', visible: true, sortable: true, width: 120 },
  { id: 'duration', label: 'Duration', visible: true, sortable: true, width: 120 },
  { id: 'due_date', label: 'Due Date', visible: true, sortable: true, width: 120 },
  { id: 'creation_date', label: 'Created', visible: false, sortable: true, width: 120 },
  { id: 'project', label: 'Project', visible: true, sortable: true, width: 120 },
  { id: 'tags', label: 'Tags', visible: false, sortable: false, minWidth: 150 },
  { id: 'streak', label: 'Streak', visible: false, sortable: true, width: 80 },
  { id: 'subtasks', label: 'Subtasks', visible: false, sortable: false, width: 100 },
  { id: 'status', label: 'Status', visible: false, sortable: true, width: 120 },
  { id: 'actions', label: 'Actions', visible: true, sortable: false, width: 150 },
];

const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  onEdit,
  onDelete,
  onComplete,
  selectedTasks = [],
  onSelectTask,
  onSelectAll,
}) => {
  const completeTask = useTaskStore((state) => state.completeTask);
  const uncompleteTask = useTaskStore((state) => state.uncompleteTask);

  // Load saved column config from localStorage
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem('taskTableColumns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  // Load saved sort config from localStorage
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(() => {
    const saved = localStorage.getItem('taskTableSort');
    return saved ? JSON.parse(saved) : [{ columnId: 'priority', direction: 'desc' }];
  });

  const [configDialogOpen, setConfigDialogOpen] = useState(false);

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
          case 'due_date':
            if (!a.due_date && !b.due_date) comparison = 0;
            else if (!a.due_date) comparison = 1;
            else if (!b.due_date) comparison = -1;
            else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case 'creation_date':
            comparison = new Date(a.creation_date).getTime() - new Date(b.creation_date).getTime();
            break;
          case 'project':
            comparison = (a.project || '').localeCompare(b.project || '');
            break;
          case 'streak':
            comparison = a.streak_current - b.streak_current;
            break;
          case 'status':
            comparison = (a.status || '').localeCompare(b.status || '');
            break;
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
  }, [tasks, sortConfig]);

  const visibleColumns = columns.filter((col) => col.visible);
  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

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

      case 'icon':
        return task.icon ? <span style={{ fontSize: '1.5rem' }}>{task.icon}</span> : null;

      case 'title':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {task.is_complete ? (
              <CheckCircleIcon color="success" fontSize="small" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
            )}
            <span style={{ textDecoration: task.is_complete ? 'line-through' : 'none' }}>
              {task.title}
            </span>
          </Box>
        );

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
        return <PriorityChip priority={task.priority} />;

      case 'difficulty':
        return <DifficultyChip difficulty={task.difficulty} />;

      case 'duration':
        return <DurationChip duration={task.duration} />;

      case 'due_date':
        return task.due_date ? (
          <span style={{ color: new Date(task.due_date) < new Date() ? '#f44336' : 'inherit' }}>
            {format(new Date(task.due_date), 'MMM d, yyyy')}
          </span>
        ) : (
          '-'
        );

      case 'creation_date':
        return format(new Date(task.creation_date), 'MMM d, yyyy');

      case 'project':
        return task.project ? <Chip label={task.project} size="small" variant="outlined" /> : '-';

      case 'tags':
        return task.tags.length > 0 ? (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {task.tags.slice(0, 2).map((tag) => (
              <Chip key={tag} label={tag} size="small" />
            ))}
            {task.tags.length > 2 && (
              <Chip label={`+${task.tags.length - 2}`} size="small" variant="outlined" />
            )}
          </Box>
        ) : (
          '-'
        );

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

      case 'status':
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

      case 'actions':
        return (
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title={task.is_complete ? 'Mark Incomplete' : 'Mark Complete'}>
              <IconButton
                size="small"
                onClick={() => {
                  if (task.is_complete) {
                    uncompleteTask(task.id);
                  } else {
                    completeTask(task.id);
                  }
                  onComplete(task.id);
                }}
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

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
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
