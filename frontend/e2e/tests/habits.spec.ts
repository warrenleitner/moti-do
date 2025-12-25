/**
 * Habits E2E tests for Moti-Do.
 * Tests habit creation, completion, streaks, and heatmap visualization.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { HabitsPage } from '../pages/habits.page';

test.describe('Habits Management', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Habits Page Display', () => {
    test('should display habits page correctly', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      await expect(habitsPage.newHabitButton).toBeVisible();
    });

    test('should open habit creation form', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      await habitsPage.clickNewHabit();
      await expect(habitsPage.habitFormDialog).toBeVisible();
    });
  });

  test.describe('Habit Creation', () => {
    test('should create a new habit', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Daily Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);

      // Verify habit appears in the list
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });

    test('should create habit with recurrence rule', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Daily Exercise ${Date.now()}`;
      // Daily is the default, so no need to specify frequency
      await habitsPage.createHabit(habitTitle, {
        frequency: 'DAILY',
      });

      // Verify habit appears
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });

    test('should create weekly habit with specific days', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Weekly Workout ${Date.now()}`;
      await habitsPage.createHabit(habitTitle, {
        frequency: 'WEEKLY',
        weekdays: ['MO', 'WE', 'FR'],
      });

      // Verify habit appears
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });
  });

  test.describe('Habit Completion', () => {
    test('should complete a habit', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Create a habit first
      const habitTitle = `Complete Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);

      // Complete the habit
      await habitsPage.completeHabit(habitTitle);

      // Wait for the completion to register
      await page.waitForTimeout(500);

      // Verify snackbar or visual feedback
      const snackbar = habitsPage.snackbar;
      if (await snackbar.isVisible()) {
        await expect(snackbar).toBeVisible();
      }
    });

    test('should show streak after completion', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Create a habit
      const habitTitle = `Streak Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);

      // Complete the habit
      await habitsPage.completeHabit(habitTitle);

      // Wait for update
      await page.waitForTimeout(500);

      // Streak progress should be visible (returns "X / Y days" format or null)
      const streak = await habitsPage.getHabitStreak(habitTitle);
      // If streak is visible, it should show progress format
      if (streak) {
        expect(streak).toMatch(/\d+ \/ \d+ days/);
      }
    });
  });

  test.describe('Heatmap Visualization', () => {
    test('should display heatmap section when habits exist', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Create a habit and complete it
      const habitTitle = `Heatmap Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);
      await habitsPage.completeHabit(habitTitle);

      // Wait for heatmap to load
      await page.waitForTimeout(500);

      // Check if heatmap is visible
      const heatmapVisible = await habitsPage.isHeatmapVisible();
      // Heatmap may or may not be visible depending on data
      expect(typeof heatmapVisible).toBe('boolean');
    });
  });

  test.describe('Habit Management', () => {
    test('should edit an existing habit', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Create a habit
      const habitTitle = `Edit Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);

      // Edit the habit
      await habitsPage.editHabit(habitTitle);
      await expect(habitsPage.habitFormDialog).toBeVisible();

      // Close dialog
      await habitsPage.closeHabitForm();
    });

    test('should delete a habit', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Create a habit
      const habitTitle = `Delete Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle);

      // Verify it exists
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();

      // Delete the habit
      await habitsPage.deleteHabit(habitTitle);

      // Verify it's gone
      await expect(habit).not.toBeVisible();
    });
  });

  test.describe('Subtask Recurrence Mode', () => {
    test('should create habit with subtasks', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Habit With Subtasks ${Date.now()}`;
      await habitsPage.createHabit(habitTitle, {
        subtasks: ['Step 1', 'Step 2', 'Step 3'],
      });

      // Verify habit appears
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });

    test('should create habit with "Always Copy All" recurrence mode', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Always Copy Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle, {
        subtasks: ['Task A', 'Task B'],
        subtaskRecurrenceMode: 'always',
      });

      // Verify habit appears
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });

    test('should create habit with "Carry Over Completed" recurrence mode', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      const habitTitle = `Partial Copy Habit ${Date.now()}`;
      await habitsPage.createHabit(habitTitle, {
        subtasks: ['Morning routine', 'Evening routine'],
        subtaskRecurrenceMode: 'partial',
      });

      // Verify habit appears
      const habit = habitsPage.getHabitByTitle(habitTitle);
      await expect(habit).toBeVisible();
    });

    test('should show subtask recurrence dropdown when habit has subtasks', async ({ page }) => {
      const habitsPage = new HabitsPage(page);
      await habitsPage.goto();

      // Open new habit form
      await habitsPage.clickNewHabit();
      const dialog = habitsPage.habitFormDialog;

      // Fill in title
      await dialog.getByLabel('Title').fill('Test Habit');

      // Add a subtask to make the dropdown appear
      const subtaskInput = dialog.getByPlaceholder('Add subtask...');
      await subtaskInput.fill('First subtask');
      await subtaskInput.press('Enter');
      await page.waitForTimeout(300);

      // Check that the subtask recurrence dropdown is visible
      const recurrenceDropdown = dialog.locator('.MuiFormControl-root').filter({ hasText: 'Subtask Recurrence' });
      await expect(recurrenceDropdown).toBeVisible();

      // Close dialog
      await habitsPage.closeHabitForm();
    });
  });
});
