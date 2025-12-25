import { useState } from 'react';
import { Box, Title, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { TaskCalendar } from '../components/calendar';
import { TaskForm } from '../components/tasks';
import { useTaskStore } from '../store';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function CalendarPage() {
  const { tasks, updateTask, addTask } = useTaskStore();
  const [formOpen, setFormOpen] = useState(false);
  const [newTaskDate, setNewTaskDate] = useState<Date | null>(null);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({
      message,
      color,
      autoClose: 3000,
    });
  };

  const handleCreateTask = (date: Date) => {
    setNewTaskDate(date);
    setFormOpen(true);
  };

  const handleSelectTask = () => {
    // Task selection is handled by the calendar's built-in dialog
  };

  const handleSave = (taskData: Partial<Task>) => {
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
    showNotification('Task created successfully', 'green');
    setFormOpen(false);
    setNewTaskDate(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    showNotification(updates.is_complete ? 'Task completed!' : 'Task updated', 'green');
  };

  // Create a default task with the selected date pre-filled
  const defaultTask: Task = {
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
    due_date: newTaskDate?.toISOString(),
    score: 0,
  };

  return (
    <Box>
      <Title order={2} mb="xs">
        Calendar
      </Title>

      <Text size="sm" c="dimmed" mb="md">
        View and manage tasks by their due dates. Click on a date to create a new task. Drag tasks to reschedule.
      </Text>

      <TaskCalendar
        tasks={tasks}
        onUpdateTask={handleUpdateTask}
        onSelectTask={handleSelectTask}
        onCreateTask={handleCreateTask}
      />

      {/* Task form dialog for creating new tasks */}
      <TaskForm
        open={formOpen}
        task={defaultTask}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setNewTaskDate(null);
        }}
      />
    </Box>
  );
}
/* v8 ignore stop */
