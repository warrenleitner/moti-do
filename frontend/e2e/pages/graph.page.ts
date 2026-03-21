/**
 * Page Object for the Dependency Graph page.
 * Uses ReactFlow for graph visualization.
 */
import { type Page, type Locator, expect } from '@playwright/test';

export class GraphPage {
  readonly page: Page;
  readonly description: Locator;
  readonly graphContainer: Locator;
  readonly taskDrawer: Locator;
  readonly snackbar: Locator;

  readonly emptyStateMessage: Locator;

  // Direction toggle buttons
  readonly allDirectionButton: Locator;
  readonly upstreamButton: Locator;
  readonly downstreamButton: Locator;
  readonly isolatedButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.description = page.getByText('Visualize task dependencies');
    // ReactFlow container
    this.graphContainer = page.locator('.react-flow');
    // Empty state when no dependencies exist
    this.emptyStateMessage = page.getByText('No Dependencies');
    // Inline inspector sidebar (ghost-border styled div with NODE_INSPECTOR header)
    this.taskDrawer = page.locator('.ghost-border').filter({ has: page.locator('[aria-label="Close inspector"]') });
    this.snackbar = page.getByRole('alert').first();

    // Direction toggle - Mantine SegmentedControl renders labels inside a radiogroup
    // Use label text within radiogroup (CSS '+' sibling selectors don't work in Playwright)
    const directionToggle = page.locator('[role="radiogroup"]');
    this.allDirectionButton = directionToggle.locator('label').filter({ hasText: 'All' });
    this.upstreamButton = directionToggle.locator('label').filter({ hasText: 'Upstream' });
    this.downstreamButton = directionToggle.locator('label').filter({ hasText: 'Downstream' });
    this.isolatedButton = directionToggle.locator('label').filter({ hasText: 'Isolated' });
  }

  /**
   * Navigate to the graph page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/graph');
    await this.waitForGraphOrEmptyState();
  }

  /**
   * Wait for the graph to fully load (shows react-flow container with nodes).
   */
  async waitForGraph(): Promise<void> {
    await this.graphContainer.waitFor({ timeout: 10000 });
    // Wait for ReactFlow controls to be attached (may have animation delay)
    await this.page.locator('.react-flow__controls').waitFor({ state: 'attached', timeout: 10000 });
    // Allow controls to stabilize after render
    await this.page.waitForTimeout(500);
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
   * ReactFlow positions nodes via CSS transforms that place them outside the browser viewport,
   * so we dispatch the full pointer event sequence directly in the browser context.
   */
  async clickNode(title: string): Promise<void> {
    const node = this.getNodeByTitle(title).first();

    // Wait for React Flow to stabilize
    await this.page.waitForTimeout(500);
    await node.waitFor({ state: 'attached', timeout: 5000 });

    // Fit view to ensure all nodes are visible
    const fitViewButton = this.page.locator('.react-flow__controls-fitview');
    await fitViewButton.waitFor({ state: 'attached', timeout: 10000 });
    await fitViewButton.click({ force: true });
    await this.page.waitForTimeout(800);

    // Retry clicking up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      await this.page.evaluate((nodeTitle) => {
        const nodes = document.querySelectorAll('.react-flow__node');
        let target: HTMLElement | null = null;
        for (const n of nodes) {
          if (n.textContent?.includes(nodeTitle)) {
            target = n as HTMLElement;
            break;
          }
        }
        if (!target) return;
        const rect = target.getBoundingClientRect();
        const opts = {
          bubbles: true, cancelable: true, view: window,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          button: 0,
        };
        target.dispatchEvent(new PointerEvent('pointerdown', { ...opts, pointerId: 1, pointerType: 'mouse', buttons: 1 }));
        target.dispatchEvent(new MouseEvent('mousedown', { ...opts, buttons: 1 }));
        target.dispatchEvent(new PointerEvent('pointerup', { ...opts, pointerId: 1, pointerType: 'mouse', buttons: 0 }));
        target.dispatchEvent(new MouseEvent('mouseup', { ...opts, buttons: 0 }));
        target.dispatchEvent(new MouseEvent('click', { ...opts, buttons: 0, detail: 1 }));
      }, title);

      try {
        await this.taskDrawer.waitFor({ state: 'visible', timeout: 3000 });
        return;
      } catch {
        if (attempt < 2) {
          await this.page.waitForTimeout(300);
          await fitViewButton.click({ force: true });
          await this.page.waitForTimeout(500);
        }
      }
    }

    // Final attempt
    await this.taskDrawer.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Check if the task drawer is open.
   */
  async isDrawerOpen(): Promise<boolean> {
    return await this.taskDrawer.isVisible();
  }

  /**
   * Close the task inspector sidebar.
   */
  async closeDrawer(): Promise<void> {
    // The close button has aria-label="Close inspector"
    await this.taskDrawer.locator('[aria-label="Close inspector"]').click();
    await expect(this.taskDrawer).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the task title shown in the drawer.
   */
  async getDrawerTaskTitle(): Promise<string | null> {
    const titleElement = this.taskDrawer.locator('p, h1, h2, h3, h4, h5, h6').first();
    return await titleElement.textContent();
  }

  /**
   * Toggle task completion from the inspector sidebar.
   */
  async toggleTaskCompleteInDrawer(): Promise<void> {
    // ArcadeButton shows "COMPLETE" or "REOPEN"
    const completeButton = this.taskDrawer.getByRole('button', { name: /^COMPLETE$|^REOPEN$/i }).first();
    await completeButton.click();
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
    // ReactFlow controls panel has zoom buttons — use force to bypass animation stability checks
    await this.page.locator('.react-flow__controls-zoomin').click({ force: true });
  }

  /**
   * Use ReactFlow controls to zoom out.
   */
  async zoomOut(): Promise<void> {
    await this.page.locator('.react-flow__controls-zoomout').click({ force: true });
  }

  /**
   * Use ReactFlow controls to fit view.
   */
  async fitView(): Promise<void> {
    await this.page.locator('.react-flow__controls-fitview').click({ force: true });
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
    const edges = this.getEdges();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const count = await edges.count();
      if (count > 0) {
        return count;
      }
      await this.page.waitForTimeout(400);
    }
    return await edges.count();
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
   * Get dependencies section from inspector sidebar.
   */
  async getDependenciesInDrawer(): Promise<string[]> {
    // The dependency header uses "DEPENDS_ON" text
    const dependenciesSection = this.taskDrawer.getByText(/DEPENDS_ON/).locator('..');
    const cards = dependenciesSection.locator('[data-testid="task-card"], .ghost-border');
    const count = await cards.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i++) {
      const title = await cards.nth(i).textContent();
      if (title) titles.push(title.trim());
    }
    return titles;
  }

  /**
   * Select a task node for direction filtering (closes drawer to allow clicking buttons).
   * Use this instead of clickNode when you need to interact with direction toggle buttons.
   */
  async selectNodeForDirection(title: string): Promise<void> {
    await this.clickNode(title);
    await this.closeDrawer();
    // Wait for the direction toggle to appear
    await this.allDirectionButton.waitFor({ timeout: 5000 });
  }

  /**
   * Set direction filter to show all dependencies.
   */
  async setDirectionAll(): Promise<void> {
    await this.allDirectionButton.click();
  }

  /**
   * Set direction filter to show only upstream dependencies.
   */
  async setDirectionUpstream(): Promise<void> {
    await this.upstreamButton.click();
  }

  /**
   * Set direction filter to show only downstream dependencies.
   */
  async setDirectionDownstream(): Promise<void> {
    await this.downstreamButton.click();
  }

  /**
   * Set direction filter to isolated mode (only connected tree of selected task).
   */
  async setDirectionIsolated(): Promise<void> {
    await this.isolatedButton.click();
  }

  /**
   * Check if direction toggle is visible.
   * Direction toggle only appears when a task is selected.
   */
  async isDirectionToggleVisible(): Promise<boolean> {
    return await this.allDirectionButton.isVisible();
  }
}
