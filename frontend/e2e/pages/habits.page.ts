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
   * The RecurrenceRuleBuilder visual UI replaces the old text input.
   */
  async createHabit(
    title: string,
    options?: {
      description?: string;
      frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      weekdays?: string[]; // For weekly: ['MO', 'WE', 'FR']
      priority?: string;
      subtasks?: string[]; // List of subtask texts
      subtaskRecurrenceMode?: 'default' | 'partial' | 'always';
    }
  ): Promise<void> {
    await this.clickNewHabit();

    // Fill in the title
    const dialog = this.habitFormDialog;
    await dialog.getByLabel('Title').fill(title);

    // The "Recurring Habit" switch is ON by default for habits on the Habits page
    // No need to toggle it - it starts enabled on the Habits page
    // RecurrenceRuleBuilder defaults to FREQ=DAILY

    // Set frequency if specified (using the RecurrenceRuleBuilder visual UI)
    if (options?.frequency && options.frequency !== 'DAILY') {
      // Click the frequency dropdown and select the desired frequency
      const frequencyLabel = options.frequency === 'WEEKLY' ? 'Week' :
                             options.frequency === 'MONTHLY' ? 'Month' :
                             options.frequency === 'YEARLY' ? 'Year' : 'Day';
      const frequencyDropdown = dialog.getByRole('combobox').filter({ hasText: /Day|Week|Month|Year/ });
      await frequencyDropdown.click();
      await this.page.getByRole('option', { name: new RegExp(`^${frequencyLabel}s?$`) }).click();
    }

    // For weekly frequency, select specific weekdays
    if (options?.weekdays && options.weekdays.length > 0) {
      for (const day of options.weekdays) {
        const dayLabels: Record<string, string> = {
          'MO': 'Mon', 'TU': 'Tue', 'WE': 'Wed', 'TH': 'Thu',
          'FR': 'Fri', 'SA': 'Sat', 'SU': 'Sun'
        };
        await dialog.getByRole('button', { name: dayLabels[day] }).click();
      }
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

    // Add subtasks if specified
    if (options?.subtasks && options.subtasks.length > 0) {
      for (const subtaskText of options.subtasks) {
        const subtaskInput = dialog.getByPlaceholder('Add subtask...');
        await subtaskInput.fill(subtaskText);
        await subtaskInput.press('Enter');
        await this.page.waitForTimeout(200); // Wait for subtask to be added
      }

      // Set subtask recurrence mode if specified
      if (options.subtaskRecurrenceMode) {
        const modeLabel = {
          default: 'All Complete First',
          partial: 'Carry Over Completed',
          always: 'Always Copy All',
        }[options.subtaskRecurrenceMode];

        // Click the subtask recurrence dropdown
        const recurrenceDropdown = dialog.locator('.MuiFormControl-root').filter({ hasText: 'Subtask Recurrence' }).getByRole('combobox');
        await recurrenceDropdown.click();
        await this.page.getByRole('option', { name: new RegExp(modeLabel) }).click();
      }
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
   * Uses the RecurrenceRuleBuilder visual UI instead of text input.
   */
  async updateHabit(updates: {
    title?: string;
    frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  }): Promise<void> {
    if (updates.title) {
      await this.page.getByLabel('Title').fill(updates.title);
    }
    if (updates.frequency) {
      const frequencyLabel = updates.frequency === 'WEEKLY' ? 'Week' :
                             updates.frequency === 'MONTHLY' ? 'Month' :
                             updates.frequency === 'YEARLY' ? 'Year' : 'Day';
      const frequencyDropdown = this.page.getByRole('combobox').filter({ hasText: /Day|Week|Month|Year/ });
      await frequencyDropdown.click();
      await this.page.getByRole('option', { name: new RegExp(`^${frequencyLabel}s?$`) }).click();
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

    // Confirm deletion in dialog - scope button click to dialog
    const deleteDialog = this.page.getByRole('dialog').filter({ hasText: 'Delete Habit' });
    await deleteDialog.waitFor();
    await deleteDialog.getByRole('button', { name: 'Delete' }).click();

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
