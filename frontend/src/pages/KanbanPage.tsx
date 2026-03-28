import { useEffect, useState, useMemo } from 'react';
import { Box, Group, Text, notifications } from '../ui';
import { IconPlus, IconAlertTriangle } from '../ui/icons';
import { KanbanBoard } from '../components/kanban';
import { TaskForm } from '../components/tasks';
import { useTaskStore, useVisibleTasks } from '../store';
import { useUserStore, useSystemStatus } from '../store/userStore';
import { DataBadge, ArcadeButton } from '../components/ui';
import type { Task } from '../types';
import { Priority, Difficulty, Duration } from '../types';

// UI orchestration component - tested via integration tests
/* v8 ignore start */
export default function KanbanPage() {
  const {
    tasks,
    updateTask,
    addTask,
    completeTask,
    uncompleteTask,
    fetchTasks,
    hasCompletedData,
    crisisModeActive,
    crisisTaskIds,
    exitCrisisMode,
  } = useTaskStore();
  const visibleTasks = useVisibleTasks(tasks);
  const { fetchStats } = useUserStore();
  const systemStatus = useSystemStatus();
  const [hasLoadedFullBoardData, setHasLoadedFullBoardData] = useState(hasCompletedData);
  const ready = hasCompletedData || hasLoadedFullBoardData;

  useEffect(() => {
    if (hasCompletedData || hasLoadedFullBoardData) {
      return;
    }

    let isMounted = true;

    fetchTasks({ includeCompleted: true })
      .catch(() => {})
      .finally(() => {
        if (isMounted) {
          setHasLoadedFullBoardData(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [fetchTasks, hasCompletedData, hasLoadedFullBoardData]);

  // Filter out future tasks (start_date > current_processing_date)
  // Kanban shows all statuses (active/completed) in columns, so we don't use useFilteredTasks
  const lastProcessedDate = systemStatus?.last_processed_date;
  const kanbanTasks = useMemo(() => {
    if (!lastProcessedDate) return visibleTasks;

    // Parse last_processed_date and add 1 day to get current processing date
    const [year, month, day] = lastProcessedDate.split('-').map(Number);
    const currentProcessingDate = new Date(year, month - 1, day + 1);

    return visibleTasks.filter((task) => {
      // Skip future tasks
      if (task.start_date) {
        const startDateStr = task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date;
        const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
        const taskStartDate = new Date(sYear, sMonth - 1, sDay);
        if (taskStartDate > currentProcessingDate) return false;
      }
      return true;
    });
  }, [visibleTasks, lastProcessedDate]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const showNotification = (message: string, color: 'green' | 'red') => {
    notifications.show({ message, color, autoClose: 3000 });
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleNewTask = () => {
    setEditingTask(null);
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
  };

  const handleUpdateTask = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
    showNotification(updates.is_complete ? 'Task completed!' : 'Task updated', 'green');
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await completeTask(taskId);
      await fetchStats();

      if (response.next_instance) {
        showNotification(
          crisisModeActive
            ? `Task completed! +${response.xp_earned} XP. The next instance was created and hidden until crisis mode ends.`
            : `Task completed! +${response.xp_earned} XP. Next instance created.`,
          'green',
        );
      } else {
        showNotification(`Task completed! +${response.xp_earned} XP`, 'green');
      }
    } catch {
      showNotification('Failed to complete task', 'red');
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    try {
      await uncompleteTask(taskId);
      showNotification('Task marked as incomplete', 'green');
    } catch {
      showNotification('Failed to uncomplete task', 'red');
    }
  };

  const crisisTaskIdSet = useMemo(
    () => new Set(crisisTaskIds),
    [crisisTaskIds],
  );

  return (
    <Box
      className={crisisModeActive ? 'crisis-container-pulse' : undefined}
      style={{ padding: 0 }}
    >
      {/* Crisis Mode Banner */}
      {crisisModeActive && (
        <Box
          style={{
            backgroundColor: 'var(--kc-amber)',
            color: '#0B0E17',
            padding: '8px 16px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <Group gap={8} align="center">
            <IconAlertTriangle size={18} />
            <Text
              size="sm"
              fw={700}
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              ⚠ CRISIS MODE ACTIVE
            </Text>
          </Group>
          <ArcadeButton
            variant="ghost"
            size="xs"
            onClick={exitCrisisMode}
            style={{
              color: '#0B0E17',
              borderColor: 'rgba(11, 14, 23, 0.3)',
            }}
          >
            EXIT
          </ArcadeButton>
        </Box>
      )}

      {/* Page Header */}
      <Group justify="space-between" align="center" mb="md" wrap="wrap">
        <Group gap="md" align="center">
          <Text
            fw={700}
            size="xl"
            className="gradient-text"
            style={{
              fontFamily: '"Space Grotesk", sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            KANBAN_BOARD
          </Text>
          <DataBadge
            value={`${kanbanTasks.length} TASKS`}
            color="cyan"
          />
        </Group>
        <ArcadeButton
          variant="gradient"
          size="sm"
          leftSection={<IconPlus size={16} />}
          onClick={handleNewTask}
        >
          NEW MISSION
        </ArcadeButton>
      </Group>

      {!ready ? null : (
        <KanbanBoard
          tasks={kanbanTasks}
          onUpdateTask={handleUpdateTask}
          onEditTask={handleEditTask}
          onCompleteTask={handleCompleteTask}
          onUncompleteTask={handleUncompleteTask}
          crisisModeActive={crisisModeActive}
          crisisTaskIds={crisisTaskIdSet}
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
    </Box>
  );
}
/* v8 ignore stop */
