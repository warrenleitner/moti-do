import { useState, useEffect, useMemo } from 'react';
import { Box, notifications } from '../ui';
import { StatCard } from '../components/ui';
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

  // Calendar stats
  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    let thisWeek = 0;
    let overdue = 0;
    let upcoming = 0;

    visibleTasks.forEach((t) => {
      if (!t.due_date || t.is_complete) return;
      const due = new Date(t.due_date);
      if (due >= startOfWeek && due < endOfWeek) thisWeek++;
      if (due < now) overdue++;
      if (due >= now) upcoming++;
    });

    return { thisWeek, overdue, upcoming };
  }, [visibleTasks]);

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
      {/* Page header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1
          className="font-display"
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#E0E0E0',
            margin: 0,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          TEMPORAL_GRID
        </h1>
        <p className="micro-meta" style={{ margin: '0.25rem 0 0' }}>
          View and manage tasks by their due dates
        </p>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <StatCard label="TASKS_THIS_WEEK" value={stats.thisWeek} accentColor="cyan" />
        <StatCard label="OVERDUE" value={stats.overdue} accentColor="magenta" />
        <StatCard label="UPCOMING" value={stats.upcoming} accentColor="amber" />
      </div>

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
