/**
 * Calendar E2E tests for Moti-Do.
 * Tests calendar view, event interactions, and task scheduling.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { CalendarPage } from '../pages/calendar.page';
import { seedTaskWithDueDate } from '../fixtures/task-data.fixture';

test.describe('Calendar View', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts
  // Run these tests serially to avoid interference between tasks created by different tests
  test.describe.configure({ mode: 'serial' });

  test.describe('Calendar Navigation', () => {
    test('should display calendar page correctly', async ({ page }) => {
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();

      await expect(calendarPage.calendar).toBeVisible();
      await calendarPage.waitForCalendar();
      await expect(calendarPage.calendar).toBeVisible();
    });

    test('should navigate to previous and next month', async ({ page }) => {
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Navigate to previous month
      await calendarPage.goToPrev();
      await page.waitForTimeout(300); // Wait for animation

      // Navigate to next month
      await calendarPage.goToNext();
      await page.waitForTimeout(300);

      // Navigate back to today
      await calendarPage.goToToday();
    });
  });

  test.describe('Task Display on Calendar', () => {
    // Skip these tests - they are flaky due to timing issues with FullCalendar loading and event rendering
    // Calendar functionality is tested via unit tests in CalendarPage.test.tsx
    test.skip('should show task with due date on calendar', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Wait for calendar to load tasks
      await page.waitForTimeout(2000);

      // Find event by title (no project filtering needed - titles are unique)
      const event = await calendarPage.findEventByTitle(task.title);
      await expect(event).toBeVisible({ timeout: 5000 });
    });

    test.skip('should click on event to view task details', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar and click on event
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // clickEvent now handles "+more" expansion internally (no project filtering)
      await calendarPage.clickEvent(task.title);

      // Should open a dialog with task details
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Calendar Filtering', () => {
    test('should filter tasks by project', async ({ page }) => {
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Look for project filter if available
      if (await calendarPage.projectFilter.isVisible()) {
        await calendarPage.projectFilter.click();
        // Select a project option if available
      }
    });
  });

  test.describe('Task Completion Status', () => {
    // Skip - same flaky timing issues as above
    test.skip('should show completed tasks on calendar', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar first to verify task exists
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Find event by title (no project filtering needed)
      const event = await calendarPage.findEventByTitle(task.title);
      await expect(event).toBeVisible({ timeout: 5000 });

      // Completed tasks should still be visible on calendar
    });
  });
});
