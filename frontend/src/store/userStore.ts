/**
 * Zustand store for user state management with API integration.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, Badge, XPTransaction, TagDefinition, ProjectDefinition } from '../types';
import { userApi, systemApi, type UserStats, type SystemStatus } from '../services/api';

interface UserState {
  // User data
  user: User | null;
  stats: UserStats | null;
  systemStatus: SystemStatus | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Local actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  addXP: (amount: number, reason: string, taskId?: string) => void;
  addBadge: (badge: Badge) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Tag and project management (local)
  addTag: (tag: TagDefinition) => void;
  removeTag: (name: string) => void;
  addProject: (project: ProjectDefinition) => void;
  removeProject: (name: string) => void;

  // API actions
  fetchProfile: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchBadges: () => Promise<void>;
  fetchSystemStatus: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchProjects: () => Promise<void>;
  advanceDate: (params?: { days?: number; toDate?: string }) => Promise<void>;
  toggleVacation: (enable: boolean) => Promise<void>;
  withdrawXP: (amount: number, description?: string) => Promise<void>;
  initializeUser: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        stats: null,
        systemStatus: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,

        // User actions
        setUser: (user) =>
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
          }),

        updateUser: (updates) =>
          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null,
          })),

        addXP: (amount, reason, taskId) =>
          set((state) => {
            if (!state.user) return state;

            const transaction: XPTransaction = {
              date: new Date().toISOString(),
              amount,
              reason,
              task_id: taskId,
            };

            // Calculate new level (simple formula: level = floor(xp / 100))
            const newXP = state.user.xp + amount;
            const newLevel = Math.floor(newXP / 100) + 1;

            return {
              user: {
                ...state.user,
                xp: newXP,
                level: newLevel,
                xp_transactions: [...state.user.xp_transactions, transaction],
              },
            };
          }),

        addBadge: (badge) =>
          set((state) => {
            if (!state.user) return state;
            // Don't add duplicate badges
            if (state.user.badges.some((b) => b.id === badge.id)) return state;
            return {
              user: {
                ...state.user,
                badges: [...state.user.badges, badge],
              },
            };
          }),

        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error, isLoading: false }),

        logout: () =>
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          }),

        // Tag management
        addTag: (tag) =>
          set((state) => {
            if (!state.user) return state;
            if (state.user.defined_tags.some((t) => t.name === tag.name)) return state;
            return {
              user: {
                ...state.user,
                defined_tags: [...state.user.defined_tags, tag],
              },
            };
          }),

        removeTag: (name) =>
          set((state) => {
            if (!state.user) return state;
            return {
              user: {
                ...state.user,
                defined_tags: state.user.defined_tags.filter((t) => t.name !== name),
              },
            };
          }),

        // Project management
        addProject: (project) =>
          set((state) => {
            if (!state.user) return state;
            if (state.user.defined_projects.some((p) => p.name === project.name)) return state;
            return {
              user: {
                ...state.user,
                defined_projects: [...state.user.defined_projects, project],
              },
            };
          }),

        removeProject: (name) =>
          set((state) => {
            if (!state.user) return state;
            return {
              user: {
                ...state.user,
                defined_projects: state.user.defined_projects.filter((p) => p.name !== name),
              },
            };
          }),

        // API actions
        fetchProfile: async () => {
          set({ isLoading: true, error: null });
          try {
            const profile = await userApi.getProfile();
            set((state) => ({
              user: state.user
                ? { ...state.user, username: profile.username, xp: profile.total_xp, level: profile.level }
                : {
                    username: profile.username,
                    xp: profile.total_xp,
                    level: profile.level,
                    tasks: [],
                    xp_transactions: [],
                    badges: [],
                    defined_tags: [],
                    defined_projects: [],
                  },
              isAuthenticated: true,
              isLoading: false,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch profile';
            set({ error: message, isLoading: false });
          }
        },

        fetchStats: async () => {
          try {
            const stats = await userApi.getStats();
            set({ stats });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch stats';
            set({ error: message });
          }
        },

        fetchBadges: async () => {
          try {
            const badges = await userApi.getBadges();
            set((state) => ({
              user: state.user
                ? {
                    ...state.user,
                    badges: badges.map((b) => ({
                      id: b.id,
                      name: b.name,
                      description: b.description,
                      glyph: b.glyph,
                      earned_date: b.earned_date || '',
                    })),
                  }
                : null,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch badges';
            set({ error: message });
          }
        },

        fetchSystemStatus: async () => {
          try {
            const status = await systemApi.getStatus();
            set({ systemStatus: status });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch system status';
            set({ error: message });
          }
        },

        fetchTags: async () => {
          try {
            const tags = await userApi.getTags();
            set((state) => ({
              user: state.user
                ? {
                    ...state.user,
                    defined_tags: tags.map((t) => ({
                      id: t.id,
                      name: t.name,
                      color: t.color,
                      multiplier: t.multiplier,
                    })),
                  }
                : null,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch tags';
            set({ error: message });
          }
        },

        fetchProjects: async () => {
          try {
            const projects = await userApi.getProjects();
            set((state) => ({
              user: state.user
                ? {
                    ...state.user,
                    defined_projects: projects.map((p) => ({
                      id: p.id,
                      name: p.name,
                      color: p.color,
                      multiplier: p.multiplier,
                    })),
                  }
                : null,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch projects';
            set({ error: message });
          }
        },

        advanceDate: async (params) => {
          set({ isLoading: true, error: null });
          try {
            const initialPendingDays = get().systemStatus?.pending_days ?? 0;
            const requestedDays = params?.days;

            const shouldLoopUntilCaughtUp =
              !params?.toDate &&
              (requestedDays === undefined ||
                (initialPendingDays > 0 && requestedDays === initialPendingDays));

            const maxIterations = 50;
            let iterations = 0;

            let status = await systemApi.advanceDate({
              days: requestedDays,
              to_date: params?.toDate,
            });
            set({ systemStatus: status });

            while (shouldLoopUntilCaughtUp && status.pending_days > 0) {
              iterations += 1;
              if (iterations >= maxIterations) {
                break;
              }

              status = await systemApi.advanceDate({
                days: status.pending_days,
              });
              set({ systemStatus: status });
            }

            set({ isLoading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to advance date';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        toggleVacation: async (enable) => {
          set({ isLoading: true, error: null });
          try {
            const result = await systemApi.toggleVacation(enable);
            set((state) => ({
              systemStatus: state.systemStatus
                ? { ...state.systemStatus, vacation_mode: result.vacation_mode }
                : null,
              isLoading: false,
            }));
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to toggle vacation mode';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        withdrawXP: async (amount, description) => {
          set({ isLoading: true, error: null });
          try {
            await userApi.withdrawXP(amount, description);
            // Refetch profile to get updated XP
            await get().fetchProfile();
            set({ isLoading: false });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to withdraw XP';
            set({ error: message, isLoading: false });
            throw error;
          }
        },

        initializeUser: async () => {
          set({ isLoading: true, error: null });
          try {
            // Fetch all user data in parallel
            const [profile, stats, badges, tags, projects, systemStatus] = await Promise.all([
              userApi.getProfile(),
              userApi.getStats(),
              userApi.getBadges(),
              userApi.getTags(),
              userApi.getProjects(),
              systemApi.getStatus(),
            ]);

            set({
              user: {
                username: profile.username,
                xp: profile.total_xp,
                level: profile.level,
                tasks: [], // Tasks are managed by taskStore
                xp_transactions: [],
                badges: badges.map((b) => ({
                  id: b.id,
                  name: b.name,
                  description: b.description,
                  glyph: b.glyph,
                  earned_date: b.earned_date || '',
                })),
                defined_tags: tags.map((t) => ({
                  id: t.id,
                  name: t.name,
                  color: t.color,
                  multiplier: t.multiplier,
                })),
                defined_projects: projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  color: p.color,
                  multiplier: p.multiplier,
                })),
              },
              stats,
              systemStatus,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to initialize user';
            set({ error: message, isLoading: false });
            throw error;
          }
        },
      }),
      {
        name: 'motido-user-store',
        partialize: (state) => ({
          user: state.user,
          stats: state.stats,
          systemStatus: state.systemStatus,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'UserStore' }
  )
);

// Selector hooks
export const useUserLevel = () => {
  const { user } = useUserStore();
  return user?.level ?? 1;
};

export const useUserXP = () => {
  const { user } = useUserStore();
  return user?.xp ?? 0;
};

export const useUserBadges = () => {
  const { user } = useUserStore();
  return user?.badges ?? [];
};

export const useUserStats = () => {
  const { stats } = useUserStore();
  return stats;
};

export const useSystemStatus = () => {
  const { systemStatus } = useUserStore();
  return systemStatus;
};

// Selector hooks - simple getters tested indirectly via component tests
/* v8 ignore start */
export const useDefinedTags = () => {
  const { user } = useUserStore();
  return user?.defined_tags ?? [];
};

export const useDefinedProjects = () => {
  const { user } = useUserStore();
  return user?.defined_projects ?? [];
};
/* v8 ignore stop */
