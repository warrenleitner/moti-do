import { useEffect, useState, useMemo } from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { KanbanBoard } from '../components/kanban';
import { TaskForm } from '../components/tasks';
import { useTaskStore } from '../store';
import { useUserStore, useSystemStatus } from '../store/userStore';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function KanbanPage() {
  const { tasks, updateTask, addTask, completeTask, uncompleteTask, fetchTasks, hasCompletedData } = useTaskStore();
  const { fetchStats } = useUserStore();
  const systemStatus = useSystemStatus();
  const [ready, setReady] = useState(hasCompletedData);

  useEffect(() => {
    if (!hasCompletedData) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchTasks({ includeCompleted: true })
        .catch(() => {})
        .finally(() => setReady(true));
    } else {
      setReady(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTasks, hasCompletedData]);

  // Filter out future tasks (start_date > current_processing_date)
  // Kanban shows all statuses (active/completed) in columns, so we don't use useFilteredTasks
  const lastProcessedDate = systemStatus?.last_processed_date;
  const kanbanTasks = useMemo(() => {
    if (!lastProcessedDate) return tasks;

    // Parse last_processed_date and add 1 day to get current processing date
    const [year, month, day] = lastProcessedDate.split('-').map(Number);
    const currentProcessingDate = new Date(year, month - 1, day + 1);

    return tasks.filter((task) => {
      // Skip future tasks
      if (task.start_date) {
        const startDateStr = task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date;
        const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
        const taskStartDate = new Date(sYear, sMonth - 1, sDay);
        if (taskStartDate > currentProcessingDate) return false;
      }
      return true;
    });
  }, [tasks, lastProcessedDate]);
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
        penalty_score: 0,
        net_score: 0,
        current_count: 0,
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

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await completeTask(taskId);
      await fetchStats();

      if (response.next_instance) {
        setSnackbar({
          open: true,
          message: `Task completed! +${response.xp_earned} XP. Next instance created.`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: `Task completed! +${response.xp_earned} XP`,
          severity: 'success',
        });
      }
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to complete task',
        severity: 'error',
      });
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    try {
      await uncompleteTask(taskId);
      setSnackbar({
        open: true,
        message: 'Task marked as incomplete',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to uncomplete task',
        severity: 'error',
      });
    }
  };

  return (
    <Box>
      {!ready ? null : (
      <KanbanBoard
        tasks={kanbanTasks}
        onUpdateTask={handleUpdateTask}
        onEditTask={handleEditTask}
        onCompleteTask={handleCompleteTask}
        onUncompleteTask={handleUncompleteTask}
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
