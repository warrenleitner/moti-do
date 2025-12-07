import { useState } from 'react';
import { Box, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import { TaskList, TaskForm } from '../components/tasks';
import { ConfirmDialog } from '../components/common';
import { useTaskStore } from '../store';
import type { Task } from '../types';

export default function TasksPage() {
  const { updateTask, removeTask, addTask } = useTaskStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCreateNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSave = (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      updateTask(editingTask.id, taskData);
      setSnackbar({ open: true, message: 'Task updated successfully', severity: 'success' });
    } else {
      // Create new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskData.title || 'Untitled',
        creation_date: new Date().toISOString(),
        priority: taskData.priority || 'medium',
        difficulty: taskData.difficulty || 'medium',
        duration: taskData.duration || 'medium',
        is_complete: false,
        is_habit: taskData.is_habit || false,
        tags: taskData.tags || [],
        subtasks: taskData.subtasks || [],
        dependencies: [],
        streak_current: 0,
        streak_best: 0,
        history: [],
        ...taskData,
      };
      addTask(newTask);
      setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
    }
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleComplete = (taskId: string) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      updateTask(taskId, {
        is_complete: !task.is_complete,
        completion_date: !task.is_complete ? new Date().toISOString() : undefined,
      });
      setSnackbar({
        open: true,
        message: task.is_complete ? 'Task marked as incomplete' : 'Task completed!',
        severity: 'success',
      });
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (taskToDelete) {
      removeTask(taskToDelete);
      setSnackbar({ open: true, message: 'Task deleted', severity: 'success' });
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleSubtaskToggle = (taskId: string, subtaskIndex: number) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      const updatedSubtasks = [...task.subtasks];
      updatedSubtasks[subtaskIndex] = {
        ...updatedSubtasks[subtaskIndex],
        complete: !updatedSubtasks[subtaskIndex].complete,
      };
      updateTask(taskId, { subtasks: updatedSubtasks });
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Tasks</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew}>
          New Task
        </Button>
      </Box>

      {/* Task list */}
      <TaskList
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onComplete={handleComplete}
        onSubtaskToggle={handleSubtaskToggle}
        onCreateNew={handleCreateNew}
      />

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
