/**
 * Task CRUD E2E tests for Moti-Do.
 * Tests creating, reading, updating, and deleting tasks.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { TasksPage } from '../pages/tasks.page';

test.describe('Task CRUD Operations', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Task Creation', () => {
    test('should navigate to tasks page', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      await expect(tasksPage.heading).toBeVisible();
      await expect(tasksPage.newTaskButton).toBeVisible();
    });

    test('should open task creation form', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      await tasksPage.clickNewTask();
      await expect(tasksPage.taskFormDialog).toBeVisible();
    });

    test('should create a task with title only', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Test Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Verify task appears in the list
      const task = tasksPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();
    });

    test('should create a task with all fields', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Full Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle, {
        priority: 'High',
        difficulty: 'High',
        description: 'This is a test task with all fields filled',
      });

      // Verify task appears in the list
      const task = tasksPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();
    });
  });

  test.describe('Task Completion', () => {
    test('should mark task as complete', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create a task first
      const taskTitle = `Complete Me ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Toggle completion
      await tasksPage.toggleTaskComplete(taskTitle);

      // Verify snackbar shows success message
      await expect(tasksPage.snackbar).toBeVisible({ timeout: 5000 });
    });

    test('should mark task as incomplete', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create and complete a task
      const taskTitle = `Uncomplete Me ${Date.now()}`;
      await tasksPage.createTask(taskTitle);
      await tasksPage.toggleTaskComplete(taskTitle);

      // Wait for completion
      await page.waitForTimeout(1000);

      // Completed tasks may be filtered out - filter to show All tasks
      await tasksPage.filterByStatus('All');
      await page.waitForTimeout(500);

      // Toggle back to incomplete
      await tasksPage.toggleTaskComplete(taskTitle);

      // Verify snackbar shows message
      await expect(tasksPage.snackbar).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('View Mode Toggle', () => {
    test('should switch between list and table view', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create a task to have something to display
      const taskTitle = `View Test ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Switch to table view
      await tasksPage.switchToTableView();

      // Verify table view is displayed (table element should be visible)
      await expect(page.locator('table')).toBeVisible({ timeout: 5000 });

      // Switch back to list view
      await tasksPage.switchToListView();
    });
  });
});
