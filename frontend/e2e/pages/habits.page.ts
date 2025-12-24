/**
 * Page Object for the Habits page.
 * Habits are tasks with is_habit=true and recurrence rules.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class HabitsPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newHabitButton: Locator;
  readonly habitFormDialog: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use exact: true to avoid matching "No habits yet" heading
    this.heading = page.getByRole('heading', { name: 'Habits', exact: true });
    this.newHabitButton = page.getByRole('button', { name: 'New Habit' });
    this.habitFormDialog = page.getByRole('dialog');
    this.snackbar = page.getByRole('alert');
  }

  /**
   * Navigate to the habits page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/habits');
    await this.heading.waitFor({ timeout: 10000 });
  }

  /**
   * Click the new habit button to open the form.
   */
  async clickNewHabit(): Promise<void> {
    await this.newHabitButton.click();
    await this.habitFormDialog.waitFor({ timeout: 5000 });
  }

  /**
   * Create a new habit.
   * Habits use the same TaskForm but with is_habit toggle enabled.
   */
  async createHabit(
    title: string,
    options?: {
      description?: string;
      recurrenceRule?: string;
      priority?: string;
    }
  ): Promise<void> {
    await this.clickNewHabit();

    // Fill in the title
    const dialog = this.habitFormDialog;
    await dialog.getByLabel('Title').fill(title);

    // The "Recurring Habit" switch is ON by default for habits on the Habits page
    // No need to toggle it - it starts enabled on the Habits page

    // Set recurrence rule if specified
    if (options?.recurrenceRule) {
      await dialog.getByLabel('Recurrence Rule').fill(options.recurrenceRule);
    }

    // Set description if specified
    if (options?.description) {
      await dialog.getByLabel('Description').fill(options.description);
    }

    // Set priority if specified (MUI Select - find by emoji prefix)
    if (options?.priority) {
      await dialog.getByRole('combobox').filter({ hasText: '🟡' }).click();
      await this.page.getByRole('option', { name: new RegExp(options.priority, 'i') }).click();
    }

    // Submit the form - Habits page uses "Save Changes" button
    await dialog.getByRole('button', { name: 'Save Changes' }).click();

    // Wait for dialog to close and habit to appear in list
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
    await expect(this.getHabitByTitle(title)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get a habit card by its title.
   */
  getHabitByTitle(title: string): Locator {
    // Habits are displayed as MuiCard elements
    return this.page.locator('.MuiCard-root').filter({ hasText: title });
  }

  /**
   * Check if a habit exists.
   */
  async habitExists(title: string): Promise<boolean> {
    return await this.getHabitByTitle(title).isVisible();
  }

  /**
   * Complete a habit (toggle checkbox).
   */
  async completeHabit(title: string): Promise<void> {
    const habitCard = this.getHabitByTitle(title);
    await habitCard.getByRole('checkbox').click();
  }

  /**
   * Check if the heatmap section is visible.
   * The heatmap shows habit completion history.
   */
  async isHeatmapVisible(): Promise<boolean> {
    // Heatmap is in a Paper element with completion rate text
    return await this.page.getByText(/% completion/).isVisible();
  }

  /**
   * Get the streak text for a habit.
   */
  async getHabitStreak(title: string): Promise<string | null> {
    const habitCard = this.getHabitByTitle(title);
    // Streak Progress is shown as a label with "0 / 30 days" format
    const streakProgress = habitCard.getByText('Streak Progress');
    if (await streakProgress.isVisible()) {
      // Return the adjacent progress text (e.g., "0 / 30 days")
      const progressText = habitCard.getByText(/\d+ \/ \d+ days/);
      if (await progressText.isVisible()) {
        return await progressText.textContent();
      }
      return 'Streak Progress visible';
    }
    return null;
  }

  /**
   * Click the edit button on a habit.
   */
  async editHabit(title: string): Promise<void> {
    const habitCard = this.getHabitByTitle(title);
    // The edit button is a pencil icon - find by aria-label or role
    const editButton = habitCard.getByRole('button').filter({ has: this.page.locator('svg') }).last();
    await editButton.click();
    await this.habitFormDialog.waitFor({ timeout: 5000 });
  }

  /**
   * Update habit in the edit dialog.
   */
  async updateHabit(updates: { title?: string; recurrenceRule?: string }): Promise<void> {
    if (updates.title) {
      await this.page.getByLabel('Title').fill(updates.title);
    }
    if (updates.recurrenceRule) {
      await this.page.getByLabel('Recurrence Rule').fill(updates.recurrenceRule);
    }

    await this.page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(this.page.getByText('Task updated successfully')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete a habit.
   */
  async deleteHabit(title: string): Promise<void> {
    const habitCard = this.getHabitByTitle(title);
    await habitCard.getByRole('button', { name: 'Delete habit' }).click();

    // Confirm deletion in dialog
    await this.page.getByRole('dialog').filter({ hasText: 'Delete Habit' }).waitFor();
    await this.page.getByRole('button', { name: 'Delete' }).click();

    await expect(this.page.getByText('Habit deleted successfully')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get count of visible habits.
   */
  async getHabitCount(): Promise<number> {
    // Count cards that have the Loop icon (habit indicator)
    return await this.page.locator('.MuiCard-root').count();
  }

  /**
   * Close the habit form dialog.
   */
  async closeHabitForm(): Promise<void> {
    await this.page.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.habitFormDialog).not.toBeVisible();
  }
}
