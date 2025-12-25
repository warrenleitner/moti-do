import { useState } from 'react';
import { Box, Title, Text, Drawer, Group } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { DependencyGraph } from '../components/graph';
import { TaskCard } from '../components/tasks';
import { useTaskStore } from '../store';
import type { Task } from '../types';

// UI component - tested via integration tests
/* v8 ignore start */
export default function GraphPage() {
  const { tasks, updateTask } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({
      message,
      color,
      autoClose: 3000,
    });
  };

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
      <Title order={2} mb="xs">
        Dependency Graph
      </Title>

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
        title={
          <Group justify="space-between" w="100%">
            <Title order={4}>Task Details</Title>
          </Group>
        }
        closeButtonProps={{ 'aria-label': 'Close drawer' }}
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
    </Box>
  );
}
/* v8 ignore stop */
