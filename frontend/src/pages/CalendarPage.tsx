import { useState } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import { TaskCalendar } from '../components/calendar';
import { TaskForm } from '../components/tasks';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function CalendarPage() {
  const { tasks, updateTask, addTask, saveTask } = useTaskStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleCreateTask = (date: Date) => {
    setEditingTask(null);
    setNewTaskDate(date);
    setFormOpen(true);
  };

  const handleSelectTask = (task: Task) => {
    // Open the task in the edit form
    setEditingTask(task);
    setNewTaskDate(null);
    setFormOpen(true);
  };

  const handleSave = async (taskData: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      try {
        await saveTask(editingTask.id, taskData);
        setSnackbar({ open: true, message: 'Task updated successfully', severity: 'success' });
      } catch {
        setSnackbar({ open: true, message: 'Failed to update task', severity: 'error' });
      }
    } else {
      // Create new task
      const newTask: Task = {
        id: crypto.randomUUID(),
        title: taskData.title || 'Untitled',
        creation_date: new Date().toISOString(),
        priority: taskData.priority || Priority.MEDIUM,
        difficulty: taskData.difficulty || Difficulty.MEDIUM,
        duration: taskData.duration || Duration.SHORT,
        is_complete: false,
        is_habit: false,
        tags: taskData.tags || [],
        subtasks: [],
        dependencies: [],
        streak_current: 0,
        streak_best: 0,
        history: [],
        due_date: newTaskDate?.toISOString(),
        score: 0,
        ...taskData,
      };
      addTask(newTask);
      setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
    }
    setFormOpen(false);
    setEditingTask(null);
    setNewTaskDate(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setSnackbar({
      open: true,
      message: updates.is_complete ? 'Task completed!' : 'Task updated',
      severity: 'success',
    });
  };

  // Create a default task with the selected date pre-filled (for new tasks only)
  const defaultTask: Task | null = editingTask || (newTaskDate ? {
    id: '',
    title: '',
    creation_date: new Date().toISOString(),
    priority: Priority.MEDIUM,
    difficulty: Difficulty.MEDIUM,
    duration: Duration.SHORT,
    is_complete: false,
    is_habit: false,
    tags: [],
    subtasks: [],
    dependencies: [],
    streak_current: 0,
    streak_best: 0,
    history: [],
    due_date: newTaskDate.toISOString(),
    score: 0,
  } : null);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        View and manage tasks by their due dates. Click on a task to edit it, or click on a date to create a new task. Drag tasks to reschedule.
      </Typography>

      <TaskCalendar
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onSelectTask={handleSelectTask}
        onCreateTask={handleCreateTask}
      />

      {/* Task form dialog for creating/editing tasks */}
      <TaskForm
        key={editingTask?.id ?? 'new'}
        open={formOpen}
        task={defaultTask}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
          setNewTaskDate(null);
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
