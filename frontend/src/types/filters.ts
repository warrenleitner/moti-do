import type { Priority, Difficulty, Duration } from './models';

export type StatusFilter = 'all' | 'active' | 'completed' | 'blocked' | 'future';

export interface TaskFilters {
  status: StatusFilter;
  priorities: Priority[];
  difficulties: Difficulty[];
  durations: Duration[];
  projects: string[];
  tags: string[];
  search?: string;
  maxDueDate?: string; // ISO date string - show tasks due on or before this date
}
