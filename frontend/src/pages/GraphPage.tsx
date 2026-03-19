import { useEffect, useState } from 'react';
import { Box, Text, Title, Drawer, Group, ActionIcon, Alert, notifications } from '../ui';
import { IconX } from '../ui/icons';
import { DependencyGraph } from '../components/graph';
import { TaskCard } from '../components/tasks';
import { useTaskStore } from '../store';
import type { Task } from '../types';

// UI component - tested via integration tests
/* v8 ignore start */
export default function GraphPage() {
  const { tasks, updateTask, fetchTasks, hasCompletedData } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; color: 'green' | 'red' } | null>(null);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({ message, color, autoClose: 3000 });
    setStatusMessage({ text: message, color });
  };

  useEffect(() => {
    if (!hasCompletedData) {
      fetchTasks({ includeCompleted: true }).catch(() => {});
    }
  }, [fetchTasks, hasCompletedData]);

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setDrawerOpen(true);
  };

  const handleComplete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
      updateTask(taskId, {
        is_complete: !task.is_complete,
        completion_date: !task.is_complete ? new Date().toISOString() : undefined,
      });
      showNotification(task.is_complete ? 'Task marked incomplete' : 'Task completed!', 'green');
    }
  };

  return (
    <Box>
      <Text size="sm" c="dimmed" mb="md">
        Visualize task dependencies. Click on a task to see details. Drag to pan, scroll to zoom.
      </Text>

      <DependencyGraph
        tasks={tasks}
        onSelectTask={handleSelectTask}
      />

      {/* Task details drawer */}
      <Drawer
        position="right"
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={400}
        withCloseButton={false}
        data-testid="task-drawer"
        title={
          <Group justify="space-between" w="100%">
            <Title order={4}>Task Details</Title>
            <ActionIcon variant="subtle" onClick={() => setDrawerOpen(false)} aria-label="Close drawer">
              <IconX size={16} data-testid="CloseIcon" />
            </ActionIcon>
          </Group>
        }
      >
        <Box p="md">
          {selectedTask && (
            <TaskCard
              task={selectedTask}
              onComplete={handleComplete}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}

          {selectedTask?.dependencies && selectedTask.dependencies.length > 0 && (
            <Box mt="lg">
              <Text size="sm" fw={600} mb="xs">
                Dependencies ({selectedTask.dependencies.length})
              </Text>
              {selectedTask.dependencies.map((depId) => {
                const depTask = tasks.find((t) => t.id === depId);
                return depTask ? (
                  <TaskCard
                    key={depId}
                    task={depTask}
                    onComplete={handleComplete}
                    onEdit={() => {}}
                    onDelete={() => {}}
                  />
                ) : null;
              })}
            </Box>
          )}

          {/* Tasks that depend on this one */}
          {selectedTask && (
            <Box mt="lg">
              {(() => {
                const dependents = tasks.filter((t) => t.dependencies?.includes(selectedTask.id));
                if (dependents.length === 0) return null;
                return (
                  <>
                    <Text size="sm" fw={600} mb="xs">
                      Blocking ({dependents.length})
                    </Text>
                    {dependents.map((depTask) => (
                      <TaskCard
                        key={depTask.id}
                        task={depTask}
                        onComplete={handleComplete}
                        onEdit={() => {}}
                        onDelete={() => {}}
                      />
                    ))}
                  </>
                );
              })()}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Status message for completed actions */}
      {statusMessage && (
        <Alert color={statusMessage.color} mt="md" withCloseButton onClose={() => setStatusMessage(null)}>
          {statusMessage.text}
        </Alert>
      )}
    </Box>
  );
}
/* v8 ignore stop */
