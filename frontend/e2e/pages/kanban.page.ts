/**
 * Page Object for the Kanban board page.
 */
import { type Page, type Locator } from '@playwright/test';

export class KanbanPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly backlogColumn: Locator;
  readonly todoColumn: Locator;
  readonly inProgressColumn: Locator;
  readonly blockedColumn: Locator;
  readonly doneColumn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Kanban' });
    this.backlogColumn = page.locator('[data-testid="kanban-column-backlog"]');
    this.todoColumn = page.locator('[data-testid="kanban-column-todo"]');
    this.inProgressColumn = page.locator('[data-testid="kanban-column-in_progress"]');
    this.blockedColumn = page.locator('[data-testid="kanban-column-blocked"]');
    this.doneColumn = page.locator('[data-testid="kanban-column-done"]');
  }

  /**
   * Navigate to the kanban page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/kanban');
    await this.heading.waitFor();
  }

  /**
   * Get a kanban column by its status ID.
   */
  getColumn(status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'): Locator {
    return this.page.locator(`[data-testid="kanban-column-${status}"]`);
  }

  /**
   * Get a task card by its title.
   */
  getTaskByTitle(title: string): Locator {
    return this.page.locator('[data-testid="kanban-card"]', { hasText: title });
  }

  /**
   * Get the column containing a specific task.
   */
  async getTaskColumn(title: string): Promise<string | null> {
    const task = this.getTaskByTitle(title);
    const column = task.locator('xpath=ancestor::*[@data-testid^="kanban-column-"]');
    const testId = await column.getAttribute('data-testid');
    return testId?.replace('kanban-column-', '') ?? null;
  }

  /**
   * Drag a task to a different column.
   */
  async dragTaskToColumn(
    taskTitle: string,
    targetColumn: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'
  ): Promise<void> {
    const task = this.getTaskByTitle(taskTitle);
    const column = this.getColumn(targetColumn);

    await task.dragTo(column);
  }

  /**
   * Click on a task card to open details.
   */
  async clickTask(title: string): Promise<void> {
    await this.getTaskByTitle(title).click();
  }

  /**
   * Get all task titles in a specific column.
   */
  async getTasksInColumn(
    status: 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'done'
  ): Promise<string[]> {
    const column = this.getColumn(status);
    const cards = column.locator('[data-testid="kanban-card"]');
    const count = await cards.count();
    const titles: string[] = [];

    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).textContent();
      if (title) titles.push(title.trim());
    }

    return titles;
  }
}
