/**
 * Page Object for the Dependency Graph page.
 */
import { type Page, type Locator } from '@playwright/test';

export class GraphPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly graphContainer: Locator;
  readonly taskDrawer: Locator;
  readonly zoomInButton: Locator;
  readonly zoomOutButton: Locator;
  readonly fitViewButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Graph' });
    this.graphContainer = page.locator('.react-flow');
    this.taskDrawer = page.locator('[data-testid="task-drawer"]');
    this.zoomInButton = page.getByRole('button', { name: /zoom in/i });
    this.zoomOutButton = page.getByRole('button', { name: /zoom out/i });
    this.fitViewButton = page.getByRole('button', { name: /fit view/i });
  }

  /**
   * Navigate to the graph page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/graph');
    await this.heading.waitFor();
  }

  /**
   * Wait for the graph to fully load.
   */
  async waitForGraph(): Promise<void> {
    await this.graphContainer.waitFor();
  }

  /**
   * Get all task nodes on the graph.
   */
  getNodes(): Locator {
    return this.page.locator('.react-flow__node');
  }

  /**
   * Get a specific node by its task title.
   */
  getNodeByTitle(title: string): Locator {
    return this.page.locator('.react-flow__node', { hasText: title });
  }

  /**
   * Get all edges (dependency connections).
   */
  getEdges(): Locator {
    return this.page.locator('.react-flow__edge');
  }

  /**
   * Click on a node to select it.
   */
  async clickNode(title: string): Promise<void> {
    await this.getNodeByTitle(title).click();
  }

  /**
   * Check if a node is selected.
   */
  async isNodeSelected(title: string): Promise<boolean> {
    const node = this.getNodeByTitle(title);
    const className = await node.getAttribute('class');
    return className?.includes('selected') ?? false;
  }

  /**
   * Open the task drawer for a node.
   */
  async openTaskDrawer(title: string): Promise<void> {
    await this.clickNode(title);
    await this.taskDrawer.waitFor();
  }

  /**
   * Close the task drawer.
   */
  async closeTaskDrawer(): Promise<void> {
    await this.page.getByRole('button', { name: /close/i }).click();
  }

  /**
   * Toggle task completion from the drawer.
   */
  async toggleTaskComplete(): Promise<void> {
    await this.taskDrawer.getByRole('checkbox').click();
  }

  /**
   * Zoom in on the graph.
   */
  async zoomIn(): Promise<void> {
    await this.zoomInButton.click();
  }

  /**
   * Zoom out on the graph.
   */
  async zoomOut(): Promise<void> {
    await this.zoomOutButton.click();
  }

  /**
   * Fit the graph to the viewport.
   */
  async fitView(): Promise<void> {
    await this.fitViewButton.click();
  }

  /**
   * Get the number of visible nodes.
   */
  async getNodeCount(): Promise<number> {
    return await this.getNodes().count();
  }

  /**
   * Get the number of visible edges.
   */
  async getEdgeCount(): Promise<number> {
    return await this.getEdges().count();
  }
}
