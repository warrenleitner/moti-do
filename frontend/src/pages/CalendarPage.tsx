import { useState, useEffect } from 'react';
import { Box, Text, notifications } from '../ui';
import { TaskCalendar } from '../components/calendar';
import { TaskForm } from '../components/tasks';
import { useTaskStore, useVisibleTasks } from '../store';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function CalendarPage() {
  const { tasks, updateTask, addTask, saveTask, fetchTasks, hasCompletedData } = useTaskStore();
  const visibleTasks = useVisibleTasks(tasks);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({ message, color, autoClose: 3000 });
  };

  // Fetch tasks on mount (including completed for full calendar view)
  useEffect(() => {
    if (!hasCompletedData) {
      fetchTasks({ includeCompleted: true }).catch(() => {});
    }
  }, [fetchTasks, hasCompletedData]);

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
        showNotification('Task updated successfully', 'green');
      } catch {
        showNotification('Failed to update task', 'red');
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
        penalty_score: 0,
        net_score: 0,
        current_count: 0,
        ...taskData,
      };
      addTask(newTask);
      showNotification('Task created successfully', 'green');
    }
    setFormOpen(false);
    setEditingTask(null);
    setNewTaskDate(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    showNotification(updates.is_complete ? 'Task completed!' : 'Task updated', 'green');
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
    penalty_score: 0,
    net_score: 0,
    current_count: 0,
  } : null);

  return (
    <Box>
      <Text size="sm" c="dimmed" mb="md">
        View and manage tasks by their due dates. Click on a task to edit it, or click on a date to create a new task. Drag tasks to reschedule.
      </Text>

      <TaskCalendar
        tasks={visibleTasks}
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
        allTasks={tasks}
      />
    </Box>
  );
}
/* v8 ignore stop */
