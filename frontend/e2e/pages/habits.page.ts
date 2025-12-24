/**
 * Page Object for the Habits page.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class HabitsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newHabitButton: Locator;
  readonly habitFormDialog: Locator;
  readonly heatmap: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Habits' });
    this.newHabitButton = page.getByRole('button', { name: /new habit/i });
    this.habitFormDialog = page.getByRole('dialog');
    this.heatmap = page.locator('[data-testid="habit-heatmap"]');
  }

  /**
   * Navigate to the habits page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/habits');
    await this.heading.waitFor();
  }

  /**
   * Click the new habit button to open the form.
   */
  async clickNewHabit(): Promise<void> {
    await this.newHabitButton.click();
    await this.habitFormDialog.waitFor();
  }

  /**
   * Create a new habit.
   */
  async createHabit(
    title: string,
    options?: {
      frequency?: 'daily' | 'weekly' | 'custom';
      daysOfWeek?: string[];
    }
  ): Promise<void> {
    await this.clickNewHabit();

    // Fill in the title
    await this.page.getByLabel('Title').fill(title);

    // Mark as habit
    await this.page.getByLabel(/is habit|habit/i).check();

    // Set frequency if specified
    if (options?.frequency) {
      // Handle frequency selection (implementation depends on UI)
    }

    // Submit the form
    await this.page.getByRole('button', { name: /save|create/i }).click();

    // Wait for dialog to close
    await expect(this.habitFormDialog).not.toBeVisible();
  }

  /**
   * Get a habit card by its title.
   */
  getHabitByTitle(title: string): Locator {
    return this.page.locator('[data-testid="habit-item"]', { hasText: title });
  }

  /**
   * Complete a habit for today.
   */
  async completeHabit(title: string): Promise<void> {
    const habitRow = this.getHabitByTitle(title);
    await habitRow.getByRole('checkbox').click();
  }

  /**
   * Get the current streak for a habit.
   */
  async getHabitStreak(title: string): Promise<number> {
    const habitRow = this.getHabitByTitle(title);
    const streakElement = habitRow.locator('[data-testid="habit-streak"]');
    const text = await streakElement.textContent();
    return parseInt(text ?? '0', 10);
  }

  /**
   * Click on a habit to edit it.
   */
  async editHabit(title: string): Promise<void> {
    const habitRow = this.getHabitByTitle(title);
    await habitRow.click();
    await this.habitFormDialog.waitFor();
  }

  /**
   * Delete a habit.
   */
  async deleteHabit(title: string): Promise<void> {
    const habitRow = this.getHabitByTitle(title);
    await habitRow.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Wait for habit to disappear
    await expect(habitRow).not.toBeVisible();
  }

  /**
   * Get all visible habit titles.
   */
  async getAllHabitTitles(): Promise<string[]> {
    const habits = this.page.locator('[data-testid="habit-item"]');
    const count = await habits.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const titleElement = habits.nth(i).locator('[data-testid="habit-title"]');
      const title = await titleElement.textContent();
      if (title) titles.push(title);
    }

    return titles;
  }
}
