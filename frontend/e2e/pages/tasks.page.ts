/**
 * Page Object for the Tasks page.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class TasksPage {
  readonly page: Page;
  readonly newTaskButton: Locator;
  readonly listViewButton: Locator;
  readonly tableViewButton: Locator;
  readonly taskFormDialog: Locator;
  readonly deleteConfirmDialog: Locator;
  readonly snackbar: Locator;

  // Filter controls
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly priorityFilter: Locator;
  readonly projectFilter: Locator;

  // Quick Add Box
  readonly quickAddInput: Locator;

  // Subtask View Toggle
  readonly subtaskHiddenButton: Locator;
  readonly subtaskInlineButton: Locator;
  readonly subtaskTopLevelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskButton = page.getByRole('button', { name: /NEW TASK/i });
    // View mode toggle - Mantine ActionIcon buttons with aria-label attributes
    this.listViewButton = page.getByRole('button', { name: 'list view' });
    this.tableViewButton = page.getByRole('button', { name: 'table view' });
    this.taskFormDialog = page.getByRole('dialog');
    this.deleteConfirmDialog = page.getByRole('dialog').filter({ hasText: 'Delete Task' });
    this.snackbar = page.getByRole('alert').first();

    // Filter controls - Mantine Select renders <input readonly> with implicit textbox role
    this.searchInput = page.getByPlaceholder('Search tasks...');
    // Status filter is now rendered as tab buttons (ACTIVE, COMPLETED, ALL, etc.)
    this.statusFilter = page.getByRole('button', { name: /^active$/i });
    this.priorityFilter = page.getByRole('combobox', { name: 'Priority', exact: true });
    this.projectFilter = page.getByRole('combobox', { name: 'Project', exact: true });

    // Quick Add Box - the persistent input at the top of TasksPage
    // Placeholder is now terminal-style: "DEPLOY NEW TASK: [TITLE] /PRIORITY /DUE..."
    this.quickAddInput = page.getByPlaceholder(/DEPLOY NEW TASK/);

    // Subtask View Toggle - Mantine SegmentedControl renders labels in order: hidden, inline, top-level
    // Use positional nth selectors scoped to the radiogroup (CSS '+' sibling selectors don't work in Playwright)
    const subtaskToggle = page.locator('[aria-label="subtask view mode"]');
    this.subtaskHiddenButton = subtaskToggle.locator('label').nth(0);
    this.subtaskInlineButton = subtaskToggle.locator('label').nth(1);
    this.subtaskTopLevelButton = subtaskToggle.locator('label').nth(2);
  }

  /**
   * Navigate to the tasks page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.newTaskButton.waitFor({ timeout: 10000 });
  }

  /**
   * Click the new task button to open the form.
   */
  async clickNewTask(): Promise<void> {
    await this.newTaskButton.click();
    await this.taskFormDialog.waitFor({ timeout: 5000 });
  }

  /**
   * Create a new task with the specified fields.
   */
  async createTask(
    title: string,
    options?: {
      description?: string;
      icon?: string;
      priority?: string;
      difficulty?: string;
      duration?: string;
      dueDate?: string;
      project?: string;
      tags?: string[];
    }
  ): Promise<void> {
    await this.clickNewTask();

    // All form interactions should be scoped to the dialog
    const dialog = this.taskFormDialog;

    // Fill in the title (required)
    await dialog.getByLabel('Title').fill(title);

    // Set icon if specified
    if (options?.icon) {
      await dialog.getByLabel('Icon').fill(options.icon);
    }

    // Set description if specified
    if (options?.description) {
      await dialog.getByLabel('Description').fill(options.description);
    }

    // Set priority if specified (Mantine Select - click label to open dropdown)
    if (options?.priority) {
      await dialog.getByLabel('Priority', { exact: true }).click();
      await this.page.getByRole('option', { name: new RegExp(options.priority, 'i') }).click();
    }

    // Set difficulty if specified
    if (options?.difficulty) {
      await dialog.getByLabel('Difficulty', { exact: true }).click();
      await this.page.getByRole('option', { name: new RegExp(options.difficulty, 'i') }).click();
    }

    // Set duration if specified
    if (options?.duration) {
      await dialog.getByLabel('Duration', { exact: true }).click();
      await this.page.getByRole('option', { name: new RegExp(options.duration, 'i') }).click();
    }

    // Set project if specified
    if (options?.project) {
      await dialog.getByLabel('Project').fill(options.project);
    }

    // Set due date if specified (Mantine DateTimePicker - opens a popover calendar)
    if (options?.dueDate) {
      // Parse the date (expected format: YYYY-MM-DD)
      const [year, month, day] = options.dueDate.split('-');
      const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

      // Click the Due Date button to open the calendar popover
      await dialog.getByLabel('Due Date').click();

      // Navigate to the correct month/year in the calendar
      // The calendar shows the current month by default
      const targetMonthYear = targetDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      // Keep clicking the next/prev month button until we reach the target month
      for (let i = 0; i < 24; i++) {
        const calendarHeader = this.page.locator('[data-calendar] button[data-mantine-level-control]').first();
        const headerText = await calendarHeader.textContent();
        if (headerText?.includes(targetMonthYear)) break;

        // Determine if we need to go forward or backward
        const headerDate = new Date(headerText || '');
        if (targetDate > headerDate) {
          await this.page.locator('[data-calendar] button[data-next]').first().click();
        } else {
          await this.page.locator('[data-calendar] button[data-previous]').first().click();
        }
        await this.page.waitForTimeout(100);
      }

      // Click the target day button in the calendar
      const dayButton = this.page.locator(`[data-calendar] button[data-day="${options.dueDate}"]`);
      await dayButton.click();

      // Click the submit (check) button to confirm the date selection
      const submitButton = this.page.locator('[class*="DateTimePicker"] button:has(svg)').last();
      await submitButton.click().catch(() => {
        // If submit button not found, press Escape to close the popover
        return this.page.keyboard.press('Escape');
      });
    }

    // Submit the form - button text is "CREATE MISSION" for new tasks
    await dialog.getByRole('button', { name: /CREATE MISSION/i }).click();

    // Wait for success snackbar
    await expect(this.page.getByText('Task created successfully')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get a task card by its title text.
   * Since there's no data-testid, we find the Card containing the title text.
   */
  getTaskByTitle(title: string): Locator {
    // Find the card/row that contains this title text
    return this.page.locator('[data-testid="task-card"]').filter({ hasText: title });
  }

  /**
   * Check if a task exists in the list.
   */
  async taskExists(title: string): Promise<boolean> {
    return await this.getTaskByTitle(title).isVisible();
  }

  /**
   * Click the completion button to toggle task completion.
   */
  async toggleTaskComplete(title: string): Promise<void> {
    const taskCard = this.getTaskByTitle(title);
    // The completion button has title="Mark Complete" or "Mark Incomplete"
    const completeButton = taskCard.getByRole('button', { name: /Mark Complete|Mark Incomplete/ });
    await completeButton.click();
  }

  /**
   * Click the edit button on a task.
   */
  async editTask(title: string): Promise<void> {
    const taskCard = this.getTaskByTitle(title);
    // The edit button has title="Edit task"
    await taskCard.getByRole('button', { name: 'Edit task' }).click();
    await this.taskFormDialog.waitFor({ timeout: 5000 });
  }

  /**
   * Update a task in the edit dialog.
   */
  async updateTask(updates: { title?: string; icon?: string; description?: string }): Promise<void> {
    if (updates.title) {
      await this.page.getByLabel('Title').fill(updates.title);
    }
    if (updates.icon) {
      await this.page.getByLabel('Icon').fill(updates.icon);
    }
    if (updates.description) {
      await this.page.getByLabel('Description').fill(updates.description);
    }

    // Submit - button text is "SAVE CHANGES" for editing
    await this.page.getByRole('button', { name: /SAVE CHANGES/i }).click();

    // Wait for success snackbar
    await expect(this.page.getByText('Task updated successfully')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Delete a task by title.
   */
  async deleteTask(title: string): Promise<void> {
    const taskCard = this.getTaskByTitle(title);
    // The delete button has title="Delete task"
    await taskCard.getByRole('button', { name: 'Delete task' }).click();

    // Confirm deletion in the dialog — scope to dialog to avoid matching card buttons
    await this.deleteConfirmDialog.waitFor({ timeout: 5000 });
    await this.deleteConfirmDialog.getByRole('button', { name: 'Delete' }).click();

    // Wait for success snackbar
    await expect(this.page.getByText('Task deleted')).toBeVisible({ timeout: 5000 });
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
   * Search for tasks.
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
  }

  /**
   * Filter by status.
   * Status filter is now inside the FilterDialog modal, using multi-select checkboxes.
   */
  async filterByStatus(status: 'Active' | 'Completed' | 'All'): Promise<void> {
    // Open the filter dialog
    await this.page.getByRole('button', { name: 'Open filters' }).click();
    // Wait for dialog to appear
    await this.page.getByText('FILTER TASKS').waitFor({ timeout: 5000 });
    // Status checkboxes use uppercase labels — click the matching checkbox label
    await this.page.getByText(status.toUpperCase(), { exact: true }).click();
    // Apply filters
    await this.page.getByRole('button', { name: /APPLY FILTERS/i }).click();
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
   * Close the task form dialog.
   */
  async closeTaskForm(): Promise<void> {
    await this.page.getByRole('button', { name: /CANCEL/i }).click();
    await expect(this.taskFormDialog).not.toBeVisible();
  }

  /**
   * Get count of visible tasks.
   */
  async getTaskCount(): Promise<number> {
    // Count task card elements
    return await this.page.locator('[data-testid="task-card"]').count();
  }

  /**
   * Quick add a task using the quick add input box.
   * Supports inline modifiers: !priority, #tag, @date, ~project
   */
  async quickAddTask(input: string): Promise<void> {
    await this.quickAddInput.fill(input);
    await this.quickAddInput.press('Enter');
    // Wait for snackbar confirmation - message format is 'Task "..." created!'
    await expect(this.page.getByText(/created!/i)).toBeVisible({ timeout: 5000 });
  }

  /**
   * Set subtask view mode to hidden.
   */
  async setSubtaskViewHidden(): Promise<void> {
    await this.subtaskHiddenButton.click();
  }

  /**
   * Set subtask view mode to inline (default).
   */
  async setSubtaskViewInline(): Promise<void> {
    await this.subtaskInlineButton.click();
  }

  /**
   * Set subtask view mode to top-level (subtasks shown as separate items).
   */
  async setSubtaskViewTopLevel(): Promise<void> {
    await this.subtaskTopLevelButton.click();
  }

  /**
   * Check if a subtask is visible as a separate card (top-level mode).
   */
  async subtaskCardVisible(subtaskText: string): Promise<boolean> {
    // Subtask cards have a subtask-icon and the subtask text
    return await this.page.locator('[data-testid="subtask-card"]').filter({ hasText: subtaskText }).locator('[data-testid="subtask-icon"]').isVisible();
  }
}
