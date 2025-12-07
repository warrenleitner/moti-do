/**
 * Zustand store for user state management.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { User, Badge, XPTransaction, TagDefinition, ProjectDefinition } from '../types';

interface UserState {
  // User data
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  addXP: (amount: number, reason: string, taskId?: string) => void;
  addBadge: (badge: Badge) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  logout: () => void;

  // Tag and project management
  addTag: (tag: TagDefinition) => void;
  removeTag: (name: string) => void;
  addProject: (project: ProjectDefinition) => void;
  removeProject: (name: string) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: null,
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
      }),
      {
        name: 'motido-user-store',
        partialize: (state) => ({
          user: state.user,
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
