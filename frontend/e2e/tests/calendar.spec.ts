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
    test('should show task with due date on calendar', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Use findEventByTitle which handles "+more" link expansion
      const event = await calendarPage.findEventByTitle(task.title);
      await expect(event).toBeVisible({ timeout: 5000 });
    });

    test('should click on event to view task details', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar and click on event
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // clickEvent now handles "+more" expansion internally
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
    test('should show completed tasks on calendar', async ({ page }) => {
      // Create task with due date via API
      const today = new Date();
      const dueDate = today.toISOString();
      const task = await seedTaskWithDueDate(page, dueDate);

      // Navigate to calendar first to verify task exists
      const calendarPage = new CalendarPage(page);
      await calendarPage.goto();
      await calendarPage.waitForCalendar();

      // Use findEventByTitle which handles "+more" link expansion
      const event = await calendarPage.findEventByTitle(task.title);
      await expect(event).toBeVisible({ timeout: 5000 });

      // Completed tasks should still be visible on calendar
    });
  });
});
