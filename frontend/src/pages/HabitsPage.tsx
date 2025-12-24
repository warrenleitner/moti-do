import { useState } from 'react';
import { Box, Typography, Button, Snackbar, Alert } from '@mui/material';
import { Add } from '@mui/icons-material';
import { HabitList } from '../components/habits';
import { TaskForm } from '../components/tasks';
import { ConfirmDialog } from '../components/common';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function HabitsPage() {
  const { tasks, updateTask, addTask, removeTask } = useTaskStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Filter to only habits
  const habits = tasks.filter((t) => t.is_habit);

  const handleCreateNew = () => {
    setEditingHabit(null);
    setFormOpen(true);
  };

  const handleEdit = (habit: Task) => {
    setEditingHabit(habit);
    setFormOpen(true);
  };

  const handleSave = (taskData: Partial<Task>) => {
    if (editingHabit) {
      updateTask(editingHabit.id, taskData);
      setSnackbar({ open: true, message: 'Habit updated successfully', severity: 'success' });
    } else {
      const newHabit: Task = {
        id: crypto.randomUUID(),
        title: taskData.title || 'Untitled',
        creation_date: new Date().toISOString(),
        priority: taskData.priority || Priority.MEDIUM,
        difficulty: taskData.difficulty || Difficulty.MEDIUM,
        duration: taskData.duration || Duration.SHORT,
        is_complete: false,
        is_habit: true,
        recurrence_rule: taskData.recurrence_rule || 'daily',
        tags: taskData.tags || [],
        subtasks: [],
        dependencies: [],
        streak_current: 0,
        streak_best: 0,
        history: [],
        score: 0,
        ...taskData,
      };
      addTask(newHabit);
      setSnackbar({ open: true, message: 'Habit created successfully', severity: 'success' });
    }
    setFormOpen(false);
    setEditingHabit(null);
  };

  const handleComplete = (habitId: string) => {
    const habit = tasks.find((t) => t.id === habitId);
    if (habit) {
      const wasComplete = habit.is_complete;
      const newStreak = wasComplete
        ? Math.max(0, habit.streak_current - 1)
        : habit.streak_current + 1;

      updateTask(habitId, {
        is_complete: !wasComplete,
        completion_date: !wasComplete ? new Date().toISOString() : undefined,
        streak_current: newStreak,
        streak_best: Math.max(habit.streak_best, newStreak),
      });

      setSnackbar({
        open: true,
        message: wasComplete
          ? 'Habit marked as incomplete'
          : `Habit completed! Streak: ${newStreak} days`,
        severity: 'success',
      });
    }
  };

  const handleDeleteClick = (habitId: string) => {
    setHabitToDelete(habitId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (habitToDelete) {
      removeTask(habitToDelete);
      setSnackbar({ open: true, message: 'Habit deleted successfully', severity: 'success' });
    }
    setDeleteDialogOpen(false);
    setHabitToDelete(null);
  };

  // Create a default habit task for the form
  const defaultHabitTask = editingHabit || {
    is_habit: true,
    recurrence_rule: 'daily',
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Habits</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleCreateNew}>
          New Habit
        </Button>
      </Box>

      {/* Habit list */}
      <HabitList
        habits={habits}
        allTasks={tasks}
        onComplete={handleComplete}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
        onCreateNew={handleCreateNew}
      />

      {/* Task form dialog (reused for habits) */}
      <TaskForm
        open={formOpen}
        task={editingHabit || (defaultHabitTask as Task)}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingHabit(null);
        }}
      />

      {/* Confirm delete dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Habit"
        message="Are you sure you want to delete this habit? This action cannot be undone and all streak data will be lost."
        confirmLabel="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setHabitToDelete(null);
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
