import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { format, isAfter, isBefore, differenceInDays } from 'date-fns';

import { Task, Tag, Project, createTask, Subtask } from '@/models/Task';
import { Habit, createHabit } from '@/models/Habit';
import { User, createDefaultUser, XPTransaction } from '@/models/User';

interface AppState {
  tasks: Task[];
  habits: Habit[];
  tags: Tag[];
  projects: Project[];
  user: User;

  // Task actions
  addTask: (task: Partial<Task>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  completeTask: (id: string, completed: boolean) => void;
  addSubtask: (taskId: string, subtaskTitle: string) => void;
  completeSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  setTaskAsNext: (id: string) => void;
  setTaskInProgress: (id: string, inProgress: boolean) => void;
  
  // Habit actions
  addHabit: (habit: Partial<Habit>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  completeHabit: (id: string, completed: boolean, date?: Date) => void;
  
  // Tag and project actions
  addTag: (name: string, color: string) => void;
  updateTag: (id: string, updates: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addProject: (name: string, color: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  
  // User and XP actions
  updateUserPreferences: (updates: Partial<User['preferences']>) => void;
  addXP: (amount: number, source: XPTransaction['source'], description: string, associatedId?: string) => void;
  withdrawXP: (amount: number, description: string) => void;
  toggleVacationMode: () => void;
  
  // Calculation methods
  calculateTaskScore: (task: Task) => number;
  calculateHabitScore: (habit: Habit) => number;
  recalculateAllScores: () => void;
  
  // Filtered getters
  getActiveTasks: () => Task[];
  getFutureTasks: () => Task[];
  getCompletedTasks: () => Task[];
  getTasksDueToday: () => Task[];
  getActiveHabits: () => Habit[];
  getHabitsDueToday: () => Habit[];
  getCompletedHabitsToday: () => Habit[];
  getFutureHabits: () => Habit[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      tasks: [],
      habits: [],
      tags: [],
      projects: [],
      user: createDefaultUser(),

      // Task actions
      addTask: (taskData) => {
        const task = createTask(taskData);
        const updatedTask = {
          ...task,
          score: get().calculateTaskScore(task),
        };
        
        set((state) => ({
          tasks: [...state.tasks, updatedTask],
        }));
        
        // Add task creation to history
        get().updateTask(updatedTask.id, {
          history: [
            {
              id: uuidv4(),
              timestamp: new Date(),
              action: 'created',
              newState: updatedTask,
            },
          ],
        });
      },
      
      updateTask: (id, updates) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === id);
          if (taskIndex === -1) return state;
          
          const oldTask = state.tasks[taskIndex];
          const history = [...oldTask.history];
          
          // Add update to history
          history.push({
            id: uuidv4(),
            timestamp: new Date(),
            action: 'updated',
            previousState: oldTask,
            newState: updates,
          });
          
          const updatedTask = {
            ...oldTask,
            ...updates,
            history,
          };
          
          const updatedTasks = [...state.tasks];
          updatedTasks[taskIndex] = {
            ...updatedTask,
            score: get().calculateTaskScore(updatedTask),
          };
          
          return { tasks: updatedTasks };
        });
      },
      
      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },
      
      completeTask: (id, completed) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === id);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const updatedTasks = [...state.tasks];
          
          updatedTasks[taskIndex] = {
            ...task,
            completedAt: completed ? new Date() : undefined,
            isNext: completed ? false : task.isNext,
            inProgress: completed ? false : task.inProgress
          };
          
          // Add XP if completing the task
          if (completed && !task.completedAt) {
            // For tasks with subtasks, we only add the final portion of XP
            // The rest was already awarded when completing individual subtasks
            let xpToAdd = task.score;
            
            if (task.subtasks.length > 0) {
              xpToAdd = Math.round(task.score / (task.subtasks.length + 1));
            }
            
            get().addXP(
              xpToAdd,
              'task_completion',
              `Completed task: ${task.title}`,
              task.id
            );
          }
          
          return { tasks: updatedTasks };
        });
      },
      
      addSubtask: (taskId, subtaskTitle) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const newSubtask = {
            id: uuidv4(),
            title: subtaskTitle,
            completed: false,
            createdAt: new Date(),
          };
          
          const updatedTasks = [...state.tasks];
          updatedTasks[taskIndex] = {
            ...task,
            subtasks: [...task.subtasks, newSubtask],
          };
          
          return { tasks: updatedTasks };
        });
      },
      
      completeSubtask: (taskId, subtaskId, completed) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const subtaskIndex = task.subtasks.findIndex((s) => s.id === subtaskId);
          if (subtaskIndex === -1) return state;
          
          const updatedSubtasks = [...task.subtasks];
          updatedSubtasks[subtaskIndex] = {
            ...updatedSubtasks[subtaskIndex],
            completed,
            completedAt: completed ? new Date() : undefined,
          };
          
          const updatedTasks = [...state.tasks];
          updatedTasks[taskIndex] = {
            ...task,
            subtasks: updatedSubtasks,
          };
          
          // If completing a subtask, add a fraction of the task's XP
          if (completed && !task.subtasks[subtaskIndex].completed) {
            const subtaskXP = Math.round(task.score / (task.subtasks.length + 1));
            get().addXP(
              subtaskXP,
              'task_completion',
              `Completed subtask: ${task.subtasks[subtaskIndex].title} (${task.title})`,
              task.id
            );
          }
          
          return { tasks: updatedTasks };
        });
      },
      
      updateSubtask: (taskId, subtaskId, updates) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const subtaskIndex = task.subtasks.findIndex((s) => s.id === subtaskId);
          if (subtaskIndex === -1) return state;
          
          const updatedSubtasks = [...task.subtasks];
          updatedSubtasks[subtaskIndex] = {
            ...updatedSubtasks[subtaskIndex],
            ...updates,
          };
          
          const updatedTasks = [...state.tasks];
          updatedTasks[taskIndex] = {
            ...task,
            subtasks: updatedSubtasks,
          };
          
          return { tasks: updatedTasks };
        });
      },
      
      deleteSubtask: (taskId, subtaskId) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === taskId);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const updatedTasks = [...state.tasks];
          
          updatedTasks[taskIndex] = {
            ...task,
            subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
          };
          
          return { tasks: updatedTasks };
        });
      },
      
      setTaskAsNext: (id) => {
        set((state) => {
          // First, unset any current "next" task
          const updatedTasks = state.tasks.map((task) => ({
            ...task,
            isNext: task.id === id,
            score: task.id === id 
              ? get().calculateTaskScore({ ...task, isNext: true }) 
              : task.isNext 
                ? get().calculateTaskScore({ ...task, isNext: false })
                : task.score,
          }));
          
          return { tasks: updatedTasks };
        });
      },
      
      setTaskInProgress: (id, inProgress) => {
        set((state) => {
          const taskIndex = state.tasks.findIndex((t) => t.id === id);
          if (taskIndex === -1) return state;
          
          const task = state.tasks[taskIndex];
          const updatedTasks = [...state.tasks];
          
          updatedTasks[taskIndex] = {
            ...task,
            inProgress,
            score: get().calculateTaskScore({ ...task, inProgress }),
          };
          
          return { tasks: updatedTasks };
        });
      },
      
      // Habit actions
      addHabit: (habitData) => {
        const habit = createHabit(habitData);
        const updatedHabit = {
          ...habit,
          score: get().calculateHabitScore(habit),
        };
        
        set((state) => ({
          habits: [...state.habits, updatedHabit],
        }));
        
        // Add habit creation to history
        get().updateHabit(updatedHabit.id, {
          history: [
            {
              id: uuidv4(),
              timestamp: new Date(),
              action: 'created',
              newState: updatedHabit,
            },
          ],
        });
      },
      
      updateHabit: (id, updates) => {
        set((state) => {
          const habitIndex = state.habits.findIndex((h) => h.id === id);
          if (habitIndex === -1) return state;
          
          const oldHabit = state.habits[habitIndex];
          const history = [...oldHabit.history];
          
          // Add update to history
          history.push({
            id: uuidv4(),
            timestamp: new Date(),
            action: 'updated',
            previousState: oldHabit,
            newState: updates,
          });
          
          const updatedHabit = {
            ...oldHabit,
            ...updates,
            history,
          };
          
          const updatedHabits = [...state.habits];
          updatedHabits[habitIndex] = {
            ...updatedHabit,
            score: get().calculateHabitScore(updatedHabit),
          };
          
          return { habits: updatedHabits };
        });
      },
      
      deleteHabit: (id) => {
        set((state) => ({
          habits: state.habits.filter((h) => h.id !== id),
        }));
      },
      
      completeHabit: (id, completed, date = new Date()) => {
        set((state) => {
          const habitIndex = state.habits.findIndex((h) => h.id === id);
          if (habitIndex === -1) return state;
          
          const habit = state.habits[habitIndex];
          const updatedHabits = [...state.habits];
          
          const dateStr = format(date, 'yyyy-MM-dd');
          
          // Update streak information
          let streak = { ...habit.streak };
          if (completed) {
            streak.completed[dateStr] = true;
            streak.totalCompletions += 1;
            
            // Update current streak
            streak.current += 1;
            if (streak.current > streak.best) {
              streak.best = streak.current;
            }
          } else {
            if (streak.completed[dateStr]) {
              streak.totalCompletions -= 1;
            }
            streak.completed[dateStr] = false;
            streak.current = 0;
          }
          
          const newCompletion = {
            id: uuidv4(),
            date,
            completed,
          };
          
          // Replace existing completion for the same date or add new one
          const existingCompletionIndex = habit.completions.findIndex(
            (c) => format(new Date(c.date), 'yyyy-MM-dd') === dateStr
          );
          
          const updatedCompletions = existingCompletionIndex !== -1
            ? [
                ...habit.completions.slice(0, existingCompletionIndex),
                newCompletion,
                ...habit.completions.slice(existingCompletionIndex + 1),
              ]
            : [...habit.completions, newCompletion];
          
          updatedHabits[habitIndex] = {
            ...habit,
            streak,
            completions: updatedCompletions,
          };
          
          // Add XP if completing the habit
          if (completed) {
            get().addXP(
              habit.score,
              'habit_completion',
              `Completed habit: ${habit.title}`,
              habit.id
            );
          }
          
          return { habits: updatedHabits };
        });
      },
      
      // Tag and project actions
      addTag: (name, color) => {
        set((state) => ({
          tags: [
            ...state.tags,
            {
              id: uuidv4(),
              name,
              color,
            },
          ],
        }));
      },
      
      updateTag: (id, updates) => {
        set((state) => ({
          tags: state.tags.map((tag) =>
            tag.id === id ? { ...tag, ...updates } : tag
          ),
        }));
      },
      
      deleteTag: (id) => {
        set((state) => ({
          tags: state.tags.filter((tag) => tag.id !== id),
          tasks: state.tasks.map((task) => ({
            ...task,
            tags: task.tags.filter((tagId) => tagId !== id),
          })),
          habits: state.habits.map((habit) => ({
            ...habit,
            tags: habit.tags.filter((tagId) => tagId !== id),
          })),
        }));
      },
      
      addProject: (name, color) => {
        set((state) => ({
          projects: [
            ...state.projects,
            {
              id: uuidv4(),
              name,
              color,
            },
          ],
        }));
      },
      
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === id ? { ...project, ...updates } : project
          ),
        }));
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== id),
          tasks: state.tasks.map((task) => ({
            ...task,
            projectId: task.projectId === id ? undefined : task.projectId,
          })),
          habits: state.habits.map((habit) => ({
            ...habit,
            projectId: habit.projectId === id ? undefined : habit.projectId,
          })),
        }));
      },
      
      // User and XP actions
      updateUserPreferences: (updates) => {
        set((state) => ({
          user: {
            ...state.user,
            preferences: {
              ...state.user.preferences,
              ...updates,
            },
          },
        }));
      },
      
      addXP: (amount, source, description, associatedId) => {
        const transaction: XPTransaction = {
          id: uuidv4(),
          amount,
          source,
          description,
          timestamp: new Date(),
          associatedId,
        };
        
        set((state) => ({
          user: {
            ...state.user,
            xp: state.user.xp + amount,
            xpTransactions: [transaction, ...state.user.xpTransactions],
          },
        }));
      },
      
      withdrawXP: (amount, description) => {
        const transaction: XPTransaction = {
          id: uuidv4(),
          amount: -amount,
          source: 'manual_adjustment',
          description,
          timestamp: new Date(),
        };
        
        set((state) => ({
          user: {
            ...state.user,
            xp: state.user.xp - amount,
            xpTransactions: [transaction, ...state.user.xpTransactions],
          },
        }));
      },
      
      toggleVacationMode: () => {
        set((state) => ({
          user: {
            ...state.user,
            preferences: {
              ...state.user.preferences,
              vacationMode: !state.user.preferences.vacationMode,
            },
          },
        }));
      },
      
      // Calculation methods
      calculateTaskScore: (task) => {
        const { scoringWeights } = get().user.preferences;
        if (get().user.preferences.vacationMode) return 0;
        
        let score = 0;
        
        // Importance
        score += scoringWeights.importance[task.importance] || 0;
        
        // Difficulty
        score += scoringWeights.difficulty[task.difficulty] || 0;
        
        // Duration
        score += scoringWeights.duration[task.duration] || 0;
        
        // Due date proximity
        if (task.dueDate) {
          const daysUntilDue = differenceInDays(task.dueDate, new Date());
          if (daysUntilDue < 0) {
            // Overdue
            score += scoringWeights.dueDate * (Math.abs(daysUntilDue) + 1);
          } else if (daysUntilDue <= 7) {
            // Due within a week
            score += scoringWeights.dueDate * (1 - daysUntilDue / 7);
          }
        }
        
        // Start date boost
        if (task.startDate && isAfter(new Date(), task.startDate)) {
          score += scoringWeights.startDate;
        }
        
        // Task age boost
        if (task.createdAt) {
          const taskAgeInDays = differenceInDays(new Date(), task.createdAt);
          score += scoringWeights.taskAge * Math.min(taskAgeInDays / 30, 1);
        }
        
        // Status flag boosts
        if (task.isNext) {
          score += scoringWeights.isNext;
        }
        
        if (task.inProgress) {
          score += scoringWeights.inProgress;
        }
        
        // Apply base task weight multiplier
        score *= (scoringWeights.baseTaskWeight || 1);
        
        // Project multiplier
        if (task.projectId) {
          const projectMultiplier = get().user.preferences.projectMultipliers.find(
            (pm) => pm.projectId === task.projectId
          );
          if (projectMultiplier) {
            score *= projectMultiplier.multiplier;
          }
        }
        
        // Tags multipliers
        if (task.tags.length > 0) {
          let tagMultiplier = 1;
          task.tags.forEach((tagId) => {
            const multiplier = get().user.preferences.tagMultipliers.find(
              (tm) => tm.tagId === tagId
            );
            if (multiplier) {
              tagMultiplier *= multiplier.multiplier;
            }
          });
          score *= tagMultiplier;
        }
        
        // Dependency boost
        const dependentTasks = get().tasks.filter((t) => 
          t.dependencies.includes(task.id)
        );
        
        if (dependentTasks.length > 0) {
          const dependencyBoost = dependentTasks.reduce(
            (sum, depTask) => sum + depTask.score * scoringWeights.dependencyMultiplier,
            0
          );
          score += dependencyBoost;
        }
        
        return Math.round(score * 10) / 10;
      },
      
      calculateHabitScore: (habit) => {
        const { scoringWeights } = get().user.preferences;
        if (get().user.preferences.vacationMode) return 0;
        
        let score = 0;
        
        // Base score calculated like a task
        score += scoringWeights.importance[habit.importance] || 0;
        score += scoringWeights.difficulty[habit.difficulty] || 0;
        score += scoringWeights.duration[habit.duration] || 0;
        
        // Streak multiplier
        score += habit.streak.current * scoringWeights.habitStreakMultiplier;
        
        // Project multiplier
        if (habit.projectId) {
          const projectMultiplier = get().user.preferences.projectMultipliers.find(
            (pm) => pm.projectId === habit.projectId
          );
          if (projectMultiplier) {
            score *= projectMultiplier.multiplier;
          }
        }
        
        // Tags multipliers
        if (habit.tags.length > 0) {
          let tagMultiplier = 1;
          habit.tags.forEach((tagId) => {
            const multiplier = get().user.preferences.tagMultipliers.find(
              (tm) => tm.tagId === tagId
            );
            if (multiplier) {
              tagMultiplier *= multiplier.multiplier;
            }
          });
          score *= tagMultiplier;
        }
        
        return Math.round(score * 10) / 10;
      },
      
      recalculateAllScores: () => {
        set((state) => ({
          tasks: state.tasks.map((task) => ({
            ...task,
            score: get().calculateTaskScore(task),
          })),
          habits: state.habits.map((habit) => ({
            ...habit,
            score: get().calculateHabitScore(habit),
          })),
        }));
      },
      
      // Filtered getters
      getActiveTasks: () => {
        return get().tasks.filter((task) => {
          // Not completed
          if (task.completedAt) return false;
          
          // Not in the future (if it has a start date)
          if (task.startDate && isBefore(new Date(), task.startDate)) return false;
          
          // No incomplete dependencies
          const hasIncompleteDependencies = task.dependencies.some((depId) => {
            const depTask = get().tasks.find((t) => t.id === depId);
            return depTask && !depTask.completedAt;
          });
          
          return !hasIncompleteDependencies;
        });
      },
      
      getFutureTasks: () => {
        return get().tasks.filter((task) => {
          // Not completed
          if (task.completedAt) return false;
          
          // Has a start date in the future
          if (task.startDate && isBefore(new Date(), task.startDate)) return true;
          
          return false;
        });
      },
      
      getCompletedTasks: () => {
        return get().tasks.filter((task) => task.completedAt !== undefined);
      },
      
      getTasksDueToday: () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
        
        return get().tasks.filter((task) => {
          if (task.completedAt) return false;
          if (!task.dueDate) return false;
          
          // Due date is today
          return (
            isAfter(task.dueDate, startOfDay) && 
            isBefore(task.dueDate, endOfDay)
          );
        });
      },
      
      getActiveHabits: () => {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        return get().habits.filter((habit) => {
          // Not in the future (if it has a start date)
          if (habit.startDate && isBefore(new Date(), habit.startDate)) return false;
          
          // Skip if already completed today
          const completedToday = habit.completions.some(
            (c) => format(new Date(c.date), 'yyyy-MM-dd') === todayStr && c.completed
          );
          if (completedToday) return false;
          
          return true;
        });
      },
      
      getHabitsDueToday: () => {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        return get().habits.filter((habit) => {
          // Skip if already completed today
          const completedToday = habit.completions.some(
            (c) => format(new Date(c.date), 'yyyy-MM-dd') === todayStr && c.completed
          );
          if (completedToday) return false;
          
          // Skip if in the future
          if (habit.startDate && isBefore(today, habit.startDate)) return false;
          
          // Check recurrence pattern
          const { recurrence } = habit;
          
          switch (recurrence.type) {
            case 'daily':
              return recurrence.interval 
                ? (differenceInDays(today, habit.createdAt) % recurrence.interval === 0)
                : true;
              
            case 'weekly': {
              const dayOfWeek = format(today, 'EEEE').toLowerCase();
              return recurrence.weekDays?.includes(dayOfWeek as any) || false;
            }
              
            case 'monthly':
              if (recurrence.isLastDay) {
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                return today.getDate() === lastDayOfMonth;
              }
              return recurrence.dayOfMonth === today.getDate();
              
            case 'yearly':
              return (
                recurrence.monthOfYear === (today.getMonth() + 1) &&
                recurrence.dayOfMonth === today.getDate()
              );
              
            default:
              return false;
          }
        });
      },
      
      getCompletedHabitsToday: () => {
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        
        return get().habits.filter((habit) => {
          // Filter for habits completed today
          return habit.completions.some(
            (c) => format(new Date(c.date), 'yyyy-MM-dd') === todayStr && c.completed
          );
        });
      },
      
      getFutureHabits: () => {
        return get().habits.filter((habit) => {
          // Has a start date in the future
          return habit.startDate && isBefore(new Date(), habit.startDate);
        });
      },
    }),
    {
      name: 'moti-do-storage',
    }
  )
); 