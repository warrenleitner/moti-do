/**
 * TypeScript types mirroring the Python models in motido.core.models
 */

// Use const objects instead of enums (required by erasableSyntaxOnly)
export const Priority = {
  TRIVIAL: "trivial",
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  CRITICAL: "critical",
} as const;
export type Priority = typeof Priority[keyof typeof Priority];

export const Difficulty = {
  TRIVIAL: "trivial",
  EASY: "easy",
  MEDIUM: "medium",
  HARD: "hard",
  EXTREME: "extreme",
} as const;
export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export const Duration = {
  MINUTE: "minute",
  SHORT: "short",
  MEDIUM: "medium",
  LONG: "long",
  MARATHON: "marathon",
} as const;
export type Duration = typeof Duration[keyof typeof Duration];

export const RecurrenceType = {
  STRICT: "strict",
  FROM_COMPLETION: "from_completion",
  FROM_DUE_DATE: "from_due_date",
} as const;
export type RecurrenceType = typeof RecurrenceType[keyof typeof RecurrenceType];

export interface Subtask {
  text: string;
  complete: boolean;
}

export interface HistoryEntry {
  date: string; // ISO date string
  action: string;
  details?: string;
}

export interface Task {
  id: string;
  title: string;
  text_description?: string;
  creation_date: string; // ISO datetime string
  completion_date?: string;
  start_date?: string;
  due_date?: string;
  priority: Priority;
  difficulty: Difficulty;
  duration: Duration;
  icon?: string;
  is_complete: boolean;
  tags: string[];
  subtasks: Subtask[];
  dependencies: string[];
  project?: string;
  is_habit: boolean;
  recurrence_rule?: string;
  recurrence_type?: RecurrenceType;
  habit_start_delta?: number;
  parent_habit_id?: string;
  streak_current: number;
  streak_best: number;
  history: HistoryEntry[];
}

export interface XPTransaction {
  date: string; // ISO datetime string
  amount: number;
  reason: string;
  task_id?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  glyph: string;
  earned_date: string; // ISO datetime string
}

export interface TagDefinition {
  name: string;
  color?: string;
  icon?: string;
}

export interface ProjectDefinition {
  name: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface User {
  username: string;
  xp: number;
  level: number;
  tasks: Task[];
  xp_transactions: XPTransaction[];
  badges: Badge[];
  defined_tags: TagDefinition[];
  defined_projects: ProjectDefinition[];
  vacation_mode_start?: string;
  vacation_mode_end?: string;
}

// Priority emoji mapping
export const PriorityEmoji: Record<Priority, string> = {
  [Priority.TRIVIAL]: "⬜",
  [Priority.LOW]: "🟦",
  [Priority.MEDIUM]: "🟨",
  [Priority.HIGH]: "🟧",
  [Priority.CRITICAL]: "🟥",
};

// Difficulty labels
export const DifficultyLabel: Record<Difficulty, string> = {
  [Difficulty.TRIVIAL]: "Trivial",
  [Difficulty.EASY]: "Easy",
  [Difficulty.MEDIUM]: "Medium",
  [Difficulty.HARD]: "Hard",
  [Difficulty.EXTREME]: "Extreme",
};

// Duration labels
export const DurationLabel: Record<Duration, string> = {
  [Duration.MINUTE]: "< 5 min",
  [Duration.SHORT]: "5-15 min",
  [Duration.MEDIUM]: "15-60 min",
  [Duration.LONG]: "1-4 hours",
  [Duration.MARATHON]: "4+ hours",
};
