/**
 * TypeScript types mirroring the Python models in motido.core.models
 */

// Use const objects instead of enums (required by erasableSyntaxOnly)
// Values must match Python backend enum values exactly
export const Priority = {
  TRIVIAL: "Trivial",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  DEFCON_ONE: "Defcon One",
} as const;
export type Priority = typeof Priority[keyof typeof Priority];

export const Difficulty = {
  TRIVIAL: "Trivial",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  HERCULEAN: "Herculean",
} as const;
export type Difficulty = typeof Difficulty[keyof typeof Difficulty];

export const Duration = {
  MINUSCULE: "Minuscule",
  SHORT: "Short",
  MEDIUM: "Medium",
  LONG: "Long",
  ODYSSEYAN: "Odysseyan",
} as const;
export type Duration = typeof Duration[keyof typeof Duration];

export const RecurrenceType = {
  STRICT: "Strict",
  FROM_COMPLETION: "From Completion",
  FROM_DUE_DATE: "From Due Date",
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

export const TaskStatus = {
  BACKLOG: "backlog",
  TODO: "todo",
  IN_PROGRESS: "in_progress",
  BLOCKED: "blocked",
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export interface Task {
  id: string;
  title: string;
  text_description?: string;
  description?: string; // Alias for text_description
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
  status?: TaskStatus; // For Kanban board
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

// Priority emoji mapping (matches backend Priority.emoji())
export const PriorityEmoji: Record<Priority, string> = {
  [Priority.TRIVIAL]: "🔹",
  [Priority.LOW]: "🟢",
  [Priority.MEDIUM]: "🟡",
  [Priority.HIGH]: "🟠",
  [Priority.DEFCON_ONE]: "🔴",
};

// Difficulty emoji mapping (matches backend Difficulty.emoji())
export const DifficultyEmoji: Record<Difficulty, string> = {
  [Difficulty.TRIVIAL]: "🍭",
  [Difficulty.LOW]: "🪶",
  [Difficulty.MEDIUM]: "🧱",
  [Difficulty.HIGH]: "🧗",
  [Difficulty.HERCULEAN]: "🦾",
};

// Difficulty labels
export const DifficultyLabel: Record<Difficulty, string> = {
  [Difficulty.TRIVIAL]: "Trivial",
  [Difficulty.LOW]: "Low",
  [Difficulty.MEDIUM]: "Medium",
  [Difficulty.HIGH]: "High",
  [Difficulty.HERCULEAN]: "Herculean",
};

// Duration emoji mapping (matches backend Duration.emoji())
export const DurationEmoji: Record<Duration, string> = {
  [Duration.MINUSCULE]: "💨",
  [Duration.SHORT]: "⏳",
  [Duration.MEDIUM]: "🕰️",
  [Duration.LONG]: "⏱️",
  [Duration.ODYSSEYAN]: "♾️",
};

// Duration labels
export const DurationLabel: Record<Duration, string> = {
  [Duration.MINUSCULE]: "Minuscule",
  [Duration.SHORT]: "Short",
  [Duration.MEDIUM]: "Medium",
  [Duration.LONG]: "Long",
  [Duration.ODYSSEYAN]: "Odysseyan",
};
