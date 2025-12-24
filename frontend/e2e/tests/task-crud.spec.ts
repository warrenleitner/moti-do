/**
 * Task CRUD E2E tests for Moti-Do.
 * Tests creating, reading, updating, and deleting tasks.
 */
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';
import { TasksPage } from '../pages/tasks.page';

test.describe('Task CRUD Operations', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Register or login
    try {
      await loginPage.register('taskuser', 'testpassword123');
    } catch {
      // User might already exist, try login
      await loginPage.login('taskuser', 'testpassword123');
    }

    await expect(page).toHaveURL('/');
  });

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
        priority: 'high',
        difficulty: 'hard',
        duration: '1h',
        notes: 'This is a test task with all fields filled',
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

      // Verify snackbar shows XP earned
      const message = await tasksPage.getSnackbarMessage();
      expect(message).toContain('XP earned');
    });

    test('should mark task as incomplete', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create and complete a task
      const taskTitle = `Uncomplete Me ${Date.now()}`;
      await tasksPage.createTask(taskTitle);
      await tasksPage.toggleTaskComplete(taskTitle);

      // Wait for completion
      await page.waitForTimeout(500);

      // Toggle back to incomplete
      await tasksPage.toggleTaskComplete(taskTitle);

      // Verify snackbar shows task marked incomplete
      const message = await tasksPage.getSnackbarMessage();
      expect(message).toContain('incomplete');
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
      await expect(page.locator('table')).toBeVisible();

      // Switch back to list view
      await tasksPage.switchToListView();
    });
  });
});
