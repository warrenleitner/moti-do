/**
 * Tests for API service - testing all API functions with mocked axios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Priority, Difficulty, Duration } from '../types';

// Create hoisted mock fns so they're available in the factory
const { mockGet, mockPost, mockPut, mockDelete, mockRequestUse, mockResponseUse } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockPost: vi.fn(),
  mockPut: vi.fn(),
  mockDelete: vi.fn(),
  mockRequestUse: vi.fn(),
  mockResponseUse: vi.fn(),
}));

// Mock axios module before importing api
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: mockPost,
      put: mockPut,
      delete: mockDelete,
      interceptors: {
        request: { use: mockRequestUse },
        response: { use: mockResponseUse },
      },
    }),
  },
}));

// Import after mock setup
import { authApi, dataApi, taskApi, userApi, viewsApi, systemApi } from './api';

// Reference mock instance for tests
const mockAxiosInstance = {
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete,
};

describe('API Tests', () => {
  const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
  };

  const originalLocalStorage = global.localStorage;
  const originalLocation = global.window.location;

  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock window.location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (global.window as any).location;
    global.window.location = { ...originalLocation, href: '' } as Location;

    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
    });
    global.window.location = originalLocation;
  });

  describe('authApi', () => {
    describe('isAuthenticated', () => {
      it('should return true when token exists', () => {
        mockLocalStorage.getItem.mockReturnValue('test-token');

        const result = authApi.isAuthenticated();

        expect(result).toBe(true);
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
      });

      it('should return false when token does not exist', () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        const result = authApi.isAuthenticated();

        expect(result).toBe(false);
        expect(mockLocalStorage.getItem).toHaveBeenCalledWith('auth_token');
      });
    });

    describe('logout', () => {
      it('should remove token and redirect to login', () => {
        authApi.logout();

        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
        expect(global.window.location.href).toBe('/login');
      });
    });

    describe('login', () => {
      it('should login and store token', async () => {
        const mockResponse = {
          data: {
            access_token: 'test-token',
            token_type: 'Bearer',
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await authApi.login('testuser', 'password123');

        expect(result).toEqual(mockResponse.data);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'test-token');
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/auth/login',
          expect.any(FormData),
          expect.objectContaining({
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          })
        );
      });
    });

    describe('register', () => {
      it('should register and store token', async () => {
        const mockResponse = {
          data: {
            access_token: 'new-token',
            token_type: 'Bearer',
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await authApi.register('newuser', 'password123');

        expect(result).toEqual(mockResponse.data);
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/register', {
          username: 'newuser',
          password: 'password123',
        });
      });
    });

    describe('changePassword', () => {
      it('should change password', async () => {
        const mockResponse = {
          data: {
            message: 'Password changed successfully',
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await authApi.changePassword('oldpass', 'newpass');

        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/change-password', {
          current_password: 'oldpass',
          new_password: 'newpass',
        });
      });
    });
  });

  describe('dataApi', () => {
    describe('exportData', () => {
      it('should export data as blob', async () => {
        const mockBlob = new Blob(['test data']);
        const mockResponse = {
          data: mockBlob,
        };

        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await dataApi.exportData();

        expect(result).toEqual(mockBlob);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/export', {
          responseType: 'blob',
        });
      });
    });

    describe('importData', () => {
      it('should import data from file', async () => {
        const mockFile = new File(['test'], 'test.json', { type: 'application/json' });
        const mockResponse = {
          data: {
            message: 'Import successful',
            summary: {
              username: 'testuser',
              total_xp: 100,
              tasks_count: 5,
              xp_transactions_count: 10,
              badges_count: 2,
              tags_count: 3,
              projects_count: 1,
            },
          },
        };

        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await dataApi.importData(mockFile);

        expect(result).toEqual(mockResponse.data);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith(
          '/user/import',
          expect.any(FormData),
          expect.objectContaining({
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
        );
      });
    });
  });

  describe('taskApi', () => {
    describe('getTasks', () => {
      it('should get tasks with optional filters', async () => {
        const mockTasks = [
          {
            id: 'task-1',
            title: 'Test Task',
            priority: Priority.HIGH,
            difficulty: Difficulty.MEDIUM,
            duration: Duration.SHORT,
            is_complete: false,
            is_habit: false,
            tags: [],
            subtasks: [],
            dependencies: [],
            creation_date: '2024-01-01',
            score: 50,
            streak_current: 0,
            streak_best: 0,
            history: [],
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockTasks });

        const result = await taskApi.getTasks({ status_filter: 'active' });

        expect(result).toEqual(mockTasks);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks', {
          params: { status_filter: 'active' },
        });
      });
    });

    describe('getTask', () => {
      it('should get single task by ID', async () => {
        const mockTask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockTask });

        const result = await taskApi.getTask('task-1');

        expect(result).toEqual(mockTask);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/tasks/task-1');
      });
    });

    describe('createTask', () => {
      it('should create a new task', async () => {
        const newTask = { title: 'New Task', priority: Priority.MEDIUM };
        const createdTask = {
          id: 'task-2',
          ...newTask,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: createdTask });

        const result = await taskApi.createTask(newTask);

        expect(result).toEqual(createdTask);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks', newTask);
      });
    });

    describe('updateTask', () => {
      it('should update a task', async () => {
        const updates = { title: 'Updated Task' };
        const updatedTask = {
          id: 'task-1',
          title: 'Updated Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.put.mockResolvedValue({ data: updatedTask });

        const result = await taskApi.updateTask('task-1', updates);

        expect(result).toEqual(updatedTask);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/tasks/task-1', updates);
      });
    });

    describe('deleteTask', () => {
      it('should delete a task', async () => {
        mockAxiosInstance.delete.mockResolvedValue({});

        await taskApi.deleteTask('task-1');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/tasks/task-1');
      });
    });

    describe('completeTask', () => {
      it('should complete a task', async () => {
        const completedTask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: true,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: completedTask });

        const result = await taskApi.completeTask('task-1');

        expect(result).toEqual(completedTask);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/task-1/complete');
      });
    });

    describe('uncompleteTask', () => {
      it('should uncomplete a task', async () => {
        const uncompletedTask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: uncompletedTask });

        const result = await taskApi.uncompleteTask('task-1');

        expect(result).toEqual(uncompletedTask);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/task-1/uncomplete');
      });
    });

    describe('addSubtask', () => {
      it('should add a subtask', async () => {
        const taskWithSubtask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [{ text: 'New subtask', complete: false }],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: taskWithSubtask });

        const result = await taskApi.addSubtask('task-1', 'New subtask');

        expect(result).toEqual(taskWithSubtask);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/task-1/subtasks', { text: 'New subtask' });
      });
    });

    describe('updateSubtask', () => {
      it('should update a subtask', async () => {
        const taskWithUpdatedSubtask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [{ text: 'Updated subtask', complete: true }],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.put.mockResolvedValue({ data: taskWithUpdatedSubtask });

        const result = await taskApi.updateSubtask('task-1', 0, { text: 'Updated subtask', complete: true });

        expect(result).toEqual(taskWithUpdatedSubtask);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/tasks/task-1/subtasks/0', { text: 'Updated subtask', complete: true });
      });
    });

    describe('deleteSubtask', () => {
      it('should delete a subtask', async () => {
        const taskWithoutSubtask = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.delete.mockResolvedValue({ data: taskWithoutSubtask });

        const result = await taskApi.deleteSubtask('task-1', 0);

        expect(result).toEqual(taskWithoutSubtask);
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/tasks/task-1/subtasks/0');
      });
    });

    describe('addDependency', () => {
      it('should add a dependency', async () => {
        const taskWithDependency = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: ['task-2'],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.post.mockResolvedValue({ data: taskWithDependency });

        const result = await taskApi.addDependency('task-1', 'task-2');

        expect(result).toEqual(taskWithDependency);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/tasks/task-1/dependencies/task-2');
      });
    });

    describe('removeDependency', () => {
      it('should remove a dependency', async () => {
        const taskWithoutDependency = {
          id: 'task-1',
          title: 'Test Task',
          priority: Priority.HIGH,
          difficulty: Difficulty.MEDIUM,
          duration: Duration.SHORT,
          is_complete: false,
          is_habit: false,
          tags: [],
          subtasks: [],
          dependencies: [],
          creation_date: '2024-01-01',
          score: 50,
          streak_current: 0,
          streak_best: 0,
          history: [],
        };

        mockAxiosInstance.delete.mockResolvedValue({ data: taskWithoutDependency });

        const result = await taskApi.removeDependency('task-1', 'task-2');

        expect(result).toEqual(taskWithoutDependency);
        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/tasks/task-1/dependencies/task-2');
      });
    });
  });

  describe('userApi', () => {
    describe('getProfile', () => {
      it('should get user profile', async () => {
        const mockProfile = {
          username: 'testuser',
          total_xp: 100,
          level: 2,
          last_processed_date: '2024-01-01',
          vacation_mode: false,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockProfile });

        const result = await userApi.getProfile();

        expect(result).toEqual(mockProfile);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/profile');
      });
    });

    describe('getStats', () => {
      it('should get user stats', async () => {
        const mockStats = {
          total_tasks: 10,
          completed_tasks: 5,
          pending_tasks: 5,
          habits_count: 3,
          total_xp: 100,
          level: 2,
          badges_earned: 2,
          current_streak: 5,
          best_streak: 10,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockStats });

        const result = await userApi.getStats();

        expect(result).toEqual(mockStats);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/stats');
      });
    });

    describe('getXPLog', () => {
      it('should get XP log', async () => {
        const mockXPLog = [
          {
            id: 'xp-1',
            amount: 50,
            source: 'task_completion',
            timestamp: '2024-01-01T00:00:00Z',
            description: 'Completed task',
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockXPLog });

        const result = await userApi.getXPLog(50);

        expect(result).toEqual(mockXPLog);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/xp', { params: { limit: 50 } });
      });
    });

    describe('withdrawXP', () => {
      it('should withdraw XP', async () => {
        const mockTransaction = {
          id: 'xp-2',
          amount: -25,
          source: 'withdrawal',
          timestamp: '2024-01-01T00:00:00Z',
          description: 'Test withdrawal',
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockTransaction });

        const result = await userApi.withdrawXP(25, 'Test withdrawal');

        expect(result).toEqual(mockTransaction);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/user/xp/withdraw', { amount: 25, description: 'Test withdrawal' });
      });
    });

    describe('getBadges', () => {
      it('should get badges', async () => {
        const mockBadges = [
          {
            id: 'badge-1',
            name: 'First Task',
            description: 'Completed first task',
            glyph: '🏆',
            earned_date: '2024-01-01',
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockBadges });

        const result = await userApi.getBadges();

        expect(result).toEqual(mockBadges);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/badges');
      });
    });

    describe('getTags', () => {
      it('should get tags', async () => {
        const mockTags = [
          { id: 'tag-1', name: 'urgent', color: '#ff0000' },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockTags });

        const result = await userApi.getTags();

        expect(result).toEqual(mockTags);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/tags');
      });
    });

    describe('createTag', () => {
      it('should create a tag', async () => {
        const mockTag = { id: 'tag-2', name: 'work', color: '#0000ff' };

        mockAxiosInstance.post.mockResolvedValue({ data: mockTag });

        const result = await userApi.createTag('work', '#0000ff');

        expect(result).toEqual(mockTag);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/user/tags', { name: 'work', color: '#0000ff' });
      });
    });

    describe('updateTag', () => {
      it('should update a tag', async () => {
        const mockTag = { id: 'tag-1', name: 'urgent-updated', color: '#ff00ff' };

        mockAxiosInstance.put.mockResolvedValue({ data: mockTag });

        const result = await userApi.updateTag('tag-1', 'urgent-updated', '#ff00ff');

        expect(result).toEqual(mockTag);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/user/tags/tag-1', { name: 'urgent-updated', color: '#ff00ff' });
      });
    });

    describe('deleteTag', () => {
      it('should delete a tag', async () => {
        mockAxiosInstance.delete.mockResolvedValue({});

        await userApi.deleteTag('tag-1');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/user/tags/tag-1');
      });
    });

    describe('getProjects', () => {
      it('should get projects', async () => {
        const mockProjects = [
          { id: 'proj-1', name: 'Website', color: '#00ff00' },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockProjects });

        const result = await userApi.getProjects();

        expect(result).toEqual(mockProjects);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/user/projects');
      });
    });

    describe('createProject', () => {
      it('should create a project', async () => {
        const mockProject = { id: 'proj-2', name: 'App', color: '#ff00ff' };

        mockAxiosInstance.post.mockResolvedValue({ data: mockProject });

        const result = await userApi.createProject('App', '#ff00ff');

        expect(result).toEqual(mockProject);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/user/projects', { name: 'App', color: '#ff00ff' });
      });
    });

    describe('updateProject', () => {
      it('should update a project', async () => {
        const mockProject = { id: 'proj-1', name: 'Website-updated', color: '#00ffff' };

        mockAxiosInstance.put.mockResolvedValue({ data: mockProject });

        const result = await userApi.updateProject('proj-1', 'Website-updated', '#00ffff');

        expect(result).toEqual(mockProject);
        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/user/projects/proj-1', { name: 'Website-updated', color: '#00ffff' });
      });
    });

    describe('deleteProject', () => {
      it('should delete a project', async () => {
        mockAxiosInstance.delete.mockResolvedValue({});

        await userApi.deleteProject('proj-1');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/user/projects/proj-1');
      });
    });
  });

  describe('viewsApi', () => {
    describe('getCalendarEvents', () => {
      it('should get calendar events', async () => {
        const mockEvents = [
          {
            id: 'event-1',
            title: 'Test Event',
            start: '2024-01-01T10:00:00Z',
            end: '2024-01-01T11:00:00Z',
            all_day: false,
            color: '#ff0000',
            is_complete: false,
            is_habit: false,
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

        const result = await viewsApi.getCalendarEvents('2024-01-01', '2024-01-31');

        expect(result).toEqual(mockEvents);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/views/calendar', {
          params: { start_date: '2024-01-01', end_date: '2024-01-31' },
        });
      });
    });

    describe('getHeatmapData', () => {
      it('should get heatmap data', async () => {
        const mockHeatmap = [
          {
            date: '2024-01-01',
            completed_count: 5,
            total_count: 10,
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockHeatmap });

        const result = await viewsApi.getHeatmapData(12, 'habit-1');

        expect(result).toEqual(mockHeatmap);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/views/heatmap', {
          params: { weeks: 12, habit_id: 'habit-1' },
        });
      });
    });

    describe('getKanbanData', () => {
      it('should get kanban data', async () => {
        const mockKanban = [
          {
            id: 'col-1',
            title: 'To Do',
            tasks: [],
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockKanban });

        const result = await viewsApi.getKanbanData('project1', 'tag1');

        expect(result).toEqual(mockKanban);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/views/kanban', {
          params: { project: 'project1', tag: 'tag1' },
        });
      });
    });

    describe('getHabits', () => {
      it('should get habits', async () => {
        const mockHabits = [
          {
            id: 'habit-1',
            title: 'Daily Exercise',
            priority: Priority.HIGH,
            difficulty: Difficulty.MEDIUM,
            duration: Duration.SHORT,
            is_complete: false,
            is_habit: true,
            tags: [],
            subtasks: [],
            dependencies: [],
            creation_date: '2024-01-01',
            score: 50,
            streak_current: 5,
            streak_best: 10,
            history: [],
          },
        ];

        mockAxiosInstance.get.mockResolvedValue({ data: mockHabits });

        const result = await viewsApi.getHabits(true);

        expect(result).toEqual(mockHabits);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/views/habits', {
          params: { include_instances: true },
        });
      });
    });
  });

  describe('systemApi', () => {
    describe('healthCheck', () => {
      it('should perform health check', async () => {
        const mockHealth = {
          status: 'ok',
          version: '1.0.0',
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockHealth });

        const result = await systemApi.healthCheck();

        expect(result).toEqual(mockHealth);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
      });
    });

    describe('getStatus', () => {
      it('should get system status', async () => {
        const mockStatus = {
          last_processed_date: '2024-01-01',
          current_date: '2024-01-02',
          vacation_mode: false,
          pending_days: 1,
        };

        mockAxiosInstance.get.mockResolvedValue({ data: mockStatus });

        const result = await systemApi.getStatus();

        expect(result).toEqual(mockStatus);
        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/system/status');
      });
    });

    describe('advanceDate', () => {
      it('should advance date', async () => {
        const mockStatus = {
          last_processed_date: '2024-01-02',
          current_date: '2024-01-02',
          vacation_mode: false,
          pending_days: 0,
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockStatus });

        const result = await systemApi.advanceDate({ days: 1 });

        expect(result).toEqual(mockStatus);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/system/advance', { days: 1 });
      });
    });

    describe('toggleVacation', () => {
      it('should toggle vacation mode', async () => {
        const mockResponse = {
          vacation_mode: true,
        };

        mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

        const result = await systemApi.toggleVacation(true);

        expect(result).toEqual(mockResponse);
        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/system/vacation', null, { params: { enable: true } });
      });
    });
  });
});
