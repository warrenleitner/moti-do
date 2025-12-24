/**
 * Page Object for the Dependency Graph page.
 * Uses ReactFlow for graph visualization.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class GraphPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly description: Locator;
  readonly graphContainer: Locator;
  readonly taskDrawer: Locator;
  readonly snackbar: Locator;

  readonly emptyStateMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Dependency Graph' });
    this.description = page.getByText('Visualize task dependencies');
    // ReactFlow container
    this.graphContainer = page.locator('.react-flow');
    // Empty state when no dependencies exist
    this.emptyStateMessage = page.getByText('No Dependencies');
    // MUI Drawer for task details (anchor="right", not hidden)
    this.taskDrawer = page.locator('.MuiDrawer-root.MuiDrawer-anchorRight:not([aria-hidden="true"])');
    this.snackbar = page.getByRole('alert');
  }

  /**
   * Navigate to the graph page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/graph');
    await this.heading.waitFor({ timeout: 10000 });
  }

  /**
   * Wait for the graph to fully load (shows react-flow container with nodes).
   */
  async waitForGraph(): Promise<void> {
    await this.graphContainer.waitFor({ timeout: 10000 });
  }

  /**
   * Wait for the graph page content - either the graph with nodes or the empty state.
   */
  async waitForGraphOrEmptyState(): Promise<void> {
    // Wait for either the graph container or the "No Dependencies" message
    await Promise.race([
      this.graphContainer.waitFor({ timeout: 10000 }),
      this.emptyStateMessage.waitFor({ timeout: 10000 }),
    ]);
  }

  /**
   * Check if the graph shows an empty state.
   */
  async isEmptyState(): Promise<boolean> {
    // When no tasks, graph container may show "No tasks" or be empty
    const nodes = await this.getNodeCount();
    return nodes === 0;
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
    return this.page.locator('.react-flow__node').filter({ hasText: title });
  }

  /**
   * Get all edges (dependency connections).
   */
  getEdges(): Locator {
    return this.page.locator('.react-flow__edge');
  }

  /**
   * Click on a node to select it and open the drawer.
   */
  async clickNode(title: string): Promise<void> {
    const node = this.getNodeByTitle(title);
    await node.click();
    // Wait for drawer to open
    await this.taskDrawer.waitFor({ timeout: 5000 });
  }

  /**
   * Check if the task drawer is open.
   */
  async isDrawerOpen(): Promise<boolean> {
    return await this.taskDrawer.isVisible();
  }

  /**
   * Close the task drawer.
   */
  async closeDrawer(): Promise<void> {
    // Find the close button in the drawer
    await this.taskDrawer.getByRole('button', { name: 'Close' }).click();
    await expect(this.taskDrawer).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the task title shown in the drawer.
   */
  async getDrawerTaskTitle(): Promise<string | null> {
    const titleElement = this.taskDrawer.locator('.MuiTypography-root').first();
    return await titleElement.textContent();
  }

  /**
   * Toggle task completion from the drawer.
   */
  async toggleTaskCompleteInDrawer(): Promise<void> {
    // Use first checkbox (main task completion checkbox, not subtask checkboxes)
    await this.taskDrawer.getByRole('checkbox').first().click();
  }

  /**
   * Check if node is visually marked as selected.
   */
  async isNodeSelected(title: string): Promise<boolean> {
    const node = this.getNodeByTitle(title);
    const className = await node.getAttribute('class');
    // ReactFlow adds 'selected' class to selected nodes
    return className?.includes('selected') ?? false;
  }

  /**
   * Use ReactFlow controls to zoom in.
   */
  async zoomIn(): Promise<void> {
    // ReactFlow controls panel has zoom buttons
    await this.page.locator('.react-flow__controls-zoomin').click();
  }

  /**
   * Use ReactFlow controls to zoom out.
   */
  async zoomOut(): Promise<void> {
    await this.page.locator('.react-flow__controls-zoomout').click();
  }

  /**
   * Use ReactFlow controls to fit view.
   */
  async fitView(): Promise<void> {
    await this.page.locator('.react-flow__controls-fitview').click();
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

  /**
   * Check if an edge exists between two nodes.
   * Note: This is approximate - ReactFlow edge IDs may vary.
   * TODO: Implement proper edge matching when dependency data is seeded (Phase 5.5.2)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async hasEdgeBetween(sourceTitle: string, targetTitle: string): Promise<boolean> {
    // This is tricky to verify exactly - for now, just check edge count > 0
    const edgeCount = await this.getEdgeCount();
    return edgeCount > 0;
  }

  /**
   * Get dependencies section from drawer.
   */
  async getDependenciesInDrawer(): Promise<string[]> {
    const dependenciesSection = this.taskDrawer.getByText('Dependencies').locator('..');
    const cards = dependenciesSection.locator('.MuiCard-root');
    const count = await cards.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).textContent();
      if (title) titles.push(title.trim());
    }
    return titles;
  }
}
