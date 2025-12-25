import { useState } from 'react';
import { Box, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
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

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({
      message,
      color,
      autoClose: 3000,
    });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSave = (taskData: Partial<Task>) => {
    if (editingTask) {
      updateTask(editingTask.id, taskData);
      showNotification('Task updated successfully', 'green');
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
      showNotification('Task created successfully', 'green');
    }
    setFormOpen(false);
    setEditingTask(null);
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    showNotification(updates.is_complete ? 'Task completed!' : 'Task updated', 'green');
  };

  return (
    <Box>
      <Title order={2} mb="md">
        Kanban Board
      </Title>

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
      />
    </Box>
  );
}
/* v8 ignore stop */
