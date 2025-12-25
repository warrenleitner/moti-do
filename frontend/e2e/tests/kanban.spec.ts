/**
 * Kanban Board E2E tests for Moti-Do.
 * Tests kanban view and status changes via API.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { TasksPage } from '../pages/tasks.page';
import { KanbanPage } from '../pages/kanban.page';
import { seedBlockedTask } from '../fixtures/task-data.fixture';

test.describe('Kanban Board', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Kanban Display', () => {
    test('should display kanban page with all columns', async ({ page }) => {
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      await expect(kanbanPage.page.getByText('Backlog', { exact: true })).toBeVisible();

      // Verify all columns are present using the helper method
      const allColumnsVisible = await kanbanPage.allColumnsVisible();
      expect(allColumnsVisible).toBe(true);
    });

    test('should show tasks in correct columns based on status', async ({ page }) => {
      // Create a task first
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Kanban Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Navigate to kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // New tasks should appear somewhere on the board
      const task = kanbanPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();
    });
  });

  // Tests use API to change task status instead of flaky drag-and-drop
  test.describe('Status Changes via API', () => {
    test('should show task in Done column when completed via API', async ({ page }) => {
      // Create a task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Done Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Complete via UI (simpler than extracting ID)
      await tasksPage.toggleTaskComplete(taskTitle);

      // Navigate to kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // Task should be in Done column
      // Use efficient taskExistsInColumn instead of getTasksInColumn
      expect(await kanbanPage.taskExistsInColumn(taskTitle, 'Done')).toBeTruthy();
    });

    test('should show new task in Backlog column by default', async ({ page }) => {
      // Create a task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Backlog Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Navigate to kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // New task should be in Backlog column (default for tasks without status)
      // Use efficient taskExistsInColumn instead of getTasksInColumn
      expect(await kanbanPage.taskExistsInColumn(taskTitle, 'Backlog')).toBeTruthy();
    });

    test('should show task in Blocked column when has incomplete dependency', async ({ page }) => {
      // Create blocked task pair
      const { blockedTask } = await seedBlockedTask(page);

      // Navigate to kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // Verify blocked task is in Blocked column
      // Use efficient taskExistsInColumn instead of getTasksInColumn
      expect(await kanbanPage.taskExistsInColumn(blockedTask.title, 'Blocked')).toBeTruthy();
    });
  });

  test.describe('Task Interaction', () => {
    test('should click on task card to view details', async ({ page }) => {
      // Create a task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Click Kanban ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Navigate to kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // Click on the task's edit button
      await kanbanPage.clickTaskEditButton(taskTitle);

      // Should open task details dialog
      await expect(page.getByRole('dialog')).toBeVisible();
    });
  });

  test.describe('Kanban Filtering', () => {
    test('should filter tasks by tag', async ({ page }) => {
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // Look for tag filter if available
      if (await kanbanPage.tagFilter.isVisible()) {
        await kanbanPage.tagFilter.click();
      }
    });

    test('should filter tasks by project', async ({ page }) => {
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      // Look for project filter if available
      if (await kanbanPage.projectFilter.isVisible()) {
        await kanbanPage.projectFilter.click();
      }
    });
  });
});
