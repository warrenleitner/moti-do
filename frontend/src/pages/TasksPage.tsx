import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Snackbar, Alert, ToggleButtonGroup, ToggleButton, Link as MuiLink, Typography, Chip } from '@mui/material';
import {
  Add,
  ViewList,
  TableChart,
  CalendarMonth as CalendarIcon,
  FilterList,
  FilterListOff,
} from '@mui/icons-material';
import { AxiosError } from 'axios';
import { TaskList, TaskForm } from '../components/tasks';
import TaskTable from '../components/tasks/TaskTable';
import QuickAddBox from '../components/tasks/QuickAddBox';
import { ConfirmDialog, FilterBar } from '../components/common';
import { useTaskStore } from '../store';
import { useFilteredTasks } from '../store/taskStore';
import { useUserStore, useSystemStatus, useDefinedProjects } from '../store/userStore';
import type { Task } from '../types';
import { getCombinedTags } from '../utils/tags';

// UI orchestration component - tested via integration tests
/* v8 ignore start */

/**
 * Extract a user-friendly error message from an API error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    // Try to get detail from API response (FastAPI format)
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    // Fall back to HTTP status text
    if (error.response?.statusText) {
      return `${error.response.statusText} (${error.response.status})`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

const DEFAULT_VISIBLE_COUNT = 50;
const LOAD_MORE_STEP = 50;
export default function TasksPage() {
  // Use API actions from the store
  const {
    createTask,
    saveTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    undoTask,
    duplicateTask,
    isLoading,
    tasks: allTasks,
    filters,
    setFilters,
    resetFilters,
    fetchTasks,
    hasCompletedData,
  } = useTaskStore();
  const { fetchStats } = useUserStore();
  const systemStatus = useSystemStatus();
  const filteredTasks = useFilteredTasks(systemStatus?.last_processed_date);
  const definedProjects = useDefinedProjects();

  // Get projects from defined projects, and tags from tasks
  const projects = definedProjects.map((p) => p.name);
  const tags = [...new Set(allTasks.flatMap((t) => getCombinedTags(t).map((tag) => tag.toLowerCase())))];

  const [viewMode, setViewMode] = useState<'list' | 'table'>(() => {
    const saved = localStorage.getItem('taskViewMode');
    return (saved as 'list' | 'table') || 'list';
  });
  const [visibleRowCount, setVisibleRowCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [filtersVisible, setFiltersVisible] = useState(() => {
    const saved = localStorage.getItem('taskFiltersVisible');
    return saved === null ? true : saved === 'true';
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
    nextInstanceId?: string;
    nextDueDate?: string;
  }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);
  const [tasksToComplete, setTasksToComplete] = useState<string[]>([]);
  const [bulkDuplicateDialogOpen, setBulkDuplicateDialogOpen] = useState(false);
  const [tasksToDuplicate, setTasksToDuplicate] = useState<string[]>([]);
  const visibleTasks = useMemo(
    () => filteredTasks.slice(0, Math.min(filteredTasks.length, visibleRowCount)),
    [filteredTasks, visibleRowCount]
  );
  const hasMoreTasks = visibleTasks.length < filteredTasks.length;
  const visibleTaskIds = useMemo(() => visibleTasks.map((task) => task.id), [visibleTasks]);
  const visibleTaskIdSet = useMemo(() => new Set(visibleTaskIds), [visibleTaskIds]);
  const visibleSelectedTasks = useMemo(
    () => selectedTasks.filter((id) => visibleTaskIdSet.has(id)),
    [selectedTasks, visibleTaskIdSet]
  );

  useEffect(() => {
    if ((filters.status === 'completed' || filters.status === 'all') && !hasCompletedData) {
      fetchTasks({ includeCompleted: true }).catch(() => {
        // Errors surface via store error state/snackbar elsewhere
      });
    }
  }, [fetchTasks, filters.status, hasCompletedData]);

  // Update visible row count when filtered tasks change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleRowCount((prev) => (filteredTasks.length > prev ? filteredTasks.length : prev));
    // Intentionally updating state in effect based on external data
  }, [filteredTasks.length]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'list' | 'table' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      localStorage.setItem('taskViewMode', newMode);
    }
  };

  const handleToggleFilters = () => {
    setFiltersVisible((prev) => {
      const next = !prev;
      localStorage.setItem('taskFiltersVisible', String(next));
      return next;
    });
  };

  const handleLoadMore = () => {
    setVisibleRowCount((prev) => Math.min(prev + LOAD_MORE_STEP, filteredTasks.length));
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSave = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Update existing task via API
        await saveTask(editingTask.id, taskData);
        setSnackbar({ open: true, message: 'Task updated successfully', severity: 'success' });
      } else {
        // Create new task via API
        await createTask(taskData);
        setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
      }
      setFormOpen(false);
      setEditingTask(null);
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to save task'), severity: 'error' });
    }
  };

  const handleInlineEdit = async (taskId: string, updates: Partial<Task>) => {
    try {
      await saveTask(taskId, updates);
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to update task'), severity: 'error' });
      throw error; // Re-throw to let EditableCell handle rollback
    }
  };

  const handleComplete = async (taskId: string) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      if (task.is_complete) {
        await uncompleteTask(taskId);
        setSnackbar({ open: true, message: 'Task marked as incomplete', severity: 'success' });
      } else {
        const response = await completeTask(taskId);
        // Refresh user stats to update XP display
        await fetchStats();

        // Show next instance info for recurring tasks
        if (response.next_instance && response.next_instance.due_date) {
          setSnackbar({
            open: true,
            message: 'Task completed! XP earned.',
            severity: 'success',
            nextInstanceId: response.next_instance.id,
            nextDueDate: response.next_instance.due_date,
          });
        } else {
          setSnackbar({ open: true, message: 'Task completed! XP earned.', severity: 'success' });
        }
      }
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to update task'), severity: 'error' });
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete);
        setSnackbar({ open: true, message: 'Task deleted', severity: 'success' });
      } catch (error) {
        setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to delete task'), severity: 'error' });
      }
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleSubtaskToggle = async (taskId: string, subtaskIndex: number) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      complete: !updatedSubtasks[subtaskIndex].complete,
    };

    try {
      await saveTask(taskId, { subtasks: updatedSubtasks });
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to update subtask'), severity: 'error' });
    }
  };

  const handleUndo = async (taskId: string) => {
    try {
      await undoTask(taskId);
      setSnackbar({ open: true, message: 'Change undone', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to undo change'), severity: 'error' });
    }
  };

  const handleDuplicate = async (taskId: string) => {
    try {
      await duplicateTask(taskId);
      setSnackbar({ open: true, message: 'Task duplicated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: getErrorMessage(error, 'Failed to duplicate task'), severity: 'error' });
    }
  };

  const handleOpenNextInstance = () => {
    if (snackbar.nextInstanceId) {
      const { tasks } = useTaskStore.getState();
      const nextTask = tasks.find((t) => t.id === snackbar.nextInstanceId);
      if (nextTask) {
        setEditingTask(nextTask);
        setFormOpen(true);
        setSnackbar((prev) => ({ ...prev, open: false }));
      }
    }
  };

  const formatNextDueDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Selection handlers for bulk actions
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) => {
      const visibleSelection = prev.filter((id) => visibleTaskIdSet.has(id));
      return visibleSelection.includes(taskId)
        ? visibleSelection.filter((id) => id !== taskId)
        : [...visibleSelection, taskId];
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? visibleTaskIds : []);
  };

  // Bulk action handlers
  const handleBulkComplete = (taskIds: string[]) => {
    setTasksToComplete(taskIds);
    setBulkCompleteDialogOpen(true);
  };

  const handleBulkCompleteConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToComplete) {
      const task = filteredTasks.find((t) => t.id === taskId);
      if (task && !task.is_complete) {
        try {
          await completeTask(taskId);
          successCount++;
        } catch {
          // Continue with other tasks even if one fails
        }
      }
    }
    if (successCount > 0) {
      await fetchStats();
      setSnackbar({
        open: true,
        message: `Completed ${successCount} task${successCount > 1 ? 's' : ''}!`,
        severity: 'success',
      });
    }
    setSelectedTasks([]);
    setBulkCompleteDialogOpen(false);
    setTasksToComplete([]);
  };

  const handleBulkDeleteClick = (taskIds: string[]) => {
    setTasksToDelete(taskIds);
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToDelete) {
      try {
        await deleteTask(taskId);
        successCount++;
      } catch {
        // Continue with other tasks even if one fails
      }
    }
    if (successCount > 0) {
      setSnackbar({
        open: true,
        message: `Deleted ${successCount} task${successCount > 1 ? 's' : ''}`,
        severity: 'success',
      });
    }
    setSelectedTasks([]);
    setBulkDeleteDialogOpen(false);
    setTasksToDelete([]);
  };

  const handleBulkDuplicateClick = (taskIds: string[]) => {
    setTasksToDuplicate(taskIds);
    setBulkDuplicateDialogOpen(true);
  };

  const handleBulkDuplicateConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToDuplicate) {
      try {
        await duplicateTask(taskId);
        successCount++;
      } catch {
        // Continue with other tasks even if one fails
      }
    }
    if (successCount > 0) {
      setSnackbar({
        open: true,
        message: `Duplicated ${successCount} task${successCount > 1 ? 's' : ''}`,
        severity: 'success',
      });
    }
    setSelectedTasks([]);
    setBulkDuplicateDialogOpen(false);
    setTasksToDuplicate([]);
  };

  // Calculate current processing date (last_processed_date + 1 day)
  const currentProcessingDate = systemStatus?.last_processed_date
    ? (() => {
        // Parse as local date to avoid timezone issues
        const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
        const nextDay = new Date(year, month - 1, day + 1);
        return nextDay.toLocaleDateString();
      })()
    : null;

  return (
    <Box>
      {/* Processing date indicator */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <CalendarIcon fontSize="small" color="primary" />
        <Typography variant="body2" color="text.secondary">
          Processing:
        </Typography>
        <Chip
          label={currentProcessingDate || 'Not started'}
          size="small"
          color="primary"
          variant="outlined"
        />
        {systemStatus && systemStatus.pending_days > 0 && (
          <Chip
            label={`${systemStatus.pending_days} day${systemStatus.pending_days > 1 ? 's' : ''} behind`}
            size="small"
            color="error"
            variant="filled"
          />
        )}
      </Box>

      {/* Header actions with quick-add on the same line */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
        {/* Quick-add box takes available space */}
        <Box sx={{ flex: 1 }}>
          <QuickAddBox />
        </Box>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={handleViewModeChange}
          size="small"
          aria-label="view mode"
        >
          <ToggleButton value="list" aria-label="list view">
            <ViewList />
          </ToggleButton>
          <ToggleButton value="table" aria-label="table view">
            <TableChart />
          </ToggleButton>
        </ToggleButtonGroup>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateNew}
          disabled={isLoading}
          data-testid="add-task-fab"
        >
          New Task
        </Button>
      </Box>

      {/* Task list or table based on view mode */}
      {viewMode === 'list' ? (
        <TaskList
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicate}
          onComplete={handleComplete}
          onSubtaskToggle={handleSubtaskToggle}
          onUndo={handleUndo}
          onCreateNew={handleCreateNew}
        />
      ) : (
        <>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: filtersVisible ? 0 : 2 }}>
            <Button
              variant="text"
              size="small"
              startIcon={filtersVisible ? <FilterListOff /> : <FilterList />}
              onClick={handleToggleFilters}
            >
              {filtersVisible ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </Box>
          {filtersVisible && (
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
          )}
          <TaskTable
            tasks={visibleTasks}
            allTasks={allTasks}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onComplete={handleComplete}
            onInlineEdit={handleInlineEdit}
            selectedTasks={visibleSelectedTasks}
            onSelectTask={handleSelectTask}
            onSelectAll={handleSelectAll}
            onBulkComplete={handleBulkComplete}
            onBulkDelete={handleBulkDeleteClick}
            onDuplicate={handleDuplicate}
            onBulkDuplicate={handleBulkDuplicateClick}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Showing {visibleTasks.length} of {filteredTasks.length} tasks
            </Typography>
            <Button variant="outlined" size="small" onClick={handleLoadMore} disabled={!hasMoreTasks}>
              Load more
            </Button>
          </Box>
        </>
      )}

      {/* Task form dialog */}
      <TaskForm
        key={editingTask?.id ?? 'new'}
        open={formOpen}
        task={editingTask}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        allTasks={allTasks}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setTaskToDelete(null);
        }}
      />

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        title="Delete Selected Tasks"
        message={`Are you sure you want to delete ${tasksToDelete.length} task${tasksToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmColor="error"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => {
          setBulkDeleteDialogOpen(false);
          setTasksToDelete([]);
        }}
      />

      {/* Bulk complete confirmation dialog */}
      <ConfirmDialog
        open={bulkCompleteDialogOpen}
        title="Complete Selected Tasks"
        message={`Are you sure you want to complete ${tasksToComplete.length} task${tasksToComplete.length > 1 ? 's' : ''}?`}
        confirmLabel="Complete All"
        confirmColor="primary"
        onConfirm={handleBulkCompleteConfirm}
        onCancel={() => {
          setBulkCompleteDialogOpen(false);
          setTasksToComplete([]);
        }}
      />

      {/* Bulk duplicate confirmation dialog */}
      <ConfirmDialog
        open={bulkDuplicateDialogOpen}
        title="Duplicate Selected Tasks"
        message={`Are you sure you want to duplicate ${tasksToDuplicate.length} task${tasksToDuplicate.length > 1 ? 's' : ''}?`}
        confirmLabel="Duplicate All"
        confirmColor="primary"
        onConfirm={handleBulkDuplicateConfirm}
        onCancel={() => {
          setBulkDuplicateDialogOpen(false);
          setTasksToDuplicate([]);
        }}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.nextDueDate ? 6000 : 3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
          {snackbar.nextDueDate && (
            <>
              {' Next due: '}
              <MuiLink
                component="button"
                variant="body2"
                onClick={handleOpenNextInstance}
                sx={{ verticalAlign: 'baseline', fontWeight: 'bold' }}
              >
                {formatNextDueDate(snackbar.nextDueDate)}
              </MuiLink>
            </>
          )}
        </Alert>
      </Snackbar>
    </Box>
  );
}
/* v8 ignore stop */
