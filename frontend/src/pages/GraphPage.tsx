import { useEffect, useState } from 'react';
import { Box, Text, Group, notifications } from '../ui';
import { GlowCard, DataBadge, ArcadeButton } from '../components/ui';
import { IconX } from '../ui/icons';
import { DependencyGraph } from '../components/graph';
import { useTaskStore } from '../store';
import type { Task } from '../types';

// UI component - tested via integration tests
/* v8 ignore start */
export default function GraphPage() {
  const { tasks, updateTask, fetchTasks, hasCompletedData } = useTaskStore();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({ message, color, autoClose: 3000 });
  };

  useEffect(() => {
    if (!hasCompletedData) {
      fetchTasks({ includeCompleted: true }).catch(() => {});
    }
  }, [fetchTasks, hasCompletedData]);

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setInspectorOpen(true);
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
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          className="font-display"
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#e6e7f5',
            margin: 0,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          DEPENDENCY_MATRIX
        </h1>
        <p className="micro-meta" style={{ margin: '0.25rem 0 0' }}>
          Visualize task dependencies · Click node to inspect · Drag to pan · Scroll to zoom
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', height: 'calc(100vh - 200px)' }}>
        {/* Graph area */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <DependencyGraph
            tasks={tasks}
            onSelectTask={handleSelectTask}
          />
        </div>

        {/* Inspector sidebar — desktop */}
        {inspectorOpen && selectedTask && (
          <div
            className="ghost-border"
            style={{
              width: 280,
              flexShrink: 0,
              backgroundColor: '#10131C',
              boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.5)',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Inspector header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(69, 71, 82, 0.15)',
                backgroundColor: '#181B25',
              }}
            >
              <span className="micro-meta">NODE_INSPECTOR</span>
              <button
                onClick={() => setInspectorOpen(false)}
                aria-label="Close inspector"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#a8aab7',
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Inspector body */}
            <div style={{ padding: '1rem', flex: 1, overflow: 'auto' }}>
              {/* Title */}
              <Text
                className="font-display"
                fw={600}
                size="sm"
                style={{
                  color: '#e6e7f5',
                  textDecoration: selectedTask.is_complete ? 'line-through' : undefined,
                  opacity: selectedTask.is_complete ? 0.6 : 1,
                }}
                mb="sm"
              >
                {selectedTask.icon && <span style={{ marginRight: 4 }}>{selectedTask.icon}</span>}
                {selectedTask.title}
              </Text>

              {/* Status & priority */}
              <Group gap={6} mb="md" wrap="wrap">
                <DataBadge
                  value={selectedTask.is_complete ? 'COMPLETE' : (selectedTask.status || 'TODO').toUpperCase()}
                  color={selectedTask.is_complete ? 'muted' : 'cyan'}
                />
                <DataBadge
                  value={selectedTask.priority}
                  color={
                    selectedTask.priority === 'Defcon One' ? 'magenta' :
                    selectedTask.priority === 'High' ? 'amber' :
                    selectedTask.priority === 'Medium' ? 'cyan' : 'muted'
                  }
                />
              </Group>

              {/* XP */}
              {selectedTask.score > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="micro-meta" style={{ display: 'block', marginBottom: 4 }}>XP_VALUE</span>
                  <DataBadge value={`${selectedTask.score} XP`} color="amber" size="md" />
                </div>
              )}

              {/* Dependencies */}
              {selectedTask.dependencies && selectedTask.dependencies.length > 0 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="micro-meta" style={{ display: 'block', marginBottom: 6 }}>
                    DEPENDS_ON ({selectedTask.dependencies.length})
                  </span>
                  {selectedTask.dependencies.map((depId) => {
                    const depTask = tasks.find((t) => t.id === depId);
                    return depTask ? (
                      <GlowCard key={depId} style={{ padding: '0.5rem', marginBottom: '0.25rem' }}>
                        <Text size="xs" className="font-display" style={{ color: '#e6e7f5' }}>
                          {depTask.icon && <span style={{ marginRight: 4 }}>{depTask.icon}</span>}
                          {depTask.title}
                        </Text>
                      </GlowCard>
                    ) : null;
                  })}
                </div>
              )}

              {/* Blocking */}
              {(() => {
                const dependents = tasks.filter((t) => t.dependencies?.includes(selectedTask.id));
                if (dependents.length === 0) return null;
                return (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <span className="micro-meta" style={{ display: 'block', marginBottom: 6 }}>
                      BLOCKING ({dependents.length})
                    </span>
                    {dependents.map((depTask) => (
                      <GlowCard key={depTask.id} style={{ padding: '0.5rem', marginBottom: '0.25rem' }}>
                        <Text size="xs" className="font-display" style={{ color: '#e6e7f5' }}>
                          {depTask.icon && <span style={{ marginRight: 4 }}>{depTask.icon}</span>}
                          {depTask.title}
                        </Text>
                      </GlowCard>
                    ))}
                  </div>
                );
              })()}

              {/* Complete toggle */}
              <div style={{ marginTop: '1rem' }}>
                <ArcadeButton
                  variant={selectedTask.is_complete ? 'ghost' : 'primary'}
                  size="xs"
                  fullWidth
                  onClick={() => handleComplete(selectedTask.id)}
                >
                  {selectedTask.is_complete ? 'REOPEN' : 'COMPLETE'}
                </ArcadeButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </Box>
  );
}
/* v8 ignore stop */
