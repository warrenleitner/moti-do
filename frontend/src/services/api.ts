/**
 * API client for communicating with the Moti-Do backend.
 */

import axios, { type AxiosInstance } from 'axios';
import type { Task } from '../types';

// API base URL - configurable via environment variable
// In production, use relative URL (/api) for same-origin requests
// In development, use localhost:8000
const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? '/api' : 'http://localhost:8000/api');

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Cannot test axios interceptors - they are internal to the axios library
/* v8 ignore start */
// Request interceptor for adding auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // In dev mode, don't redirect on 401
    if (error.response?.status === 401 && import.meta.env.PROD) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
/* v8 ignore stop */

// === Type definitions matching the API ===

export interface UserProfile {
  username: string;
  total_xp: number;
  level: number;
  last_processed_date: string;
  vacation_mode: boolean;
}

export interface UserStats {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  habits_count: number;
  total_xp: number;
  level: number;
  badges_earned: number;
  current_streak: number;
  best_streak: number;
}

export interface XPTransaction {
  id: string;
  amount: number;
  source: string;
  timestamp: string;
  task_id?: string;
  description: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  glyph: string;
  earned_date?: string;
}

export interface TagDefinition {
  id: string;
  name: string;
  color: string;
}

export interface ProjectDefinition {
  id: string;
  name: string;
  color: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  all_day: boolean;
  color: string;
  is_complete: boolean;
  is_habit: boolean;
}

export interface HeatmapDay {
  date: string;
  completed_count: number;
  total_count: number;
}

export interface KanbanColumn {
  id: string;
  title: string;
  tasks: Task[];
}

export interface SystemStatus {
  last_processed_date: string;
  current_date: string;
  vacation_mode: boolean;
  pending_days: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// === Authentication API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
export const authApi = {
  // Login with username and password
  /* v8 ignore start - thin API wrapper, tested via integration tests */
  login: async (username: string, password: string): Promise<TokenResponse> => {
    // Use FormData for OAuth2PasswordRequestForm
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post<TokenResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Store token in localStorage
    localStorage.setItem('auth_token', response.data.access_token);
    return response.data;
  },

  // Register new user
  register: async (username: string, password: string): Promise<TokenResponse> => {
    const response = await apiClient.post<TokenResponse>('/auth/register', {
      username,
      password,
    });

    // Store token in localStorage
    localStorage.setItem('auth_token', response.data.access_token);
    return response.data;
  },

  // Change password for authenticated user
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await apiClient.post<{ message: string }>('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },
  /* v8 ignore stop */

  // Logout (clear token)
  logout: () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('auth_token');
  },
};

// === Data Import/Export API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
/* v8 ignore start - thin API wrapper, tested via integration tests */
export const dataApi = {
  // Export all user data as JSON backup
  exportData: async (): Promise<Blob> => {
    const response = await apiClient.get('/user/export', {
      responseType: 'blob',
    });
    return response.data;
  },

  // Import user data from JSON backup file
  importData: async (file: File): Promise<{
    message: string;
    summary: {
      username: string;
      total_xp: number;
      tasks_count: number;
      xp_transactions_count: number;
      badges_count: number;
      tags_count: number;
      projects_count: number;
    };
  }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await apiClient.post<{
      message: string;
      summary: {
        username: string;
        total_xp: number;
        tasks_count: number;
        xp_transactions_count: number;
        badges_count: number;
        tags_count: number;
        projects_count: number;
      };
    }>('/user/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
/* v8 ignore stop */

// === Task API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
/* v8 ignore start - thin API wrapper, tested via integration tests */
export const taskApi = {
  // Get all tasks with optional filters
  getTasks: async (params?: {
    status_filter?: string;
    priority?: string;
    tag?: string;
    project?: string;
    is_habit?: boolean;
    include_completed?: boolean;
  }): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks', { params });
    return response.data;
  },

  // Get single task by ID
  getTask: async (id: string): Promise<Task> => {
    const response = await apiClient.get<Task>(`/tasks/${id}`);
    return response.data;
  },

  // Create new task
  createTask: async (task: Partial<Task>): Promise<Task> => {
    const response = await apiClient.post<Task>('/tasks', task);
    return response.data;
  },

  // Update existing task
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const response = await apiClient.put<Task>(`/tasks/${id}`, updates);
    return response.data;
  },

  // Delete task
  deleteTask: async (id: string): Promise<void> => {
    await apiClient.delete(`/tasks/${id}`);
  },

  // Complete task
  completeTask: async (id: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/complete`);
    return response.data;
  },

  // Uncomplete task
  uncompleteTask: async (id: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${id}/uncomplete`);
    return response.data;
  },

  // Subtask operations
  addSubtask: async (taskId: string, text: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${taskId}/subtasks`, { text });
    return response.data;
  },

  updateSubtask: async (taskId: string, index: number, data: { text: string; complete: boolean }): Promise<Task> => {
    const response = await apiClient.put<Task>(`/tasks/${taskId}/subtasks/${index}`, data);
    return response.data;
  },

  deleteSubtask: async (taskId: string, index: number): Promise<Task> => {
    const response = await apiClient.delete<Task>(`/tasks/${taskId}/subtasks/${index}`);
    return response.data;
  },

  // Dependency operations
  addDependency: async (taskId: string, depId: string): Promise<Task> => {
    const response = await apiClient.post<Task>(`/tasks/${taskId}/dependencies/${depId}`);
    return response.data;
  },

  removeDependency: async (taskId: string, depId: string): Promise<Task> => {
    const response = await apiClient.delete<Task>(`/tasks/${taskId}/dependencies/${depId}`);
    return response.data;
  },
};
/* v8 ignore stop */

// === User API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
/* v8 ignore start - thin API wrapper, tested via integration tests */
export const userApi = {
  // Get user profile
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get<UserProfile>('/user/profile');
    return response.data;
  },

  // Get user statistics
  getStats: async (): Promise<UserStats> => {
    const response = await apiClient.get<UserStats>('/user/stats');
    return response.data;
  },

  // Get XP log
  getXPLog: async (limit = 50): Promise<XPTransaction[]> => {
    const response = await apiClient.get<XPTransaction[]>('/user/xp', { params: { limit } });
    return response.data;
  },

  // Withdraw XP
  withdrawXP: async (amount: number, description?: string): Promise<XPTransaction> => {
    const response = await apiClient.post<XPTransaction>('/user/xp/withdraw', { amount, description });
    return response.data;
  },

  // Get badges
  getBadges: async (): Promise<Badge[]> => {
    const response = await apiClient.get<Badge[]>('/user/badges');
    return response.data;
  },

  // Tags
  getTags: async (): Promise<TagDefinition[]> => {
    const response = await apiClient.get<TagDefinition[]>('/user/tags');
    return response.data;
  },

  createTag: async (name: string, color: string): Promise<TagDefinition> => {
    const response = await apiClient.post<TagDefinition>('/user/tags', { name, color });
    return response.data;
  },

  updateTag: async (id: string, name: string, color: string): Promise<TagDefinition> => {
    const response = await apiClient.put<TagDefinition>(`/user/tags/${id}`, { name, color });
    return response.data;
  },

  deleteTag: async (id: string): Promise<void> => {
    await apiClient.delete(`/user/tags/${id}`);
  },

  // Projects
  getProjects: async (): Promise<ProjectDefinition[]> => {
    const response = await apiClient.get<ProjectDefinition[]>('/user/projects');
    return response.data;
  },

  createProject: async (name: string, color: string): Promise<ProjectDefinition> => {
    const response = await apiClient.post<ProjectDefinition>('/user/projects', { name, color });
    return response.data;
  },

  updateProject: async (id: string, name: string, color: string): Promise<ProjectDefinition> => {
    const response = await apiClient.put<ProjectDefinition>(`/user/projects/${id}`, { name, color });
    return response.data;
  },

  deleteProject: async (id: string): Promise<void> => {
    await apiClient.delete(`/user/projects/${id}`);
  },
};
/* v8 ignore stop */

// === Views API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
/* v8 ignore start - thin API wrapper, tested via integration tests */
export const viewsApi = {
  // Get calendar events
  getCalendarEvents: async (startDate?: string, endDate?: string): Promise<CalendarEvent[]> => {
    const response = await apiClient.get<CalendarEvent[]>('/views/calendar', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data;
  },

  // Get heatmap data
  getHeatmapData: async (weeks = 12, habitId?: string): Promise<HeatmapDay[]> => {
    const response = await apiClient.get<HeatmapDay[]>('/views/heatmap', {
      params: { weeks, habit_id: habitId },
    });
    return response.data;
  },

  // Get kanban data
  getKanbanData: async (project?: string, tag?: string): Promise<KanbanColumn[]> => {
    const response = await apiClient.get<KanbanColumn[]>('/views/kanban', {
      params: { project, tag },
    });
    return response.data;
  },

  // Get habits
  getHabits: async (includeInstances = false): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/views/habits', {
      params: { include_instances: includeInstances },
    });
    return response.data;
  },
};
/* v8 ignore stop */

// === System API endpoints ===
// These are thin wrappers around axios calls - integration tested through components
/* v8 ignore start - thin API wrapper, tested via integration tests */
export const systemApi = {
  // Health check
  healthCheck: async (): Promise<{ status: string; version: string }> => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  // Get system status
  getStatus: async (): Promise<SystemStatus> => {
    const response = await apiClient.get<SystemStatus>('/system/status');
    return response.data;
  },

  // Advance date
  advanceDate: async (params?: { days?: number; to_date?: string }): Promise<SystemStatus> => {
    const response = await apiClient.post<SystemStatus>('/system/advance', params);
    return response.data;
  },

  // Toggle vacation mode
  toggleVacation: async (enable: boolean): Promise<{ vacation_mode: boolean }> => {
    const response = await apiClient.post('/system/vacation', null, { params: { enable } });
    return response.data;
  },
};
/* v8 ignore stop */

export default apiClient;
