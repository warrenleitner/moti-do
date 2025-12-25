import { useState } from 'react';
import { Box, Typography, Snackbar, Alert, Drawer, IconButton } from '@mui/material';
import { Close } from '@mui/icons-material';
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
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

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
      setSnackbar({
        open: true,
        message: task.is_complete ? 'Task marked incomplete' : 'Task completed!',
        severity: 'success',
      });
    }
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Visualize task dependencies. Click on a task to see details. Drag to pan, scroll to zoom.
      </Typography>

      <DependencyGraph
        tasks={tasks}
        onSelectTask={handleSelectTask}
      />

      {/* Task details drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: 400, maxWidth: '100%' } }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Task Details</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          {selectedTask && (
            <TaskCard
              task={selectedTask}
              onComplete={handleComplete}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          )}

          {selectedTask?.dependencies && selectedTask.dependencies.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Dependencies ({selectedTask.dependencies.length})
              </Typography>
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
            <Box sx={{ mt: 3 }}>
              {(() => {
                const dependents = tasks.filter((t) => t.dependencies?.includes(selectedTask.id));
                if (dependents.length === 0) return null;
                return (
                  <>
                    <Typography variant="subtitle2" gutterBottom>
                      Blocking ({dependents.length})
                    </Typography>
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
