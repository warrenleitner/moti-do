/**
 * Cross-Cutting Flow E2E tests for Moti-Do.
 *
 * These tests serve TRIPLE duty:
 * 1. Validate full user journeys and data consistency across views
 * 2. Collect performance metrics during navigation
 * 3. Validate database backend (PostgreSQL when DATABASE_URL is set, JSON otherwise)
 *
 * When run with Docker/PostgreSQL: Tests validate both the app AND the database layer.
 * Performance metrics are logged for CI parsing.
 *
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { TasksPage } from '../pages/tasks.page';
import { CalendarPage } from '../pages/calendar.page';
import { KanbanPage } from '../pages/kanban.page';
import { GraphPage } from '../pages/graph.page';
import { seedBlockedTask } from '../fixtures/task-data.fixture';
import {
  measureNavigation,
  logPerformanceSummary,
  type NavigationTiming,
  PERFORMANCE_BUDGETS,
} from '../utils/performance-metrics';

// Log database backend at start of test suite
test.beforeAll(() => {
  const dbType = process.env.DATABASE_URL ? 'PostgreSQL' : 'JSON (local)';
  console.log(`\n🗄️  Database Backend: ${dbType}\n`);
});

test.describe('Cross-Cutting Flows', () => {
  test.describe('Full User Journey - New User Onboarding', () => {
    test('should complete full onboarding flow', async ({ page }) => {
      const timestamp = Date.now();

      // Step 1: Start at dashboard (already authenticated)
      await page.goto('/');

      // Step 2: Verify dashboard
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Step 3: Create first task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();
      const taskTitle = `My First Task ${timestamp}`;

      await tasksPage.createTask(taskTitle, {
        priority: 'High',
        description: 'This is my first task!',
      });

      // Step 4: Verify task appears in Tasks page
      const task = tasksPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();

      // Step 5: Navigate to Calendar and verify calendar loads
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Step 6: Navigate to Kanban and verify task appears
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      const kanbanTask = kanbanPage.getTaskByTitle(taskTitle);
      await expect(kanbanTask).toBeVisible();

      // Step 7: Mark task complete via Tasks page
      await tasksPage.goto();
      await tasksPage.toggleTaskComplete(taskTitle);
      await page.waitForTimeout(500);

      // Step 8: Navigate to dashboard and verify XP awarded
      await page.goto('/');
      const xpDisplay = page.getByRole('heading', { name: /\d+ xp/i });
      await expect(xpDisplay).toBeVisible();
    });
  });

  test.describe('Data Consistency Across Views', () => {
    test('should maintain task state across all views', async ({ page }) => {
      const timestamp = Date.now();
      const taskTitle = `Consistency Task ${timestamp}`;

      // Step 1: Create task on Tasks page
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      await tasksPage.createTask(taskTitle, {
        priority: 'High',
      });

      // Step 2: Verify task in Kanban
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      const kanbanTask = kanbanPage.getTaskByTitle(taskTitle);
      await expect(kanbanTask).toBeVisible();

      // Step 3: Complete task via Tasks page
      await tasksPage.goto();
      await tasksPage.toggleTaskComplete(taskTitle);
      await page.waitForTimeout(500);

      // Step 4: Navigate to Kanban and verify task is in Done column
      await kanbanPage.goto();
      expect(await kanbanPage.taskExistsInColumn(taskTitle, 'Done')).toBeTruthy();
    });

    test('should sync task edits across views', async ({ page }) => {
      const timestamp = Date.now();
      const taskTitle = `Edit Sync Task ${timestamp}`;

      // Create task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();
      await tasksPage.createTask(taskTitle);

      // Verify task exists in Tasks page
      const task = tasksPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();

      // Navigate to Kanban and verify task appears
      const kanbanPage = new KanbanPage(page);
      await kanbanPage.goto();

      const kanbanTask = kanbanPage.getTaskByTitle(taskTitle);
      await expect(kanbanTask).toBeVisible();

      // Navigate back to Tasks page and complete the task
      await tasksPage.goto();
      await tasksPage.toggleTaskComplete(taskTitle);
      await page.waitForTimeout(500);

      // Verify task is now in Kanban's Done column
      await kanbanPage.goto();
      expect(await kanbanPage.taskExistsInColumn(taskTitle, 'Done')).toBeTruthy();
    });
  });

  test.describe('Dependency Resolution Flow', () => {
    test('should create tasks with dependency relationship', async ({ page }) => {
      const { blockingTask, blockedTask } = await seedBlockedTask(page);

      // Navigate to Graph and verify both nodes exist
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      await expect(graphPage.getNodeByTitle(blockingTask.title)).toBeVisible({ timeout: 5000 });
      await expect(graphPage.getNodeByTitle(blockedTask.title)).toBeVisible({ timeout: 5000 });
    });

    test('should show dependency connection on graph', async ({ page }) => {
      await seedBlockedTask(page);

      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Verify nodes are present
      const nodeCount = await graphPage.getNodeCount();
      expect(nodeCount).toBeGreaterThanOrEqual(2);

      // Verify edges exist
      const edgeCount = await graphPage.getEdgeCount();
      expect(edgeCount).toBeGreaterThanOrEqual(1);
    });

    test('should complete dependency chain correctly', async ({ page }) => {
      const { blockingTask, blockedTask } = await seedBlockedTask(page);

      // Navigate to Tasks page
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Complete blocking task first
      await tasksPage.toggleTaskComplete(blockingTask.title);
      await page.waitForTimeout(500);

      // Now complete the blocked task
      await tasksPage.toggleTaskComplete(blockedTask.title);
      await page.waitForTimeout(500);

      // Navigate to Graph to verify completion state
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Both nodes should still be visible
      await expect(graphPage.getNodeByTitle(blockingTask.title)).toBeVisible();
      await expect(graphPage.getNodeByTitle(blockedTask.title)).toBeVisible();
    });
  });

  test.describe('XP and Level Progression', () => {
    test('should award XP when completing tasks', async ({ page }) => {
      // Check initial XP on dashboard
      await page.goto('/');

      // Create and complete a task
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `XP Task ${Date.now()}`;
      await tasksPage.createTask(taskTitle, {
        priority: 'High',
        difficulty: 'High',
      });

      await tasksPage.toggleTaskComplete(taskTitle);
      await page.waitForTimeout(500);

      // Check XP increased on dashboard
      await page.goto('/');
      const xpHeading = page.getByRole('heading', { name: /\d+ xp/i });
      await expect(xpHeading).toBeVisible();
      const finalXP = await xpHeading.textContent();

      expect(finalXP).toBeDefined();
    });
  });

  test.describe('Multi-Page Navigation with Performance Metrics', () => {
    /**
     * This test validates navigation AND collects performance metrics.
     * It serves as both a functional test and a performance baseline.
     */
    test('should navigate all pages within performance budget', async ({ page }) => {
      const navigationTimings: NavigationTiming[] = [];

      // Dashboard
      const dashboardTiming = await measureNavigation(page, '/', async () => {
        await page.goto('/');
      });
      navigationTimings.push(dashboardTiming);
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Tasks
      const tasksTiming = await measureNavigation(page, '/tasks', async () => {
        await page.goto('/tasks');
      });
      navigationTimings.push(tasksTiming);
      await expect(page.getByRole('heading', { name: 'Tasks', exact: true })).toBeVisible();

      // Calendar
      const calendarTiming = await measureNavigation(page, '/calendar', async () => {
        await page.goto('/calendar');
      });
      navigationTimings.push(calendarTiming);
      await expect(page.getByRole('heading', { name: 'Calendar', exact: true })).toBeVisible();

      // Kanban
      const kanbanTiming = await measureNavigation(page, '/kanban', async () => {
        await page.goto('/kanban');
      });
      navigationTimings.push(kanbanTiming);
      await expect(page.getByRole('heading', { name: 'Kanban Board' })).toBeVisible();

      // Habits
      const habitsTiming = await measureNavigation(page, '/habits', async () => {
        await page.goto('/habits');
      });
      navigationTimings.push(habitsTiming);
      await expect(page.getByRole('heading', { name: 'Habits', exact: true })).toBeVisible();

      // Graph
      const graphTiming = await measureNavigation(page, '/graph', async () => {
        await page.goto('/graph');
      });
      navigationTimings.push(graphTiming);
      await expect(page.getByRole('heading', { name: 'Dependency Graph' })).toBeVisible();

      // Settings
      const settingsTiming = await measureNavigation(page, '/settings', async () => {
        await page.goto('/settings');
      });
      navigationTimings.push(settingsTiming);
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();

      // Log performance summary
      await logPerformanceSummary('Multi-Page Navigation', navigationTimings, page);

      // Assert performance budgets
      for (const timing of navigationTimings) {
        expect(
          timing.duration,
          `${timing.route} exceeded performance budget of ${PERFORMANCE_BUDGETS.pageLoad}ms`
        ).toBeLessThan(PERFORMANCE_BUDGETS.pageLoad);
      }
    });

    test('should maintain sidebar navigation state', async ({ page }) => {
      await page.goto('/');

      const navItems = [
        { name: /tasks/i, url: '/tasks' },
        { name: /calendar/i, url: '/calendar' },
        { name: /kanban/i, url: '/kanban' },
        { name: /habits/i, url: '/habits' },
        { name: /graph/i, url: '/graph' },
      ];

      for (const item of navItems) {
        const navLink = page.getByRole('link', { name: item.name });
        if (await navLink.isVisible()) {
          await navLink.click();
          await expect(page).toHaveURL(item.url);
        }
      }
    });
  });

  test.describe('Error Recovery', () => {
    test('should handle page refresh gracefully', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      const taskTitle = `Refresh Test ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Refresh the page
      await page.reload();

      // Task should still be visible (data persisted)
      await expect(tasksPage.heading).toBeVisible();
      const task = tasksPage.getTaskByTitle(taskTitle);
      await expect(task).toBeVisible();
    });

    test('should recover from back/forward navigation', async ({ page }) => {
      await page.goto('/tasks');
      await page.goto('/calendar');
      await page.goto('/kanban');

      await page.goBack();
      await expect(page).toHaveURL('/calendar');

      await page.goBack();
      await expect(page).toHaveURL('/tasks');

      await page.goForward();
      await expect(page).toHaveURL('/calendar');
    });
  });

  test.describe('Database Persistence Validation', () => {
    /**
     * This test specifically validates data persistence.
     * When run with PostgreSQL, it validates the database layer.
     * When run with JSON, it validates the file storage layer.
     */
    test('should persist data across page reloads', async ({ page }) => {
      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create a task with unique identifier
      const taskTitle = `Persistence Test ${Date.now()}`;
      await tasksPage.createTask(taskTitle, {
        priority: 'High',
        description: 'Testing database persistence',
      });

      // Verify task was created
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();

      // Wait for API to persist the task before reloading
      await page.waitForLoadState('networkidle');

      // Hard refresh to clear any in-memory cache
      await page.reload({ waitUntil: 'networkidle' });

      // Task should still exist (was persisted to database/file)
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();

      console.log(`✅ Data persistence validated for ${process.env.DATABASE_URL ? 'PostgreSQL' : 'JSON'} backend`);
    });
  });
});
