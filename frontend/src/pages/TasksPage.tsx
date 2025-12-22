import { useState } from 'react';
import { Box, Typography, Button, Snackbar, Alert, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Add, ViewList, TableChart } from '@mui/icons-material';
import { TaskList, TaskForm } from '../components/tasks';
import TaskTable from '../components/tasks/TaskTable';
import { ConfirmDialog } from '../components/common';
import { useTaskStore } from '../store';
import { useFilteredTasks } from '../store/taskStore';
import { useUserStore } from '../store/userStore';
import type { Task } from '../types';

export default function TasksPage() {
  // Use API actions from the store
  const { createTask, saveTask, deleteTask, completeTask, uncompleteTask, isLoading } = useTaskStore();
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
    } catch {
      setSnackbar({ open: true, message: 'Failed to save task', severity: 'error' });
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
    } catch {
      setSnackbar({ open: true, message: 'Failed to update task', severity: 'error' });
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
      } catch {
        setSnackbar({ open: true, message: 'Failed to delete task', severity: 'error' });
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
    } catch {
      setSnackbar({ open: true, message: 'Failed to update subtask', severity: 'error' });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tasks</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
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
      </Box>

      {/* Task list or table based on view mode */}
      {viewMode === 'list' ? (
        <TaskList
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onComplete={handleComplete}
          onSubtaskToggle={handleSubtaskToggle}
          onCreateNew={handleCreateNew}
        />
      ) : (
        <TaskTable
          tasks={filteredTasks}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onComplete={handleComplete}
        />
      )}

      {/* Task form dialog */}
      <TaskForm
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
