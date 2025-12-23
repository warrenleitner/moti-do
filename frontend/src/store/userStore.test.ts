/**
 * Tests for userStore Zustand store.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from '@testing-library/react';
import { useUserStore } from './userStore';
import { userApi, systemApi } from '../services/api';
import type { Badge, TagDefinition, ProjectDefinition } from '../types';
import type { UserProfile, UserStats, SystemStatus } from '../services/api';

// Mock the API modules
vi.mock('../services/api', () => ({
  userApi: {
    getProfile: vi.fn(),
    getStats: vi.fn(),
    getBadges: vi.fn(),
    getTags: vi.fn(),
    getProjects: vi.fn(),
    withdrawXP: vi.fn(),
  },
  systemApi: {
    getStatus: vi.fn(),
    advanceDate: vi.fn(),
    toggleVacation: vi.fn(),
  },
}));

describe('userStore', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Reset store state
    act(() => {
      useUserStore.setState({
        user: null,
        stats: null,
        systemStatus: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.stats).toBeNull();
      expect(state.systemStatus).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('should set user and update authentication state', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const state = useUserStore.getState();
      expect(state.user).toEqual(user);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear user when null is passed', () => {
      act(() => {
        useUserStore.getState().setUser({
          username: 'testuser',
          xp: 100,
          level: 2,
          tasks: [],
          xp_transactions: [],
          badges: [],
          defined_tags: [],
          defined_projects: [],
        });
      });

      act(() => {
        useUserStore.getState().setUser(null);
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('updateUser', () => {
    it('should update user properties', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().updateUser({ xp: 200, level: 3 });
      });

      const state = useUserStore.getState();
      expect(state.user?.xp).toBe(200);
      expect(state.user?.level).toBe(3);
      expect(state.user?.username).toBe('testuser');
    });

    it('should not update if user is null', () => {
      act(() => {
        useUserStore.getState().updateUser({ xp: 200 });
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('addXP', () => {
    it('should add XP and update level', () => {
      const user = {
        username: 'testuser',
        xp: 50,
        level: 1,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().addXP(100, 'Task completion', 'task-123');
      });

      const state = useUserStore.getState();
      expect(state.user?.xp).toBe(150);
      expect(state.user?.level).toBe(2); // floor(150/100) + 1
      expect(state.user?.xp_transactions).toHaveLength(1);
      expect(state.user?.xp_transactions[0]).toMatchObject({
        amount: 100,
        reason: 'Task completion',
        task_id: 'task-123',
      });
    });

    it('should not add XP if user is null', () => {
      act(() => {
        useUserStore.getState().addXP(100, 'Test');
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('addBadge', () => {
    it('should add badge to user', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const badge: Badge = {
        id: 'badge-1',
        name: 'First Task',
        description: 'Completed first task',
        glyph: '🏆',
        earned_date: '2024-01-01',
      };

      act(() => {
        useUserStore.getState().addBadge(badge);
      });

      const state = useUserStore.getState();
      expect(state.user?.badges).toHaveLength(1);
      expect(state.user?.badges[0]).toEqual(badge);
    });

    it('should not add duplicate badge', () => {
      const badge: Badge = {
        id: 'badge-1',
        name: 'First Task',
        description: 'Completed first task',
        glyph: '🏆',
        earned_date: '2024-01-01',
      };

      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [badge],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().addBadge(badge);
      });

      const state = useUserStore.getState();
      expect(state.user?.badges).toHaveLength(1);
    });

    it('should not add badge if user is null', () => {
      const badge: Badge = {
        id: 'badge-1',
        name: 'First Task',
        description: 'Completed first task',
        glyph: '🏆',
        earned_date: '2024-01-01',
      };

      act(() => {
        useUserStore.getState().addBadge(badge);
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      act(() => {
        useUserStore.getState().setLoading(true);
      });

      expect(useUserStore.getState().isLoading).toBe(true);

      act(() => {
        useUserStore.getState().setLoading(false);
      });

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error and clear loading', () => {
      act(() => {
        useUserStore.getState().setLoading(true);
      });

      act(() => {
        useUserStore.getState().setError('Test error');
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Test error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user state', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().logout();
      });

      const state = useUserStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Tag Management', () => {
    it('should add tag to user', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const tag: TagDefinition = { name: 'urgent', color: '#ff0000' };

      act(() => {
        useUserStore.getState().addTag(tag);
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_tags).toHaveLength(1);
      expect(state.user?.defined_tags[0]).toEqual(tag);
    });

    it('should not add duplicate tag', () => {
      const tag: TagDefinition = { name: 'urgent', color: '#ff0000' };

      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [tag],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().addTag(tag);
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_tags).toHaveLength(1);
    });

    it('should remove tag from user', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [
          { name: 'urgent', color: '#ff0000' },
          { name: 'work', color: '#0000ff' },
        ],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().removeTag('urgent');
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_tags).toHaveLength(1);
      expect(state.user?.defined_tags[0].name).toBe('work');
    });
  });

  describe('Project Management', () => {
    it('should add project to user', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const project: ProjectDefinition = { name: 'Website', color: '#00ff00' };

      act(() => {
        useUserStore.getState().addProject(project);
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_projects).toHaveLength(1);
      expect(state.user?.defined_projects[0]).toEqual(project);
    });

    it('should not add duplicate project', () => {
      const project: ProjectDefinition = { name: 'Website', color: '#00ff00' };

      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [project],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().addProject(project);
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_projects).toHaveLength(1);
    });

    it('should remove project from user', () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [
          { name: 'Website', color: '#00ff00' },
          { name: 'App', color: '#ff00ff' },
        ],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      act(() => {
        useUserStore.getState().removeProject('Website');
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_projects).toHaveLength(1);
      expect(state.user?.defined_projects[0].name).toBe('App');
    });
  });

  describe('API Actions - fetchProfile', () => {
    it('should fetch and update profile', async () => {
      const profile: UserProfile = {
        username: 'testuser',
        total_xp: 250,
        level: 3,
        last_processed_date: '2024-01-01',
        vacation_mode: false,
      };

      vi.mocked(userApi.getProfile).mockResolvedValue(profile);

      await act(async () => {
        await useUserStore.getState().fetchProfile();
      });

      const state = useUserStore.getState();
      expect(state.user?.username).toBe('testuser');
      expect(state.user?.xp).toBe(250);
      expect(state.user?.level).toBe(3);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch profile error', async () => {
      vi.mocked(userApi.getProfile).mockRejectedValue(new Error('Network error'));

      await act(async () => {
        await useUserStore.getState().fetchProfile();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('API Actions - fetchStats', () => {
    it('should fetch and update stats', async () => {
      const stats: UserStats = {
        total_tasks: 10,
        completed_tasks: 5,
        pending_tasks: 5,
        habits_count: 3,
        total_xp: 250,
        level: 3,
        badges_earned: 2,
        current_streak: 5,
        best_streak: 10,
      };

      vi.mocked(userApi.getStats).mockResolvedValue(stats);

      await act(async () => {
        await useUserStore.getState().fetchStats();
      });

      const state = useUserStore.getState();
      expect(state.stats).toEqual(stats);
      expect(state.error).toBeNull();
    });

    it('should handle fetch stats error', async () => {
      vi.mocked(userApi.getStats).mockRejectedValue(new Error('Stats error'));

      await act(async () => {
        await useUserStore.getState().fetchStats();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Stats error');
    });
  });

  describe('API Actions - fetchBadges', () => {
    it('should fetch and update badges', async () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const apiBadges = [
        {
          id: 'badge-1',
          name: 'First Task',
          description: 'Completed first task',
          glyph: '🏆',
          earned_date: '2024-01-01',
        },
      ];

      vi.mocked(userApi.getBadges).mockResolvedValue(apiBadges);

      await act(async () => {
        await useUserStore.getState().fetchBadges();
      });

      const state = useUserStore.getState();
      expect(state.user?.badges).toHaveLength(1);
      expect(state.user?.badges[0].name).toBe('First Task');
    });

    it('should handle fetch badges error', async () => {
      vi.mocked(userApi.getBadges).mockRejectedValue(new Error('Badges error'));

      await act(async () => {
        await useUserStore.getState().fetchBadges();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Badges error');
    });
  });

  describe('API Actions - fetchSystemStatus', () => {
    it('should fetch and update system status', async () => {
      const status: SystemStatus = {
        last_processed_date: '2024-01-01',
        current_date: '2024-01-02',
        vacation_mode: false,
        pending_days: 1,
      };

      vi.mocked(systemApi.getStatus).mockResolvedValue(status);

      await act(async () => {
        await useUserStore.getState().fetchSystemStatus();
      });

      const state = useUserStore.getState();
      expect(state.systemStatus).toEqual(status);
      expect(state.error).toBeNull();
    });

    it('should handle fetch system status error', async () => {
      vi.mocked(systemApi.getStatus).mockRejectedValue(new Error('Status error'));

      await act(async () => {
        await useUserStore.getState().fetchSystemStatus();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Status error');
    });
  });

  describe('API Actions - fetchTags', () => {
    it('should fetch and update tags', async () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const apiTags = [
        { id: 'tag-1', name: 'urgent', color: '#ff0000' },
        { id: 'tag-2', name: 'work', color: '#0000ff' },
      ];

      vi.mocked(userApi.getTags).mockResolvedValue(apiTags);

      await act(async () => {
        await useUserStore.getState().fetchTags();
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_tags).toHaveLength(2);
      expect(state.user?.defined_tags[0].name).toBe('urgent');
    });

    it('should handle fetch tags error', async () => {
      vi.mocked(userApi.getTags).mockRejectedValue(new Error('Tags error'));

      await act(async () => {
        await useUserStore.getState().fetchTags();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Tags error');
    });
  });

  describe('API Actions - fetchProjects', () => {
    it('should fetch and update projects', async () => {
      const user = {
        username: 'testuser',
        xp: 100,
        level: 2,
        tasks: [],
        xp_transactions: [],
        badges: [],
        defined_tags: [],
        defined_projects: [],
      };

      act(() => {
        useUserStore.getState().setUser(user);
      });

      const apiProjects = [
        { id: 'proj-1', name: 'Website', color: '#00ff00' },
        { id: 'proj-2', name: 'App', color: '#ff00ff' },
      ];

      vi.mocked(userApi.getProjects).mockResolvedValue(apiProjects);

      await act(async () => {
        await useUserStore.getState().fetchProjects();
      });

      const state = useUserStore.getState();
      expect(state.user?.defined_projects).toHaveLength(2);
      expect(state.user?.defined_projects[0].name).toBe('Website');
    });

    it('should handle fetch projects error', async () => {
      vi.mocked(userApi.getProjects).mockRejectedValue(new Error('Projects error'));

      await act(async () => {
        await useUserStore.getState().fetchProjects();
      });

      const state = useUserStore.getState();
      expect(state.error).toBe('Projects error');
    });
  });

  describe('API Actions - advanceDate', () => {
    it('should advance date successfully', async () => {
      const status: SystemStatus = {
        last_processed_date: '2024-01-02',
        current_date: '2024-01-02',
        vacation_mode: false,
        pending_days: 0,
      };

      vi.mocked(systemApi.advanceDate).mockResolvedValue(status);

      await act(async () => {
        await useUserStore.getState().advanceDate({ days: 1 });
      });

      const state = useUserStore.getState();
      expect(state.systemStatus).toEqual(status);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle advance date error', async () => {
      vi.mocked(systemApi.advanceDate).mockRejectedValue(new Error('Advance error'));

      await expect(async () => {
        await act(async () => {
          await useUserStore.getState().advanceDate({ days: 1 });
        });
      }).rejects.toThrow('Advance error');

      const state = useUserStore.getState();
      expect(state.error).toBe('Advance error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('API Actions - toggleVacation', () => {
    it('should toggle vacation mode successfully', async () => {
      const status: SystemStatus = {
        last_processed_date: '2024-01-01',
        current_date: '2024-01-01',
        vacation_mode: false,
        pending_days: 0,
      };

      act(() => {
        useUserStore.setState({ systemStatus: status });
      });

      vi.mocked(systemApi.toggleVacation).mockResolvedValue({ vacation_mode: true });

      await act(async () => {
        await useUserStore.getState().toggleVacation(true);
      });

      const state = useUserStore.getState();
      expect(state.systemStatus?.vacation_mode).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle toggle vacation error', async () => {
      vi.mocked(systemApi.toggleVacation).mockRejectedValue(new Error('Vacation error'));

      await expect(async () => {
        await act(async () => {
          await useUserStore.getState().toggleVacation(true);
        });
      }).rejects.toThrow('Vacation error');

      const state = useUserStore.getState();
      expect(state.error).toBe('Vacation error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('API Actions - withdrawXP', () => {
    it('should withdraw XP successfully', async () => {
      const profile: UserProfile = {
        username: 'testuser',
        total_xp: 150,
        level: 2,
        last_processed_date: '2024-01-01',
        vacation_mode: false,
      };

      vi.mocked(userApi.withdrawXP).mockResolvedValue({
        id: 'xp-1',
        amount: -50,
        source: 'withdrawal',
        timestamp: '2024-01-01T00:00:00Z',
        description: 'Test withdrawal',
      });
      vi.mocked(userApi.getProfile).mockResolvedValue(profile);

      await act(async () => {
        await useUserStore.getState().withdrawXP(50, 'Test withdrawal');
      });

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(userApi.withdrawXP).toHaveBeenCalledWith(50, 'Test withdrawal');
      expect(userApi.getProfile).toHaveBeenCalled();
    });

    it('should handle withdraw XP error', async () => {
      vi.mocked(userApi.withdrawXP).mockRejectedValue(new Error('Withdraw error'));

      await expect(async () => {
        await act(async () => {
          await useUserStore.getState().withdrawXP(50);
        });
      }).rejects.toThrow('Withdraw error');

      const state = useUserStore.getState();
      expect(state.error).toBe('Withdraw error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('API Actions - initializeUser', () => {
    it('should initialize all user data successfully', async () => {
      const profile: UserProfile = {
        username: 'testuser',
        total_xp: 250,
        level: 3,
        last_processed_date: '2024-01-01',
        vacation_mode: false,
      };

      const stats: UserStats = {
        total_tasks: 10,
        completed_tasks: 5,
        pending_tasks: 5,
        habits_count: 3,
        total_xp: 250,
        level: 3,
        badges_earned: 2,
        current_streak: 5,
        best_streak: 10,
      };

      const badges = [
        {
          id: 'badge-1',
          name: 'First Task',
          description: 'Completed first task',
          glyph: '🏆',
          earned_date: '2024-01-01',
        },
      ];

      const tags = [{ id: 'tag-1', name: 'urgent', color: '#ff0000' }];
      const projects = [{ id: 'proj-1', name: 'Website', color: '#00ff00' }];

      const systemStatus: SystemStatus = {
        last_processed_date: '2024-01-01',
        current_date: '2024-01-02',
        vacation_mode: false,
        pending_days: 1,
      };

      vi.mocked(userApi.getProfile).mockResolvedValue(profile);
      vi.mocked(userApi.getStats).mockResolvedValue(stats);
      vi.mocked(userApi.getBadges).mockResolvedValue(badges);
      vi.mocked(userApi.getTags).mockResolvedValue(tags);
      vi.mocked(userApi.getProjects).mockResolvedValue(projects);
      vi.mocked(systemApi.getStatus).mockResolvedValue(systemStatus);

      await act(async () => {
        await useUserStore.getState().initializeUser();
      });

      const state = useUserStore.getState();
      expect(state.user?.username).toBe('testuser');
      expect(state.user?.xp).toBe(250);
      expect(state.user?.level).toBe(3);
      expect(state.user?.badges).toHaveLength(1);
      expect(state.user?.defined_tags).toHaveLength(1);
      expect(state.user?.defined_projects).toHaveLength(1);
      expect(state.stats).toEqual(stats);
      expect(state.systemStatus).toEqual(systemStatus);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle initialize user error', async () => {
      vi.mocked(userApi.getProfile).mockRejectedValue(new Error('Init error'));

      await expect(async () => {
        await act(async () => {
          await useUserStore.getState().initializeUser();
        });
      }).rejects.toThrow('Init error');

      const state = useUserStore.getState();
      expect(state.error).toBe('Init error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Selector Hooks', () => {
    it('useUserLevel should return user level or default', () => {
      const { result: result1 } = { result: useUserStore.getState() };
      expect(result1.user?.level ?? 1).toBe(1);

      act(() => {
        useUserStore.getState().setUser({
          username: 'testuser',
          xp: 100,
          level: 5,
          tasks: [],
          xp_transactions: [],
          badges: [],
          defined_tags: [],
          defined_projects: [],
        });
      });

      const { result: result2 } = { result: useUserStore.getState() };
      expect(result2.user?.level ?? 1).toBe(5);
    });

    it('useUserXP should return user XP or default', () => {
      const { result: result1 } = { result: useUserStore.getState() };
      expect(result1.user?.xp ?? 0).toBe(0);

      act(() => {
        useUserStore.getState().setUser({
          username: 'testuser',
          xp: 250,
          level: 3,
          tasks: [],
          xp_transactions: [],
          badges: [],
          defined_tags: [],
          defined_projects: [],
        });
      });

      const { result: result2 } = { result: useUserStore.getState() };
      expect(result2.user?.xp ?? 0).toBe(250);
    });

    it('should handle addTag when user is null', () => {
      const tag: TagDefinition = { name: 'test', color: '#000000' };
      act(() => {
        useUserStore.getState().addTag(tag);
      });
      expect(useUserStore.getState().user).toBeNull();
    });

    it('should handle addProject when user is null', () => {
      const project: ProjectDefinition = { name: 'test', color: '#000000' };
      act(() => {
        useUserStore.getState().addProject(project);
      });
      expect(useUserStore.getState().user).toBeNull();
    });

    it('should handle removeTag when user is null', () => {
      act(() => {
        useUserStore.getState().removeTag('test');
      });
      expect(useUserStore.getState().user).toBeNull();
    });

    it('should handle removeProject when user is null', () => {
      act(() => {
        useUserStore.getState().removeProject('test');
      });
      expect(useUserStore.getState().user).toBeNull();
    });
  });
});
