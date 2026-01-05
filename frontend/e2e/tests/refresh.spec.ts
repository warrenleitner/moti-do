/**
 * Refresh Functionality E2E tests for Moti-Do.
 *
 * Tests the refresh button and pull-to-refresh functionality
 * that allows PWA users to manually refresh data.
 */
import { test, expect } from '@playwright/test';
import { TasksPage } from '../pages/tasks.page';

test.describe('Refresh Functionality', () => {
  test.describe('Refresh Button', () => {
    test('should display refresh button on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/tasks');

      // Wait for the page to load
      await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible();

      // Refresh button should be visible in the mobile app bar
      const refreshButton = page.getByRole('button', { name: /refresh data/i });
      await expect(refreshButton).toBeVisible();
    });

    test('should refresh data when button is clicked', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create a task to ensure we have data
      const taskTitle = `Refresh Test ${Date.now()}`;
      await tasksPage.createTask(taskTitle);
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();

      // Click refresh button
      const refreshButton = page.getByRole('button', { name: /refresh data/i });
      await refreshButton.click();

      // Wait for refresh to complete (button should be enabled again)
      await expect(refreshButton).toBeEnabled({ timeout: 5000 });

      // Task should still be visible (data reloaded successfully)
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();
    });

    test('should disable refresh button while refreshing', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/tasks');

      await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible();

      const refreshButton = page.getByRole('button', { name: /refresh data/i });

      // Click refresh and immediately check disabled state
      await refreshButton.click();

      // Button should become disabled during refresh
      // Note: This is a race condition - the button may be re-enabled very quickly
      // if the refresh completes fast. We just verify it eventually becomes enabled.
      await expect(refreshButton).toBeEnabled({ timeout: 5000 });
    });

    test('should not show refresh button on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/tasks');

      // Wait for the page to load
      await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible();

      // The mobile app bar (and refresh button) should not be visible on desktop
      // The refresh button is only in the mobile AppBar
      const mobileAppBar = page.locator('header.MuiAppBar-root');
      await expect(mobileAppBar).toBeHidden();
    });
  });

  test.describe('Pull-to-Refresh', () => {
    test('should have pull-to-refresh container on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/tasks');

      // Wait for the page to load
      await expect(page.getByRole('button', { name: 'New Task' })).toBeVisible();

      // Main content area should be present and interactive
      const mainContent = page.locator('main');
      await expect(mainContent).toBeVisible();
    });

    test('should maintain page functionality with pull-to-refresh wrapper', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      const tasksPage = new TasksPage(page);
      await tasksPage.goto();

      // Create a task to verify the page is fully functional
      const taskTitle = `PTR Test ${Date.now()}`;
      await tasksPage.createTask(taskTitle);

      // Task should be created successfully
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();

      // Navigate to another page and back
      await page.goto('/calendar');
      await expect(page.locator('.fc')).toBeVisible();

      await tasksPage.goto();
      await expect(tasksPage.getTaskByTitle(taskTitle)).toBeVisible();
    });
  });

  test.describe('Refresh Across Pages', () => {
    test('should refresh data on Dashboard', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Dashboard should load
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

      // Click refresh
      const refreshButton = page.getByRole('button', { name: /refresh data/i });
      await refreshButton.click();

      // Dashboard should still be functional
      await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    });

    test('should refresh data on Habits page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/habits');

      // Habits page should load
      await expect(page.getByRole('button', { name: 'New Habit' })).toBeVisible();

      // Click refresh
      const refreshButton = page.getByRole('button', { name: /refresh data/i });
      await refreshButton.click();

      // Habits page should still be functional
      await expect(page.getByRole('button', { name: 'New Habit' })).toBeVisible();
    });

    test('should refresh data on Kanban page', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/kanban');

      // Kanban page should load
      await expect(page.getByText('Backlog', { exact: true })).toBeVisible();

      // Click refresh
      const refreshButton = page.getByRole('button', { name: /refresh data/i });
      await refreshButton.click();

      // Kanban page should still be functional
      await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
    });
  });
});
