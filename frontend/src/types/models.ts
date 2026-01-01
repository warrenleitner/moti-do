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

export const SubtaskRecurrenceMode = {
  DEFAULT: "default",
  PARTIAL: "partial",
  ALWAYS: "always",
} as const;
export type SubtaskRecurrenceMode =
  (typeof SubtaskRecurrenceMode)[keyof typeof SubtaskRecurrenceMode];

export interface Subtask {
  text: string;
  complete: boolean;
}

export interface HistoryEntry {
  timestamp: string; // ISO datetime string
  field: string;
  old_value: string | null;
  new_value: string | null;
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
  score: number; // Calculated XP value for this task
  penalty_score: number; // Penalty if not completed today
  net_score: number; // XP + penalty avoided
  subtask_recurrence_mode?: SubtaskRecurrenceMode;
  // Counter task fields
  target_count?: number; // Target count to reach (undefined = not a counter task)
  current_count: number; // Current progress toward target (default 0)
}

export interface TaskCompletionResponse {
  task: Task;
  xp_earned: number;
  next_instance: Task | null;
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
  id: string;
  name: string;
  color?: string;
  icon?: string;
  multiplier?: number;
}

export interface ProjectDefinition {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  description?: string;
  multiplier?: number;
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

// Priority descriptions for info tooltips
export const PriorityDescription: Record<Priority, string> = {
  [Priority.TRIVIAL]: "If this never happens even I won't notice (ordering new shoes)",
  [Priority.LOW]: "I would like this to happen but it's no big deal if it doesn't (doing dishes, making coffee)",
  [Priority.MEDIUM]: "I really need to make this happen, but if it doesn't, it's not the end of the world (laundry, nighttime routine)",
  [Priority.HIGH]: "Important with noticeable consequences if missed (birthdays, returns, work tasks)",
  [Priority.DEFCON_ONE]: "Serious consequences if this does not happen on time (urgent deadlines, critical commitments)",
};

// Difficulty descriptions for info tooltips
export const DifficultyDescription: Record<Difficulty, string> = {
  [Difficulty.TRIVIAL]: "I could do this in my sleep (Duolingo, changing contacts)",
  [Difficulty.LOW]: "Very simple and easy (dishes, nighttime routine)",
  [Difficulty.MEDIUM]: "Requires some effort but manageable (grocery shopping, cleaning)",
  [Difficulty.HIGH]: "Hard but not unreasonably so (laundry, large homeowner tasks)",
  [Difficulty.HERCULEAN]: "I really need to stretch myself to do this (asking for a raise, doctor visits)",
};

// Duration descriptions for info tooltips
export const DurationDescription: Record<Duration, string> = {
  [Duration.MINUSCULE]: "≤ 15 minutes",
  [Duration.SHORT]: "15 min – 30 min",
  [Duration.MEDIUM]: "30 min – 1 hour",
  [Duration.LONG]: "1 – 3 hours",
  [Duration.ODYSSEYAN]: "> 3 hours",
};
