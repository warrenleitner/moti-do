import { v4 as uuidv4 } from 'uuid';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Badge {
  id: string;
  name: string;
  description: string;
  glyph: string;
  dateEarned: Date;
}

export interface XPTransaction {
  id: string;
  amount: number;
  source: 'task_completion' | 'habit_completion' | 'task_penalty' | 'habit_penalty' | 'manual_adjustment';
  description: string;
  timestamp: Date;
  associatedId?: string; // ID of task or habit
}

export interface ScoringWeights {
  importance: Record<string, number>;
  difficulty: Record<string, number>;
  duration: Record<string, number>;
  dueDate: number;
  startDate: number;
  taskAge: number;
  isNext: number;
  inProgress: number;
  dependencyMultiplier: number;
  habitStreakMultiplier: number;
  baseTaskWeight: number;
}

export interface ProjectScoreMultiplier {
  projectId: string;
  multiplier: number;
}

export interface TagScoreMultiplier {
  tagId: string;
  multiplier: number;
}

export interface UserPreferences {
  theme: ThemeMode;
  defaultView: 'tasks' | 'habits' | 'calendar' | 'stats';
  scoringWeights: ScoringWeights;
  projectMultipliers: ProjectScoreMultiplier[];
  tagMultipliers: TagScoreMultiplier[];
  vacationMode: boolean;
  defaultXPScale: number;
  subtaskDisplay: 'hidden' | 'nested' | 'standalone';
  notificationsEnabled: boolean;
  habitReminders: boolean;
  taskReminders: boolean;
}

export interface User {
  id: string;
  xp: number;
  xpTransactions: XPTransaction[];
  badges: Badge[];
  preferences: UserPreferences;
}

export function createDefaultUser(): User {
  return {
    id: uuidv4(),
    xp: 0,
    xpTransactions: [],
    badges: [],
    preferences: {
      theme: 'system',
      defaultView: 'tasks',
      scoringWeights: {
        importance: {
          'Low': 0.5,
          'Medium': 1,
          'High': 2,
          'Defcon One': 4
        },
        difficulty: {
          'Trivial': 0,
          'Low': 0.5,
          'Medium': 1,
          'High': 2,
          'Herculean': 3
        },
        duration: {
          'Trivial': 0,
          'Short': 0.5,
          'Medium': 1,
          'Long': 2,
          'Odysseyan': 3
        },
        dueDate: 1,
        startDate: 0.2,
        taskAge: 0.1,
        isNext: 2,
        inProgress: 1.5,
        dependencyMultiplier: 0.5,
        habitStreakMultiplier: 0.1,
        baseTaskWeight: 1
      },
      projectMultipliers: [],
      tagMultipliers: [],
      vacationMode: false,
      defaultXPScale: 1.0,
      subtaskDisplay: 'nested',
      notificationsEnabled: false,
      habitReminders: false,
      taskReminders: false
    }
  };
} 