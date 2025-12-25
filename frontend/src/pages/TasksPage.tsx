import { useState } from 'react';
import { Box, Title, Button, SegmentedControl, Group, VisuallyHidden } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconList, IconTable } from '@tabler/icons-react';
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

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({
      message,
      color,
      autoClose: 3000,
    });
  };

  const handleViewModeChange = (newMode: string) => {
    setViewMode(newMode as 'list' | 'table');
    localStorage.setItem('taskViewMode', newMode);
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
        showNotification('Task updated successfully', 'green');
      } else {
        // Create new task via API
        await createTask(taskData);
        showNotification('Task created successfully', 'green');
      }
      setFormOpen(false);
      setEditingTask(null);
    } catch {
      showNotification('Failed to save task', 'red');
    }
  };

  const handleComplete = async (taskId: string) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      if (task.is_complete) {
        await uncompleteTask(taskId);
        showNotification('Task marked as incomplete', 'green');
      } else {
        await completeTask(taskId);
        // Refresh user stats to update XP display
        await fetchStats();
        showNotification('Task completed! XP earned.', 'green');
      }
    } catch {
      showNotification('Failed to update task', 'red');
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
        showNotification('Task deleted', 'green');
      } catch {
        showNotification('Failed to delete task', 'red');
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
      showNotification('Failed to update subtask', 'red');
    }
  };

  const handleUndo = async (taskId: string) => {
    try {
      await undoTask(taskId);
      showNotification('Change undone', 'green');
    } catch {
      showNotification('Failed to undo change', 'red');
    }
  };

  return (
    <Box>
      {/* Header */}
      <Group justify="space-between" align="center" mb="lg">
        <Title order={2}>Tasks</Title>
        <Group gap="md">
          <SegmentedControl
            value={viewMode}
            onChange={handleViewModeChange}
            data={[
              { value: 'list', label: <><IconList size={16} aria-hidden="true" /><VisuallyHidden>List view</VisuallyHidden></> },
              { value: 'table', label: <><IconTable size={16} aria-hidden="true" /><VisuallyHidden>Table view</VisuallyHidden></> },
            ]}
            size="sm"
            aria-label="view mode"
          />
          <Button leftSection={<IconPlus size={16} />} onClick={handleCreateNew} disabled={isLoading}>
            New Task
          </Button>
        </Group>
      </Group>

      {/* Quick-add box for rapid task creation */}
      <QuickAddBox />

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
    </Box>
  );
}
/* v8 ignore stop */
