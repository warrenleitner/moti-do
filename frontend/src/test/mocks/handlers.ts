/**
 * MSW request handlers for API mocking in tests.
 */

import { http, HttpResponse } from 'msw';
import type { Task } from '../../types';
import { Priority, Difficulty, Duration } from '../../types';

// Mock data
export const mockTasks: Task[] = [
  {
    id: 'task-1',
    title: 'Test Task 1',
    priority: Priority.HIGH,
    difficulty: Difficulty.MEDIUM,
    duration: Duration.SHORT,
    is_complete: false,
    is_habit: false,
    tags: ['work'],
    subtasks: [],
    dependencies: [],
    creation_date: '2025-01-01T10:00:00Z',
    streak_current: 0,
    streak_best: 0,
    history: [],
    score: 100,
  },
  {
    id: 'task-2',
    title: 'Test Task 2',
    priority: Priority.LOW,
    difficulty: Difficulty.TRIVIAL,
    duration: Duration.MINUSCULE,
    is_complete: true,
    is_habit: false,
    tags: ['personal'],
    subtasks: [],
    dependencies: [],
    creation_date: '2025-01-02T10:00:00Z',
    completion_date: '2025-01-03T10:00:00Z',
    streak_current: 0,
    streak_best: 0,
    history: [],
    score: 25,
  },
  {
    id: 'habit-1',
    title: 'Daily Habit',
    priority: Priority.MEDIUM,
    difficulty: Difficulty.LOW,
    duration: Duration.SHORT,
    is_complete: false,
    is_habit: true,
    recurrence_rule: 'daily',
    tags: [],
    subtasks: [],
    dependencies: [],
    creation_date: '2025-01-01T08:00:00Z',
    streak_current: 5,
    streak_best: 10,
    history: [],
    score: 50,
  },
];

export const mockUserProfile = {
  username: 'test_user',
  total_xp: 500,
  level: 5,
  last_processed_date: '2025-01-07',
  vacation_mode: false,
  timezone: 'UTC',
};

export const mockUserStats = {
  total_tasks: 3,
  completed_tasks: 1,
  pending_tasks: 2,
  habits_count: 1,
  total_xp: 500,
  level: 5,
  badges_earned: 2,
  current_streak: 5,
  best_streak: 10,
};

// API base URL
const API_BASE = 'http://localhost:8000/api';

export const handlers = [
  // Health check
  http.get(`${API_BASE}/health`, () => {
    return HttpResponse.json({ status: 'healthy', version: '0.8.6' });
  }),

  // Task endpoints
  http.get(`${API_BASE}/tasks`, () => {
    return HttpResponse.json(mockTasks);
  }),

  http.post(`${API_BASE}/tasks`, async ({ request }) => {
    const data = await request.json() as Partial<Task>;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: data.title || 'New Task',
      priority: data.priority || Priority.MEDIUM,
      difficulty: data.difficulty || Difficulty.MEDIUM,
      duration: data.duration || Duration.SHORT,
      is_complete: false,
      is_habit: data.is_habit || false,
      tags: data.tags || [],
      subtasks: data.subtasks || [],
      dependencies: data.dependencies || [],
      creation_date: new Date().toISOString(),
      streak_current: 0,
      streak_best: 0,
      history: [],
      score: 50,
    };
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.get(`${API_BASE}/tasks/:taskId`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    return HttpResponse.json(task);
  }),

  http.put(`${API_BASE}/tasks/:taskId`, async ({ params, request }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    const updates = await request.json() as Partial<Task>;
    return HttpResponse.json({ ...task, ...updates });
  }),

  http.delete(`${API_BASE}/tasks/:taskId`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${API_BASE}/tasks/:taskId/complete`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    if (task.is_complete) {
      return HttpResponse.json({ detail: 'Task is already complete' }, { status: 400 });
    }
    // Return TaskCompletionResponse format
    const completedTask = { ...task, is_complete: true };
    return HttpResponse.json({
      task: completedTask,
      xp_earned: task.score || 50,
      next_instance: task.is_habit && task.recurrence_rule ? {
        ...completedTask,
        id: `${task.id}-next`,
        is_complete: false,
        due_date: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      } : null,
    });
  }),

  http.post(`${API_BASE}/tasks/:taskId/uncomplete`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    if (!task.is_complete) {
      return HttpResponse.json({ detail: 'Task is not complete' }, { status: 400 });
    }
    return HttpResponse.json({ ...task, is_complete: false });
  }),

  http.post(`${API_BASE}/tasks/:taskId/undo`, ({ params }) => {
    const task = mockTasks.find((t) => t.id === params.taskId);
    if (!task) {
      return HttpResponse.json({ detail: 'Task not found' }, { status: 404 });
    }
    // Simulate undo by returning the task with modified title
    return HttpResponse.json({ ...task, title: 'Undone Task', history: [] });
  }),

  http.post(`${API_BASE}/tasks/bulk/jump-to-current-instance`, async ({ request }) => {
    const body = await request.json() as { task_ids: string[]; dry_run?: boolean };
    const previews = body.task_ids.map((taskId) => {
      const task = mockTasks.find((item) => item.id === taskId);
      if (!task) {
        return {
          task_id: taskId,
          title: 'Unknown task',
          current_start_date: null,
          current_due_date: null,
          new_start_date: null,
          new_due_date: null,
          can_apply: false,
          reason: 'Task not found',
        };
      }

      if (!task.is_habit || !task.recurrence_rule) {
        return {
          task_id: task.id,
          title: task.title,
          current_start_date: task.start_date || null,
          current_due_date: task.due_date || null,
          new_start_date: null,
          new_due_date: null,
          can_apply: false,
          reason: 'Task is not a recurring task',
        };
      }

      return {
        task_id: task.id,
        title: task.title,
        current_start_date: task.start_date || null,
        current_due_date: task.due_date || null,
        new_start_date: '2025-01-08T00:00:00',
        new_due_date: '2025-01-09T00:00:00',
        can_apply: true,
        reason: null,
      };
    });

    if (body.dry_run) {
      return HttpResponse.json({
        previews,
        updated_tasks: [],
        updated_count: 0,
      });
    }

    const updatedTasks = previews
      .filter((preview) => preview.can_apply)
      .map((preview) => {
        const task = mockTasks.find((item) => item.id === preview.task_id)!;
        return {
          ...task,
          start_date: preview.new_start_date,
          due_date: preview.new_due_date,
        };
      });

    return HttpResponse.json({
      previews,
      updated_tasks: updatedTasks,
      updated_count: updatedTasks.length,
    });
  }),

  // User endpoints
  http.get(`${API_BASE}/user/profile`, () => {
    return HttpResponse.json(mockUserProfile);
  }),

  http.get(`${API_BASE}/user/stats`, () => {
    return HttpResponse.json(mockUserStats);
  }),

  http.get(`${API_BASE}/user/badges`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/user/xp`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/user/notification-summary`, () => {
    return HttpResponse.json({
      completed_today: 1,
      tasks_due_today: 2,
      xp_gained_today: 50,
      points_at_risk: 25,
      processing_date: '2025-01-08',
      current_date: '2025-01-09',
      days_behind: 0,
    });
  }),

  // System endpoints
  http.get(`${API_BASE}/system/status`, () => {
    return HttpResponse.json({
      last_processed_date: '2025-01-08',
      current_date: '2025-01-09',
      vacation_mode: false,
      pending_days: 0,
      timezone: 'UTC',
    });
  }),

  http.post(`${API_BASE}/system/reset-score-tracking`, () => {
    return HttpResponse.json({
      last_processed_date: '2025-01-09',
      current_date: '2025-01-09',
      vacation_mode: false,
      pending_days: 0,
      timezone: 'UTC',
    });
  }),

  // Views endpoints
  http.get(`${API_BASE}/views/habits`, () => {
    return HttpResponse.json(mockTasks.filter((t) => t.is_habit));
  }),

  http.get(`${API_BASE}/views/calendar`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/views/heatmap`, () => {
    return HttpResponse.json([]);
  }),

  http.get(`${API_BASE}/views/kanban`, () => {
    return HttpResponse.json([
      { id: 'backlog', title: 'Backlog', tasks: [] },
      { id: 'todo', title: 'To Do', tasks: mockTasks.filter((t) => !t.is_complete && !t.is_habit) },
      { id: 'in_progress', title: 'In Progress', tasks: [] },
      { id: 'blocked', title: 'Blocked', tasks: [] },
      { id: 'done', title: 'Done', tasks: mockTasks.filter((t) => t.is_complete) },
    ]);
  }),
];
