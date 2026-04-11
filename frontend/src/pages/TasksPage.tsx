import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Group,
  Text,
  ActionIcon,
  notifications,
} from '../ui';
import {
  IconPlus,
  IconList,
  IconTable,
  IconCalendar,
} from '../ui/icons';
import { ArcadeButton, DataBadge } from '../components/ui';
import { AxiosError } from 'axios';
import { TaskList, TaskForm } from '../components/tasks';
import TaskTable from '../components/tasks/TaskTable';
import JumpToCurrentInstanceDialog from '../components/tasks/JumpToCurrentInstanceDialog';
import QuickAddBox from '../components/tasks/QuickAddBox';
import { ConfirmDialog } from '../components/common';
import SearchInput from '../components/common/SearchInput';
import DeferDialog from '../components/common/DeferDialog';
import { useTaskStore } from '../store';
import { useFilteredTasks } from '../store/taskStore';
import { useUserStore, useSystemStatus, useDefinedProjects } from '../store/userStore';
import type { Task } from '../types';
import { getCombinedTags } from '../utils/tags';
import type { JumpToCurrentInstancePreview } from '../services/api';

// UI orchestration component - tested via integration tests
/* v8 ignore start */

/**
 * Extract a user-friendly error message from an API error.
 */
function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    // Try to get detail from API response (FastAPI format)
    const detail = error.response?.data?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    // Fall back to HTTP status text
    if (error.response?.statusText) {
      return `${error.response.statusText} (${error.response.status})`;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

const DEFAULT_VISIBLE_COUNT = 50;
const LOAD_MORE_STEP = 50;
export default function TasksPage() {
  // Use API actions from the store
  const {
    createTask,
    saveTask,
    deleteTask,
    completeTask,
    uncompleteTask,
    undoTask,
    duplicateTask,
    deferTask,
    isLoading,
    tasks: allTasks,
    filters,
    setFilters,
    fetchTasks,
    hasCompletedData,
    previewJumpToCurrentInstance,
    jumpToCurrentInstance,
    activateCrisisMode,
    crisisModeActive,
  } = useTaskStore();
  const { fetchStats } = useUserStore();
  const systemStatus = useSystemStatus();
  const filteredTasks = useFilteredTasks(systemStatus?.last_processed_date);
  const definedProjects = useDefinedProjects();

  // Get projects from defined projects, and tags from tasks
  const projects = definedProjects.map((p) => p.name);
  const tags = [...new Set(allTasks.flatMap((t) => getCombinedTags(t).map((tag) => tag.toLowerCase())))];

  const [viewMode, setViewMode] = useState<'list' | 'table'>(() => {
    const saved = localStorage.getItem('taskViewMode');
    return (saved as 'list' | 'table') || 'list';
  });
  const [visibleRowCount, setVisibleRowCount] = useState(DEFAULT_VISIBLE_COUNT);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [tasksToDelete, setTasksToDelete] = useState<string[]>([]);
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);
  const [tasksToComplete, setTasksToComplete] = useState<string[]>([]);
  const [bulkDuplicateDialogOpen, setBulkDuplicateDialogOpen] = useState(false);
  const [tasksToDuplicate, setTasksToDuplicate] = useState<string[]>([]);
  const [bulkDeferDialogOpen, setBulkDeferDialogOpen] = useState(false);
  const [tasksToDefer, setTasksToDefer] = useState<string[]>([]);
  const [bulkJumpDialogOpen, setBulkJumpDialogOpen] = useState(false);
  const [tasksToJump, setTasksToJump] = useState<string[]>([]);
  const [jumpPreviews, setJumpPreviews] = useState<JumpToCurrentInstancePreview[]>([]);
  const [jumpApplying, setJumpApplying] = useState(false);
  const [bulkCrisisDialogOpen, setBulkCrisisDialogOpen] = useState(false);
  const [tasksForCrisisMode, setTasksForCrisisMode] = useState<string[]>([]);
  const visibleTasks = useMemo(
    () => filteredTasks.slice(0, Math.min(filteredTasks.length, visibleRowCount)),
    [filteredTasks, visibleRowCount]
  );
  const hasMoreTasks = visibleTasks.length < filteredTasks.length;
  const visibleTaskIds = useMemo(() => visibleTasks.map((task) => task.id), [visibleTasks]);
  const visibleTaskIdSet = useMemo(() => new Set(visibleTaskIds), [visibleTaskIds]);
  const visibleSelectedTasks = useMemo(
    () => selectedTasks.filter((id) => visibleTaskIdSet.has(id)),
    [selectedTasks, visibleTaskIdSet]
  );

  useEffect(() => {
    if ((filters.statuses.includes('completed') || filters.statuses.includes('all')) && !hasCompletedData) {
      fetchTasks({ includeCompleted: true }).catch(() => {
        // Errors surface via store error state/snackbar elsewhere
      });
    }
  }, [fetchTasks, filters.statuses, hasCompletedData]);

  const showNotification = (message: string, color: 'green' | 'red', autoClose = 3000) => {
    notifications.show({ message, color, autoClose });
  };

  const handleViewModeChange = (newMode: string) => {
    setViewMode(newMode as 'list' | 'table');
    localStorage.setItem('taskViewMode', newMode);
  };

  const handleLoadMore = () => {
    setVisibleRowCount((prev) => Math.min(prev + LOAD_MORE_STEP, filteredTasks.length));
  };

  const handleCreateNew = () => {
    setEditingTask(null);
    setFormOpen(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormOpen(true);
  };

  const handleSave = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        // Update existing task via API
        await saveTask(editingTask.id, taskData);
        showNotification('Task updated successfully', 'green');
      } else {
        // Create new task via API
        await createTask(taskData);
        showNotification('Task created successfully', 'green');
      }
      setFormOpen(false);
      setEditingTask(null);
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to save task'), 'red');
    }
  };

  const handleInlineEdit = async (taskId: string, updates: Partial<Task>) => {
    try {
      await saveTask(taskId, updates);
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to update task'), 'red');
      throw error; // Re-throw to let EditableCell handle rollback
    }
  };

  const handleComplete = async (taskId: string) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    try {
      if (task.is_complete) {
        await uncompleteTask(taskId);
        showNotification('Task marked as incomplete', 'green');
      } else {
        const response = await completeTask(taskId);
        // Refresh user stats to update XP display
        await fetchStats();

        // Show next instance info for recurring tasks
        if (response.next_instance && response.next_instance.due_date) {
          if (crisisModeActive) {
            showNotification(
              'Task completed! XP earned. The next recurring instance was created and hidden until you exit crisis mode.',
              'green',
            );
          } else {
            const nextId = response.next_instance.id;
            const nextDue = response.next_instance.due_date;
            notifications.show({
              message: (
                <>
                  Task completed! XP earned. Next due:{' '}
                  <Text
                    component="button"
                    size="sm"
                    fw={700}
                    td="underline"
                    style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0 }}
                    onClick={() => {
                      const { tasks: storeTasks } = useTaskStore.getState();
                      const nextTask = storeTasks.find((t) => t.id === nextId);
                      if (nextTask) {
                        setEditingTask(nextTask);
                        setFormOpen(true);
                      }
                    }}
                  >
                    {formatNextDueDate(nextDue)}
                  </Text>
                </>
              ),
              color: 'green',
              autoClose: 6000,
            });
          }
        } else {
          showNotification('Task completed! XP earned.', 'green');
        }
      }
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to update task'), 'red');
    }
  };

  const handleDeleteClick = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (taskToDelete) {
      try {
        await deleteTask(taskToDelete);
        showNotification('Task deleted', 'green');
      } catch (error) {
        showNotification(getErrorMessage(error, 'Failed to delete task'), 'red');
      }
    }
    setDeleteDialogOpen(false);
    setTaskToDelete(null);
  };

  const handleSubtaskToggle = async (taskId: string, subtaskIndex: number) => {
    const { tasks } = useTaskStore.getState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedSubtasks = [...task.subtasks];
    updatedSubtasks[subtaskIndex] = {
      ...updatedSubtasks[subtaskIndex],
      complete: !updatedSubtasks[subtaskIndex].complete,
    };

    try {
      await saveTask(taskId, { subtasks: updatedSubtasks });
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to update subtask'), 'red');
    }
  };

  const handleUndo = async (taskId: string) => {
    try {
      await undoTask(taskId);
      showNotification('Change undone', 'green');
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to undo change'), 'red');
    }
  };

  const handleDuplicate = async (taskId: string) => {
    try {
      await duplicateTask(taskId);
      showNotification('Task duplicated successfully', 'green');
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to duplicate task'), 'red');
    }
  };

  const formatNextDueDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Selection handlers for bulk actions
  const handleSelectTask = (taskId: string) => {
    setSelectedTasks((prev) => {
      const visibleSelection = prev.filter((id) => visibleTaskIdSet.has(id));
      return visibleSelection.includes(taskId)
        ? visibleSelection.filter((id) => id !== taskId)
        : [...visibleSelection, taskId];
    });
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? visibleTaskIds : []);
  };

  // Bulk action handlers
  const handleBulkComplete = (taskIds: string[]) => {
    setTasksToComplete(taskIds);
    setBulkCompleteDialogOpen(true);
  };

  const handleBulkCompleteConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToComplete) {
      const task = filteredTasks.find((t) => t.id === taskId);
      if (task && !task.is_complete) {
        try {
          await completeTask(taskId);
          successCount++;
        } catch {
          // Continue with other tasks even if one fails
        }
      }
    }
    if (successCount > 0) {
      await fetchStats();
      showNotification(`Completed ${successCount} task${successCount > 1 ? 's' : ''}!`, 'green');
    }
    setSelectedTasks([]);
    setBulkCompleteDialogOpen(false);
    setTasksToComplete([]);
  };

  const handleBulkDeleteClick = (taskIds: string[]) => {
    setTasksToDelete(taskIds);
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToDelete) {
      try {
        await deleteTask(taskId);
        successCount++;
      } catch {
        // Continue with other tasks even if one fails
      }
    }
    if (successCount > 0) {
      showNotification(`Deleted ${successCount} task${successCount > 1 ? 's' : ''}`, 'green');
    }
    setSelectedTasks([]);
    setBulkDeleteDialogOpen(false);
    setTasksToDelete([]);
  };

  const handleBulkDuplicateClick = (taskIds: string[]) => {
    setTasksToDuplicate(taskIds);
    setBulkDuplicateDialogOpen(true);
  };

  const handleBulkDuplicateConfirm = async () => {
    let successCount = 0;
    for (const taskId of tasksToDuplicate) {
      try {
        await duplicateTask(taskId);
        successCount++;
      } catch {
        // Continue with other tasks even if one fails
      }
    }
    if (successCount > 0) {
      showNotification(`Duplicated ${successCount} task${successCount > 1 ? 's' : ''}`, 'green');
    }
    setSelectedTasks([]);
    setBulkDuplicateDialogOpen(false);
    setTasksToDuplicate([]);
  };

  const handleBulkDeferClick = (taskIds: string[]) => {
    setTasksToDefer(taskIds);
    setBulkDeferDialogOpen(true);
  };

  const handleBulkJumpClick = async (taskIds: string[]) => {
    try {
      const response = await previewJumpToCurrentInstance(taskIds);
      setTasksToJump(taskIds);
      setJumpPreviews(response.previews);
      setBulkJumpDialogOpen(true);
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to preview jump to current instance'), 'red');
    }
  };

  const handleBulkDeferConfirm = async (params: {
    defer_until?: string;
    defer_to_next_recurrence?: boolean;
  }) => {
    let successCount = 0;
    for (const taskId of tasksToDefer) {
      try {
        await deferTask(taskId, params);
        successCount++;
      } catch {
        // Continue with other tasks even if one fails
      }
    }
    if (successCount > 0) {
      showNotification(`Deferred ${successCount} task${successCount > 1 ? 's' : ''}`, 'green');
    }
    setSelectedTasks([]);
    setBulkDeferDialogOpen(false);
    setTasksToDefer([]);
  };

  const handleBulkJumpConfirm = async () => {
    setJumpApplying(true);
    try {
      const response = await jumpToCurrentInstance(tasksToJump);
      showNotification(
        response.updated_count > 0
          ? `Moved ${response.updated_count} recurring task${response.updated_count === 1 ? '' : 's'} to the current instance`
          : 'No selected tasks needed to move',
        'green',
      );
      setSelectedTasks([]);
      setBulkJumpDialogOpen(false);
      setTasksToJump([]);
      setJumpPreviews([]);
    } catch (error) {
      showNotification(getErrorMessage(error, 'Failed to jump tasks to the current instance'), 'red');
    } finally {
      setJumpApplying(false);
    }
  };

  const handleActivateCrisisModeClick = (taskIds: string[]) => {
    setTasksForCrisisMode(taskIds);
    setBulkCrisisDialogOpen(true);
  };

  const handleCrisisModeConfirm = () => {
    activateCrisisMode(tasksForCrisisMode);
    setSelectedTasks([]);
    setBulkCrisisDialogOpen(false);
    setTasksForCrisisMode([]);
    showNotification(
      `Crisis mode activated for ${tasksForCrisisMode.length} task${tasksForCrisisMode.length === 1 ? '' : 's'}`,
      'green',
    );
  };

  // Calculate current processing date (last_processed_date + 1 day)
  const currentProcessingDate = systemStatus?.last_processed_date
    ? (() => {
        // Parse as local date to avoid timezone issues
        const [year, month, day] = systemStatus.last_processed_date.split('-').map(Number);
        const nextDay = new Date(year, month - 1, day + 1);
        return nextDay.toLocaleDateString();
      })()
    : null;

  return (
    <Box>
      {/* Processing date indicator */}
      <Group gap="xs" mb="sm" wrap="wrap">
        <IconCalendar size={16} color="#81ecff" />
        <Text size="sm" className="font-data" style={{ color: '#a8aab7', letterSpacing: '0.05em' }}>
          PROCESSING:
        </Text>
        <DataBadge
          value={currentProcessingDate || 'NOT STARTED'}
          color="cyan"
          size="sm"
        />
        {systemStatus && systemStatus.pending_days > 0 && (
          <DataBadge
            value={`${systemStatus.pending_days} DAY${systemStatus.pending_days > 1 ? 'S' : ''} BEHIND`}
            color="magenta"
            size="sm"
          />
        )}
      </Group>

      {/* Header actions with quick-add on the same line */}
      <Group mb="lg" gap="md" wrap="wrap">
        {/* Quick-add box takes available space */}
        <Box style={{ flex: 1, minWidth: 200 }}>
          <QuickAddBox />
        </Box>
        {/* View toggle: card vs table */}
        <Group
          gap={0}
          style={{
            border: '1px solid rgba(69, 71, 82, 0.15)',
          }}
        >
          <ActionIcon
            size="md"
            onClick={() => handleViewModeChange('list')}
            aria-label="list view"
            aria-pressed={viewMode === 'list'}
            style={{
              backgroundColor: viewMode === 'list' ? '#272A34' : 'transparent',
              color: viewMode === 'list' ? '#81ecff' : '#a8aab7',
              border: 'none',
              borderRadius: 0,
              boxShadow: viewMode === 'list' ? '0 0 6px rgba(129, 236, 255, 0.2)' : 'none',
            }}
          >
            <IconList size={16} />
          </ActionIcon>
          <ActionIcon
            size="md"
            onClick={() => handleViewModeChange('table')}
            aria-label="table view"
            aria-pressed={viewMode === 'table'}
            style={{
              backgroundColor: viewMode === 'table' ? '#272A34' : 'transparent',
              color: viewMode === 'table' ? '#81ecff' : '#a8aab7',
              border: 'none',
              borderRadius: 0,
              boxShadow: viewMode === 'table' ? '0 0 6px rgba(129, 236, 255, 0.2)' : 'none',
            }}
          >
            <IconTable size={16} />
          </ActionIcon>
        </Group>
        <ArcadeButton
          variant="gradient"
          onClick={handleCreateNew}
          disabled={isLoading}
          data-testid="add-task-fab"
        >
          <Group gap={4}>
            <IconPlus size={16} />
            NEW TASK
          </Group>
        </ArcadeButton>
      </Group>

      {/* Task list or table based on view mode */}
      {viewMode === 'list' ? (
        <TaskList
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onDuplicate={handleDuplicate}
          onComplete={handleComplete}
          onSubtaskToggle={handleSubtaskToggle}
          onUndo={handleUndo}
          onCreateNew={handleCreateNew}
        />
      ) : (
        <>
          <Group mb="sm" gap="sm" align="center">
            <Box style={{ flex: 1, maxWidth: 300 }}>
              <SearchInput
                value={filters.search || ''}
                onChange={(search) => setFilters({ search: search || undefined })}
                placeholder="Search tasks..."
              />
            </Box>
          </Group>
          <TaskTable
            tasks={visibleTasks}
            allTasks={allTasks}
            onEdit={handleEdit}
            onDelete={handleDeleteClick}
            onComplete={handleComplete}
            onInlineEdit={handleInlineEdit}
            selectedTasks={visibleSelectedTasks}
            onSelectTask={handleSelectTask}
            onSelectAll={handleSelectAll}
            onBulkComplete={handleBulkComplete}
            onBulkDelete={handleBulkDeleteClick}
            onDuplicate={handleDuplicate}
            onBulkDuplicate={handleBulkDuplicateClick}
            onBulkDefer={handleBulkDeferClick}
            onBulkJumpToCurrent={handleBulkJumpClick}
            onActivateCrisisMode={handleActivateCrisisModeClick}
            filters={filters}
            onFiltersChange={setFilters}
            availableProjects={projects}
            availableTags={tags}
          />
          <Group justify="space-between" mt="sm">
            <Text size="xs" className="font-data" style={{ color: '#525560', letterSpacing: '0.05em' }}>
              SHOWING {visibleTasks.length} OF {filteredTasks.length} TASKS
            </Text>
            <ArcadeButton variant="ghost" size="xs" onClick={handleLoadMore} disabled={!hasMoreTasks}>
              LOAD MORE
            </ArcadeButton>
          </Group>
        </>
      )}

      {/* Task form dialog */}
      <TaskForm
        key={editingTask?.id ?? 'new'}
        open={formOpen}
        task={editingTask}
        onSave={handleSave}
        onClose={() => {
          setFormOpen(false);
          setEditingTask(null);
        }}
        allTasks={allTasks}
      />

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setTaskToDelete(null);
        }}
      />

      {/* Bulk delete confirmation dialog */}
      <ConfirmDialog
        open={bulkDeleteDialogOpen}
        title="Delete Selected Tasks"
        message={`Are you sure you want to delete ${tasksToDelete.length} task${tasksToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`}
        confirmLabel="Delete All"
        confirmColor="error"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={() => {
          setBulkDeleteDialogOpen(false);
          setTasksToDelete([]);
        }}
      />

      {/* Bulk complete confirmation dialog */}
      <ConfirmDialog
        open={bulkCompleteDialogOpen}
        title="Complete Selected Tasks"
        message={`Are you sure you want to complete ${tasksToComplete.length} task${tasksToComplete.length > 1 ? 's' : ''}?`}
        confirmLabel="Complete All"
        confirmColor="primary"
        onConfirm={handleBulkCompleteConfirm}
        onCancel={() => {
          setBulkCompleteDialogOpen(false);
          setTasksToComplete([]);
        }}
      />

      {/* Bulk duplicate confirmation dialog */}
      <ConfirmDialog
        open={bulkDuplicateDialogOpen}
        title="Duplicate Selected Tasks"
        message={`Are you sure you want to duplicate ${tasksToDuplicate.length} task${tasksToDuplicate.length > 1 ? 's' : ''}?`}
        confirmLabel="Duplicate All"
        confirmColor="primary"
        onConfirm={handleBulkDuplicateConfirm}
        onCancel={() => {
          setBulkDuplicateDialogOpen(false);
          setTasksToDuplicate([]);
        }}
      />

      {/* Bulk defer dialog */}
      <DeferDialog
        open={bulkDeferDialogOpen}
        tasks={allTasks.filter((t) => tasksToDefer.includes(t.id))}
        onConfirm={handleBulkDeferConfirm}
        onCancel={() => {
          setBulkDeferDialogOpen(false);
          setTasksToDefer([]);
        }}
      />

      <JumpToCurrentInstanceDialog
        open={bulkJumpDialogOpen}
        previews={jumpPreviews}
        isApplying={jumpApplying}
        onConfirm={handleBulkJumpConfirm}
        onCancel={() => {
          if (jumpApplying) {
            return;
          }
          setBulkJumpDialogOpen(false);
          setTasksToJump([]);
          setJumpPreviews([]);
        }}
      />

      <ConfirmDialog
        open={bulkCrisisDialogOpen}
        title={crisisModeActive ? 'Replace Crisis Mode Focus' : 'Activate Crisis Mode'}
        message={`Show only ${tasksForCrisisMode.length} selected task${tasksForCrisisMode.length === 1 ? '' : 's'} across task views until you exit crisis mode?`}
        confirmLabel={crisisModeActive ? 'Replace Focus' : 'Activate'}
        confirmColor="warning"
        onConfirm={handleCrisisModeConfirm}
        onCancel={() => {
          setBulkCrisisDialogOpen(false);
          setTasksForCrisisMode([]);
        }}
      />
    </Box>
  );
}
/* v8 ignore stop */
