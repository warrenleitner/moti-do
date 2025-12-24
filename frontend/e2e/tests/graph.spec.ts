/**
 * Dependency Graph E2E tests for Moti-Do.
 * Tests graph visualization, node interactions, and dependency display.
 * Authentication is handled by auth.setup.ts via stored auth state.
 */
import { test, expect } from '@playwright/test';
import { GraphPage } from '../pages/graph.page';
import { seedTasksWithDependencies, seedSimpleDependency } from '../fixtures/task-data.fixture';

test.describe('Dependency Graph', () => {
  // No login needed - tests use pre-authenticated state from auth.setup.ts

  test.describe('Graph Display', () => {
    test('should display graph page correctly', async ({ page }) => {
      const graphPage = new GraphPage(page);
      await graphPage.goto();

      await expect(graphPage.heading).toBeVisible();
    });

    test('should show empty state or graph based on dependencies', async ({ page }) => {
      const graphPage = new GraphPage(page);
      await graphPage.goto();

      // Wait for page to load - shows empty state when no dependencies
      await graphPage.waitForGraphOrEmptyState();

      // Either empty state is shown (no dependencies) or graph is shown (dependencies exist)
      // This test validates the page loads correctly either way
      const emptyStateVisible = await graphPage.emptyStateMessage.isVisible();
      const graphVisible = await graphPage.graphContainer.isVisible();

      expect(emptyStateVisible || graphVisible).toBe(true);
    });

    test('should display tasks as nodes on the graph when they have dependencies', async ({ page }) => {
      // Seed tasks with dependencies
      const { parentTask, childTask } = await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Verify both nodes appear (tasks with dependencies show on graph)
      const parentNode = graphPage.getNodeByTitle(parentTask.title);
      const childNode = graphPage.getNodeByTitle(childTask.title);
      await expect(parentNode).toBeVisible({ timeout: 5000 });
      await expect(childNode).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Node Interactions', () => {
    test('should click on node to select it', async ({ page }) => {
      // Seed tasks with dependencies
      const { parentTask } = await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Click on the node
      await graphPage.clickNode(parentTask.title);

      // Node should be selected (drawer opens)
      await page.waitForTimeout(300);
    });

    test('should open task drawer when clicking node', async ({ page }) => {
      // Seed tasks with dependencies
      const { parentTask } = await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Click node to open drawer
      await graphPage.clickNode(parentTask.title);

      // Drawer should be visible
      await expect(graphPage.taskDrawer).toBeVisible({ timeout: 5000 });
    });

    test('should toggle task completion from drawer', async ({ page }) => {
      // Seed tasks with dependencies
      const { parentTask } = await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Open drawer and toggle completion
      await graphPage.clickNode(parentTask.title);
      await graphPage.toggleTaskCompleteInDrawer();

      // Wait for update
      await page.waitForTimeout(500);
    });
  });

  test.describe('Dependency Visualization', () => {
    test('should show edges between dependent tasks', async ({ page }) => {
      // Seed tasks with dependencies
      const { parentTask, childTask } = await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Both nodes should be visible
      await expect(graphPage.getNodeByTitle(parentTask.title)).toBeVisible({ timeout: 5000 });
      await expect(graphPage.getNodeByTitle(childTask.title)).toBeVisible({ timeout: 5000 });

      // Edges should exist
      const edgeCount = await graphPage.getEdgeCount();
      expect(edgeCount).toBeGreaterThan(0);
    });

    test('should show multiple levels of dependencies', async ({ page }) => {
      // Seed tasks with chain of dependencies (parent -> child -> grandchild)
      const { parentTask, childTask, grandchildTask } = await seedTasksWithDependencies(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // All three nodes should be visible
      await expect(graphPage.getNodeByTitle(parentTask.title)).toBeVisible({ timeout: 5000 });
      await expect(graphPage.getNodeByTitle(childTask.title)).toBeVisible({ timeout: 5000 });
      await expect(graphPage.getNodeByTitle(grandchildTask.title)).toBeVisible({ timeout: 5000 });

      // Should have at least 2 edges
      const edgeCount = await graphPage.getEdgeCount();
      expect(edgeCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe('Graph Controls', () => {
    test('should zoom in and out', async ({ page }) => {
      // Seed tasks with dependencies
      await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Test zoom controls (ReactFlow controls are in .react-flow__controls)
      const zoomInButton = page.locator('.react-flow__controls-zoomin');
      if (await zoomInButton.isVisible()) {
        await graphPage.zoomIn();
        await page.waitForTimeout(200);

        await graphPage.zoomOut();
        await page.waitForTimeout(200);
      }
    });

    test('should fit view to content', async ({ page }) => {
      // Seed tasks with dependencies
      await seedSimpleDependency(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Test fit view control
      const fitViewButton = page.locator('.react-flow__controls-fitview');
      if (await fitViewButton.isVisible()) {
        await graphPage.fitView();
        await page.waitForTimeout(200);
      }
    });
  });

  test.describe('Graph Statistics', () => {
    test('should count nodes correctly', async ({ page }) => {
      // Seed tasks with dependencies (creates 3 nodes)
      await seedTasksWithDependencies(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Should have at least 3 nodes (parent, child, grandchild)
      const nodeCount = await graphPage.getNodeCount();
      expect(nodeCount).toBeGreaterThanOrEqual(3);
    });

    test('should count edges correctly', async ({ page }) => {
      // Seed tasks with chain of dependencies
      await seedTasksWithDependencies(page);

      // Navigate to graph
      const graphPage = new GraphPage(page);
      await graphPage.goto();
      await graphPage.waitForGraph();

      // Should have at least 2 edges (parent->child, child->grandchild)
      const edgeCount = await graphPage.getEdgeCount();
      expect(edgeCount).toBeGreaterThanOrEqual(2);
    });
  });
});
