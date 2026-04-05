import type { Priority, Difficulty, Duration } from './models';

export type StatusFilter = 'all' | 'active' | 'completed' | 'blocked' | 'future';

export interface TaskFilters {
  statuses: StatusFilter[];
  priorities: Priority[];
  difficulties: Difficulty[];
  durations: Duration[];
  projects: string[];
  tags: string[];
  search?: string;
  minDueDate?: string; // ISO date string - show tasks due on or after this date
  maxDueDate?: string; // ISO date string - show tasks due on or before this date
  minStartDate?: string; // ISO date string - show tasks starting on or after this date
  maxStartDate?: string; // ISO date string - show tasks starting on or before this date
}
