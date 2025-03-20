import { v4 as uuidv4 } from 'uuid';

export type ImportanceLevel = 'Low' | 'Medium' | 'High' | 'Defcon One';
export type DifficultyLevel = 'Trivial' | 'Low' | 'Medium' | 'High' | 'Herculean';
export type DurationLevel = 'Trivial' | 'Short' | 'Medium' | 'Long' | 'Odysseyan';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}

export interface TaskHistory {
  id: string;
  timestamp: Date;
  action: string;
  previousState?: Partial<Task>;
  newState?: Partial<Task>;
}

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  startDate?: Date;
  dueDate?: Date;
  createdAt: Date;
  completedAt?: Date;
  importance: ImportanceLevel;
  difficulty: DifficultyLevel;
  duration: DurationLevel;
  dependencies: string[]; // IDs of tasks that this task depends on
  subtasks: Subtask[];
  tags: string[]; // IDs of tags
  projectId?: string; // ID of the project
  isNext: boolean;
  inProgress: boolean;
  score: number;
  history: TaskHistory[];
}

export function createTask(taskData: Partial<Task>): Task {
  return {
    id: uuidv4(),
    title: taskData.title || '',
    description: taskData.description,
    icon: taskData.icon,
    startDate: taskData.startDate,
    dueDate: taskData.dueDate,
    createdAt: new Date(),
    completedAt: undefined,
    importance: taskData.importance || 'Medium',
    difficulty: taskData.difficulty || 'Medium',
    duration: taskData.duration || 'Medium',
    dependencies: taskData.dependencies || [],
    subtasks: taskData.subtasks || [],
    tags: taskData.tags || [],
    projectId: taskData.projectId,
    isNext: taskData.isNext || false,
    inProgress: taskData.inProgress || false,
    score: 0, // Will be calculated by the scoring system
    history: [],
  };
}

export function createSubtask(title: string): Subtask {
  return {
    id: uuidv4(),
    title,
    completed: false,
    createdAt: new Date(),
  };
} 