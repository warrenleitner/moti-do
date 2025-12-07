/**
 * API client for communicating with the Moti-Do backend.
 * Currently uses mock data; will be replaced with actual API calls
 * when the backend API is implemented (Phase C).
 */

import axios, { type AxiosInstance } from 'axios';
import type { Task, User } from '../types';

// API base URL - will be configured for production
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

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
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Task API endpoints
export const taskApi = {
  // Get all tasks
  getTasks: async (): Promise<Task[]> => {
    const response = await apiClient.get<Task[]>('/tasks');
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
    const response = await apiClient.patch<Task>(`/tasks/${id}`, updates);
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
};

// User API endpoints
export const userApi = {
  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  // Update user settings
  updateUser: async (updates: Partial<User>): Promise<User> => {
    const response = await apiClient.patch<User>('/users/me', updates);
    return response.data;
  },

  // Get user statistics
  getStats: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get('/users/me/stats');
    return response.data;
  },
};

// Auth API endpoints
export const authApi = {
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/auth/login', { username, password });
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
    localStorage.removeItem('auth_token');
  },

  register: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    const response = await apiClient.post('/auth/register', { username, password });
    return response.data;
  },
};

export default apiClient;
