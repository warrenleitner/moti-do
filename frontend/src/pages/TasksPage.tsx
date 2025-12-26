import { useState } from 'react';
import { Box, Button, Snackbar, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Add, ViewList, TableChart } from '@mui/icons-material';
import { AxiosError } from 'axios';
import { TaskList, TaskForm } from '../components/tasks';
import TaskTable from '../components/tasks/TaskTable';
import QuickAddBox from '../components/tasks/QuickAddBox';
import { ConfirmDialog } from '../components/common';
import { useTaskStore } from '../store';
import { useFilteredTasks } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import type { Task } from '../types';

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
export default function TasksPage() {
  // Use API actions from the store
  const { createTask, saveTask, deleteTask, completeTask, uncompleteTask, undoTask, isLoading } = useTaskStore();
  const { fetchStats } = useUserStore();
  const filteredTasks = useFilteredTasks();

  const [viewMode, setViewMode] = useState<'list' | 'table'>(() => {
    const saved = localStorage.getItem('taskViewMode');
    return (saved as 'list' | 'table') || 'list';
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);

  const handleViewModeChange = (_: React.MouseEvent<HTMLElement>, newMode: 'list' | 'table' | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
      localStorage.setItem('taskViewMode', newMode);
    }
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

  const handleComplete = async (taskId: string) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      if (task.is_complete) {
        await uncompleteTask(taskId);
        setSnackbar({ open: true, message: 'Task marked as incomplete', severity: 'success' });
      } else {
        await completeTask(taskId);
        // Refresh user stats to update XP display
        await fetchStats();
        setSnackbar({ open: true, message: 'Task completed! XP earned.', severity: 'success' });
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

  // Selection handlers for bulk actions
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? filteredTasks.map((t) => t.id) : []);
  };

  // Bulk action handlers
  const handleBulkComplete = async (taskIds: string[]) => {
    let successCount = 0;
    for (const taskId of taskIds) {
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

  return (
    <Box>
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
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew} disabled={isLoading}>
          New Task
        </Button>
      </Box>

      {/* Task list or table based on view mode */}
      {viewMode === 'list' ? (
        <TaskList
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onComplete={handleComplete}
          onSubtaskToggle={handleSubtaskToggle}
          onUndo={handleUndo}
          onCreateNew={handleCreateNew}
        />
      ) : (
        <TaskTable
          tasks={filteredTasks}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onComplete={handleComplete}
          selectedTasks={selectedTasks}
          onSelectTask={handleSelectTask}
          onSelectAll={handleSelectAll}
          onBulkComplete={handleBulkComplete}
          onBulkDelete={handleBulkDeleteClick}
        />
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

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
/* v8 ignore stop */
