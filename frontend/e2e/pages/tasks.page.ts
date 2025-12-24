/**
 * Page Object for the Tasks page.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class TasksPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly newTaskButton: Locator;
  readonly listViewButton: Locator;
  readonly tableViewButton: Locator;
  readonly taskFormDialog: Locator;
  readonly deleteConfirmDialog: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Tasks' });
    this.newTaskButton = page.getByRole('button', { name: /new task/i });
    this.listViewButton = page.getByRole('button', { name: /list/i });
    this.tableViewButton = page.getByRole('button', { name: /table/i });
    this.taskFormDialog = page.getByRole('dialog');
    this.deleteConfirmDialog = page.getByRole('dialog').filter({ hasText: /delete/i });
    this.snackbar = page.getByRole('alert');
  }

  /**
   * Navigate to the tasks page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.heading.waitFor();
  }

  /**
   * Click the new task button to open the form.
   */
  async clickNewTask(): Promise<void> {
    await this.newTaskButton.click();
    await this.taskFormDialog.waitFor();
  }

  /**
   * Create a new task with minimal fields.
   */
  async createTask(
    title: string,
    options?: {
      priority?: 'low' | 'normal' | 'high' | 'critical';
      difficulty?: 'easy' | 'normal' | 'hard';
      duration?: '5min' | '15min' | '30min' | '1h' | '2h' | '4h' | '1d' | '3d' | '1w';
      dueDate?: string;
      notes?: string;
    }
  ): Promise<void> {
    await this.clickNewTask();

    // Fill in the title
    await this.page.getByLabel('Title').fill(title);

    // Set priority if specified
    if (options?.priority) {
      await this.page.getByLabel('Priority').click();
      await this.page.getByRole('option', { name: options.priority, exact: false }).click();
    }

    // Set difficulty if specified
    if (options?.difficulty) {
      await this.page.getByLabel('Difficulty').click();
      await this.page.getByRole('option', { name: options.difficulty, exact: false }).click();
    }

    // Set duration if specified
    if (options?.duration) {
      await this.page.getByLabel('Duration').click();
      await this.page.getByRole('option', { name: options.duration, exact: false }).click();
    }

    // Set due date if specified
    if (options?.dueDate) {
      await this.page.getByLabel('Due Date').fill(options.dueDate);
    }

    // Set notes if specified
    if (options?.notes) {
      await this.page.getByLabel('Notes').fill(options.notes);
    }

    // Submit the form
    await this.page.getByRole('button', { name: /save|create/i }).click();

    // Wait for dialog to close
    await expect(this.taskFormDialog).not.toBeVisible();
  }

  /**
   * Get a task card by its title.
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator('[data-testid="task-item"]', { hasText: title });
  }

  /**
   * Click the checkbox to toggle task completion.
   */
  async toggleTaskComplete(title: string): Promise<void> {
    const taskRow = this.getTaskByTitle(title);
    await taskRow.getByRole('checkbox').click();
  }

  /**
   * Click on a task to edit it.
   */
  async editTask(title: string): Promise<void> {
    const taskRow = this.getTaskByTitle(title);
    await taskRow.click();
    await this.taskFormDialog.waitFor();
  }

  /**
   * Delete a task by title.
   */
  async deleteTask(title: string): Promise<void> {
    const taskRow = this.getTaskByTitle(title);
    await taskRow.getByRole('button', { name: /delete/i }).click();

    // Confirm deletion
    await this.deleteConfirmDialog.waitFor();
    await this.page.getByRole('button', { name: /confirm|yes|delete/i }).click();

    // Wait for task to disappear
    await expect(taskRow).not.toBeVisible();
  }

  /**
   * Switch to list view.
   */
  async switchToListView(): Promise<void> {
    await this.listViewButton.click();
  }

  /**
   * Switch to table view.
   */
  async switchToTableView(): Promise<void> {
    await this.tableViewButton.click();
  }

  /**
   * Get the snackbar message.
   */
  async getSnackbarMessage(): Promise<string | null> {
    try {
      await this.snackbar.waitFor({ timeout: 5000 });
      return await this.snackbar.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Get all visible task titles.
   */
  async getAllTaskTitles(): Promise<string[]> {
    const tasks = this.page.locator('[data-testid="task-item"]');
    const count = await tasks.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const titleElement = tasks.nth(i).locator('[data-testid="task-title"]');
      const title = await titleElement.textContent();
      if (title) titles.push(title);
    }

    return titles;
  }
}
