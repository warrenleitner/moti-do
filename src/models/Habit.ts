import { v4 as uuidv4 } from 'uuid';
import { 
  ImportanceLevel, 
  DifficultyLevel, 
  DurationLevel,
  Subtask,
  TaskHistory
} from './Task';

export type RecurrenceType = 
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'custom';

export type WeekDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface RecurrenceRule {
  type: RecurrenceType;
  interval?: number; // every X days/weeks/months/years
  weekDays?: WeekDay[]; // for weekly recurrence
  dayOfMonth?: number; // for monthly recurrence
  monthOfYear?: number; // for yearly recurrence
  isLastDay?: boolean; // for monthly (last day of month)
  advanceDisplay?: number; // days before next occurrence to display
}

export type SubtaskRecurrenceOption = 
  | 'default' // new recurrence starts only after all subtasks are complete
  | 'partial' // create a new parent task containing only completed subtasks
  | 'always'; // generate a completely new task with all subtasks regardless of prior completion

export interface HabitStreak {
  current: number;
  best: number;
  completed: Record<string, boolean>; // date string -> completed
  totalCompletions: number;
  totalOccurrences: number;
}

export interface HabitCompletion {
  id: string;
  date: Date;
  completed: boolean;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  startDate?: Date;
  dueDate?: Date;
  createdAt: Date;
  importance: ImportanceLevel;
  difficulty: DifficultyLevel;
  duration: DurationLevel;
  dependencies: string[];
  subtasks: Subtask[];
  tags: string[];
  projectId?: string;
  isNext: boolean;
  inProgress: boolean;
  score: number;
  history: TaskHistory[];
  recurrence: RecurrenceRule;
  subtaskRecurrenceOption: SubtaskRecurrenceOption;
  streak: HabitStreak;
  completions: HabitCompletion[];
}

export function createHabit(habitData: Partial<Habit>): Habit {
  return {
    id: uuidv4(),
    title: habitData.title || '',
    description: habitData.description,
    icon: habitData.icon,
    startDate: habitData.startDate,
    dueDate: habitData.dueDate,
    createdAt: new Date(),
    importance: habitData.importance || 'Medium',
    difficulty: habitData.difficulty || 'Medium',
    duration: habitData.duration || 'Medium',
    dependencies: habitData.dependencies || [],
    subtasks: habitData.subtasks || [],
    tags: habitData.tags || [],
    projectId: habitData.projectId,
    isNext: habitData.isNext || false,
    inProgress: habitData.inProgress || false,
    score: 0, // Will be calculated by the scoring system
    history: [],
    recurrence: habitData.recurrence || {
      type: 'daily',
      interval: 1,
      advanceDisplay: 0
    },
    subtaskRecurrenceOption: habitData.subtaskRecurrenceOption || 'default',
    streak: {
      current: 0,
      best: 0,
      completed: {},
      totalCompletions: 0,
      totalOccurrences: 0
    },
    completions: []
  };
} 