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
    // Use exact: true to avoid matching "No tasks found" heading
    this.heading = page.getByRole('heading', { name: 'Tasks', exact: true });
    this.newTaskButton = page.getByRole('button', { name: 'New Task' });
    // aria-label attributes from the ToggleButton components
    this.listViewButton = page.getByRole('button', { name: 'list view' });
    this.tableViewButton = page.getByRole('button', { name: 'table view' });
    this.taskFormDialog = page.getByRole('dialog');
    this.deleteConfirmDialog = page.getByRole('dialog').filter({ hasText: 'Delete Task' });
    this.snackbar = page.getByRole('alert');

    // Filter controls - Mantine Select components
    // Use getByRole('textbox') to specifically target the input, not the dropdown
    this.searchInput = page.getByPlaceholder('Search tasks...');
    this.statusFilter = page.getByRole('textbox', { name: 'Status' });
    this.priorityFilter = page.getByRole('textbox', { name: 'Priority' });
    this.projectFilter = page.getByRole('textbox', { name: 'Project' });

    // Quick Add Box - the persistent input at the top of TasksPage
    // Placeholder includes hint text, so use partial match
    this.quickAddInput = page.getByPlaceholder(/Add a task/);

    // Subtask View Toggle buttons - aria-label attributes from ToggleButton components
    this.subtaskHiddenButton = page.getByRole('button', { name: 'hide subtasks' });
    this.subtaskInlineButton = page.getByRole('button', { name: 'show subtasks inline' });
    this.subtaskTopLevelButton = page.getByRole('button', { name: 'show subtasks as tasks' });
  }

  /**
   * Navigate to the tasks page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/tasks');
    await this.heading.waitFor({ timeout: 10000 });
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

    // Set description if specified
    if (options?.description) {
      await dialog.getByLabel('Description').fill(options.description);
    }

    // Set priority if specified (MUI Select - find by displayed text content)
    if (options?.priority) {
      // Priority combobox shows "🟡 Medium" by default
      await dialog.getByRole('combobox').filter({ hasText: '🟡' }).click();
      await this.page.getByRole('option', { name: new RegExp(options.priority, 'i') }).click();
    }

    // Set difficulty if specified
    if (options?.difficulty) {
      // Difficulty combobox shows "🧱 Medium" by default
      await dialog.getByRole('combobox').filter({ hasText: '🧱' }).click();
      await this.page.getByRole('option', { name: new RegExp(options.difficulty, 'i') }).click();
    }

    // Set duration if specified
    if (options?.duration) {
      // Duration combobox shows "🕰️ Medium" by default
      await dialog.getByRole('combobox').filter({ hasText: '🕰️' }).click();
      await this.page.getByRole('option', { name: new RegExp(options.duration, 'i') }).click();
    }

    // Set project if specified
    if (options?.project) {
      await dialog.getByLabel('Project').fill(options.project);
    }

    // Set due date if specified (MUI DateTimePicker - click and type)
    if (options?.dueDate) {
      // Parse the date (expected format: YYYY-MM-DD)
      const [year, month, day] = options.dueDate.split('-');
      const dateGroup = dialog.getByRole('group', { name: 'Due Date' });
      // Click the month spinbutton and type the date parts
      const monthSpinbutton = dateGroup.getByRole('spinbutton', { name: 'Month' });
      await monthSpinbutton.click();
      await monthSpinbutton.pressSequentially(month);
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.type(day);
      await this.page.keyboard.press('Tab');
      await this.page.keyboard.type(year);
    }

    // Submit the form - button text is "Create Task" for new tasks
    await dialog.getByRole('button', { name: 'Create Task' }).click();

    // Wait for success snackbar
    await expect(this.page.getByText('Task created successfully')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get a task card by its title text.
   * Since there's no data-testid, we find the Card containing the title text.
   */
  getTaskByTitle(title: string): Locator {
    // Find the card/row that contains this title text
    return this.page.locator('.MuiCard-root').filter({ hasText: title });
  }

  /**
   * Check if a task exists in the list.
   */
  async taskExists(title: string): Promise<boolean> {
    return await this.getTaskByTitle(title).isVisible();
  }

  /**
   * Click the checkbox to toggle task completion.
   */
  async toggleTaskComplete(title: string): Promise<void> {
    const taskCard = this.getTaskByTitle(title);
    await taskCard.getByRole('checkbox').click();
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
  async updateTask(updates: { title?: string; description?: string }): Promise<void> {
    if (updates.title) {
      await this.page.getByLabel('Title').fill(updates.title);
    }
    if (updates.description) {
      await this.page.getByLabel('Description').fill(updates.description);
    }

    // Submit - button text is "Save Changes" for editing
    await this.page.getByRole('button', { name: 'Save Changes' }).click();

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

    // Confirm deletion in the dialog
    await this.deleteConfirmDialog.waitFor({ timeout: 5000 });
    await this.page.getByRole('button', { name: 'Delete' }).click();

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
   */
  async filterByStatus(status: 'Active' | 'Completed' | 'All'): Promise<void> {
    await this.statusFilter.click();
    await this.page.getByRole('option', { name: status }).click();
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
    await this.page.getByRole('button', { name: 'Cancel' }).click();
    await expect(this.taskFormDialog).not.toBeVisible();
  }

  /**
   * Get count of visible tasks.
   */
  async getTaskCount(): Promise<number> {
    // Count MuiCard-root elements that contain task content
    return await this.page.locator('.MuiCard-root').count();
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
    // Subtask cards have a SubdirectoryArrowRight icon and the subtask text
    return await this.page.locator('.MuiCard-root').filter({ hasText: subtaskText }).locator('svg[data-testid="SubdirectoryArrowRightIcon"]').isVisible();
  }
}
