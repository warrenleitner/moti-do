import type { Task } from '../types/models';

export type LifecycleStatus = 'completed' | 'blocked' | 'future' | 'active';

const parseProcessingDate = (lastProcessedDate?: string): Date | null => {
  if (!lastProcessedDate) return null;
  const [year, month, day] = lastProcessedDate.split('-').map(Number);
  return new Date(year, month - 1, day + 1);
};

export const isTaskFuture = (task: Task, lastProcessedDate?: string): boolean => {
  const currentProcessingDate = parseProcessingDate(lastProcessedDate);
  if (!currentProcessingDate || !task.start_date) return false;

  const startDateStr = task.start_date.includes('T') ? task.start_date.split('T')[0] : task.start_date;
  const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
  const taskStartDate = new Date(sYear, sMonth - 1, sDay);
  return taskStartDate > currentProcessingDate;
};

export const isTaskBlocked = (task: Task, allTasks: Task[]): boolean => {
  if (task.dependencies.length === 0) return false;
  return task.dependencies.some((depId) => {
    const dep = allTasks.find((t) => t.id === depId);
    return dep ? !dep.is_complete : false;
  });
};

export const deriveLifecycleStatus = (
  task: Task,
  opts: { allTasks: Task[]; lastProcessedDate?: string }
): LifecycleStatus => {
  if (task.is_complete) return 'completed';
  if (isTaskBlocked(task, opts.allTasks)) return 'blocked';
  if (isTaskFuture(task, opts.lastProcessedDate)) return 'future';
  return 'active';
};
