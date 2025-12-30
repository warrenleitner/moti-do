import { useState } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { KanbanBoard } from '../components/kanban';
import { TaskForm } from '../components/tasks';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function KanbanPage() {
  const { tasks, updateTask, addTask } = useTaskStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSave = (taskData: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
      setSnackbar({ open: true, message: 'Task updated successfully', severity: 'success' });
    } else {
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
        score: 0,
        ...taskData,
      };
      addTask(newTask);
      setSnackbar({ open: true, message: 'Task created successfully', severity: 'success' });
    }
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    setSnackbar({
      open: true,
      message: updates.is_complete ? 'Task completed!' : 'Task updated',
      severity: 'success',
    });
  };

  return (
    <Box>
      <KanbanBoard
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onEditTask={handleEditTask}
      />

      {/* Task form dialog */}
      <TaskForm
        open={formOpen}
        task={editingTask || ({} as Task)}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        allTasks={tasks}
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
