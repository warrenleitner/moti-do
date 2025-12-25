/**
 * Page Object for the Kanban board page.
 * Uses @hello-pangea/dnd for drag and drop.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class KanbanPage {
  readonly page: Page;
  readonly projectFilter: Locator;
  readonly tagFilter: Locator;
  readonly taskCountText: Locator;
  readonly snackbar: Locator;

  constructor(page: Page) {
    this.page = page;
    this.projectFilter = page.getByLabel('Project');
    this.tagFilter = page.getByLabel('Tag');
    this.taskCountText = page.getByText(/Showing \d+ tasks/);
    this.snackbar = page.getByRole('alert');
  }

  /**
   * Navigate to the kanban page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/kanban');
    // Wait for the Backlog column to be visible (first column in kanban)
    await this.page.getByText('Backlog', { exact: true }).waitFor({ timeout: 10000 });
  }

  /**
   * Get a kanban column by its title.
   */
  getColumn(columnTitle: string): Locator {
    // Find the Paper element containing the column title
    return this.page.locator('.MuiPaper-root').filter({ hasText: columnTitle });
  }

  /**
   * Get column by status.
   */
  getColumnByStatus(status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'): Locator {
    const titles: Record<string, string> = {
      backlog: 'Backlog',
      todo: 'To Do',
      in_progress: 'In Progress',
      blocked: 'Blocked',
      done: 'Done',
    };
    return this.getColumn(titles[status]);
  }

  /**
   * Check if all columns are visible.
   */
  async allColumnsVisible(): Promise<boolean> {
    const columns = ['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'];
    for (const col of columns) {
      if (!(await this.page.getByText(col, { exact: true }).isVisible())) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get a task card by its title.
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator('.MuiCard-root').filter({ hasText: title });
  }

  /**
   * Check which column a task is in.
   */
  async getTaskColumn(title: string): Promise<string | null> {
    const task = this.getTaskByTitle(title);
    if (!(await task.isVisible())) return null;

    // Check each column
    const columns = ['Backlog', 'To Do', 'In Progress', 'Blocked', 'Done'];
    for (const col of columns) {
      const column = this.getColumn(col);
      const taskInColumn = column.locator('.MuiCard-root').filter({ hasText: title });
      if (await taskInColumn.isVisible()) {
        return col;
      }
    }
    return null;
  }

  /**
   * Drag a task to a different column.
   * Note: Drag and drop may be flaky in tests - may need custom implementation.
   */
  async dragTaskToColumn(taskTitle: string, targetColumnTitle: string): Promise<void> {
    const task = this.getTaskByTitle(taskTitle);
    const targetColumn = this.getColumn(targetColumnTitle);

    // Use Playwright's drag and drop
    await task.dragTo(targetColumn);

    // Wait a moment for the state to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Click on a task card to open edit dialog.
   */
  async clickTaskEditButton(title: string): Promise<void> {
    const taskCard = this.getTaskByTitle(title);
    // The edit button is a pencil icon - find by role button with SVG icon
    const editButton = taskCard.getByRole('button').filter({ has: this.page.locator('svg') });
    await editButton.click();
  }

  /**
   * Filter by project.
   */
  async filterByProject(project: string): Promise<void> {
    await this.projectFilter.click();
    await this.page.getByRole('option', { name: project }).click();
  }

  /**
   * Filter by tag.
   */
  async filterByTag(tag: string): Promise<void> {
    await this.tagFilter.click();
    await this.page.getByRole('option', { name: tag }).click();
  }

  /**
   * Clear filters by clicking the chip's delete button.
   */
  async clearFilter(filterText: string): Promise<void> {
    // Find the chip with this text and click its delete button
    const chip = this.page.locator('.MuiChip-root').filter({ hasText: filterText });
    await chip.locator('[data-testid="CancelIcon"]').click();
  }

  /**
   * Check if a task exists in a specific column (efficient - doesn't iterate all tasks).
   */
  async taskExistsInColumn(taskTitle: string, columnTitle: string): Promise<boolean> {
    const column = this.getColumn(columnTitle);
    const taskInColumn = column.locator('.MuiCard-root').filter({ hasText: taskTitle });
    return (await taskInColumn.count()) > 0;
  }

  /**
   * Get all task titles in a specific column.
   * WARNING: This is slow for columns with many tasks. Use taskExistsInColumn for single task checks.
   */
  async getTasksInColumn(columnTitle: string): Promise<string[]> {
    const column = this.getColumn(columnTitle);
    const cards = column.locator('.MuiCard-root');
    const count = await cards.count();

    // Limit to first 50 cards to avoid timeout in parallel tests
    const limit = Math.min(count, 50);
    const titles: string[] = [];

    for (let i = 0; i < limit; i++) {
      // Get the first Typography element which contains the title
      const titleText = await cards.nth(i).locator('.MuiTypography-root').first().textContent();
      if (titleText) titles.push(titleText.trim());
    }

    return titles;
  }

  /**
   * Get total task count displayed.
   */
  async getDisplayedTaskCount(): Promise<number> {
    const text = await this.taskCountText.textContent();
    const match = text?.match(/Showing (\d+) tasks/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Wait for snackbar with message.
   */
  async waitForSnackbar(message: string): Promise<void> {
    await expect(this.page.getByText(message)).toBeVisible({ timeout: 5000 });
  }
}
