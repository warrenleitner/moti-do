/**
 * Task data fixtures and helpers for E2E tests.
 * Provides functions to seed tasks with dependencies for graph testing.
 */
import { type Page, type APIRequestContext, request } from '@playwright/test';
import { TEST_CREDENTIALS } from './auth.fixture';

const API_BASE = 'http://localhost:8000/api';

interface TaskData {
  id?: string;
  title: string;
  description?: string;
  priority?: string;
  difficulty?: string;
  duration?: string;
  is_habit?: boolean;
  dependencies?: string[];
}

interface CreatedTask {
  id: string;
  title: string;
}

/**
 * Get authentication token from the page's localStorage.
 * Must navigate to the app first to access localStorage.
 */
async function getAuthToken(page: Page): Promise<string | null> {
  // Ensure we're on the app domain before accessing localStorage
  if (page.url() === 'about:blank' || !page.url().includes('localhost')) {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  }
  return page.evaluate(() => localStorage.getItem('auth_token'));
}

/**
 * Login via API and get auth token.
 */
async function loginAndGetToken(apiContext: APIRequestContext): Promise<string> {
  const response = await apiContext.post(`${API_BASE}/auth/login`, {
    data: {
      username: TEST_CREDENTIALS.username,
      password: TEST_CREDENTIALS.password,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to login: ${response.status()}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Create a task via API.
 */
async function createTaskViaApi(
  apiContext: APIRequestContext,
  token: string,
  taskData: TaskData
): Promise<CreatedTask> {
  const response = await apiContext.post(`${API_BASE}/tasks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'medium',
      difficulty: taskData.difficulty || 'medium',
      duration: taskData.duration || 'short',
      is_habit: taskData.is_habit || false,
      tags: [],
      subtasks: [],
      dependencies: [],
    },
  });

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to create task: ${response.status()} - ${error}`);
  }

  const task = await response.json();
  return { id: task.id, title: task.title };
}

/**
 * Add a dependency between two tasks via API.
 */
async function addDependencyViaApi(
  apiContext: APIRequestContext,
  token: string,
  taskId: string,
  dependencyId: string
): Promise<void> {
  const response = await apiContext.post(
    `${API_BASE}/tasks/${taskId}/dependencies/${dependencyId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok()) {
    const error = await response.text();
    throw new Error(`Failed to add dependency: ${response.status()} - ${error}`);
  }
}

/**
 * Seed tasks with dependencies for graph testing.
 * Creates a set of tasks with dependencies between them.
 *
 * Returns the created tasks for verification in tests.
 */
export async function seedTasksWithDependencies(
  page: Page
): Promise<{ parentTask: CreatedTask; childTask: CreatedTask; grandchildTask: CreatedTask }> {
  // Create API context
  const apiContext = await request.newContext();

  try {
    // Get token from page or login
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const timestamp = Date.now();
    const unique = Math.random().toString(36).substring(7);

    // Create parent task (no dependencies)
    const parentTask = await createTaskViaApi(apiContext, token, {
      title: `GraphParent-${unique}-${timestamp}`,
      description: 'This is the parent task',
      priority: 'high',
    });

    // Create child task
    const childTask = await createTaskViaApi(apiContext, token, {
      title: `GraphChild-${unique}-${timestamp}`,
      description: 'This task depends on parent',
      priority: 'medium',
    });

    // Create grandchild task
    const grandchildTask = await createTaskViaApi(apiContext, token, {
      title: `GraphGrandchild-${unique}-${timestamp}`,
      description: 'This task depends on child',
      priority: 'low',
    });

    // Add dependencies: child depends on parent, grandchild depends on child
    await addDependencyViaApi(apiContext, token, childTask.id, parentTask.id);
    await addDependencyViaApi(apiContext, token, grandchildTask.id, childTask.id);

    // Reload page to fetch updated tasks
    await page.reload();
    await page.waitForTimeout(500);

    return { parentTask, childTask, grandchildTask };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Seed a simple parent-child dependency pair.
 */
export async function seedSimpleDependency(
  page: Page
): Promise<{ parentTask: CreatedTask; childTask: CreatedTask }> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const timestamp = Date.now();
    const unique = Math.random().toString(36).substring(7);

    const parentTask = await createTaskViaApi(apiContext, token, {
      title: `DepParent-${unique}-${timestamp}`,
      description: 'Parent task for dependency test',
    });

    const childTask = await createTaskViaApi(apiContext, token, {
      title: `DepChild-${unique}-${timestamp}`,
      description: 'Child task that depends on parent',
    });

    await addDependencyViaApi(apiContext, token, childTask.id, parentTask.id);

    await page.reload();
    await page.waitForTimeout(500);

    return { parentTask, childTask };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Seed a task with a due date for calendar testing.
 */
export async function seedTaskWithDueDate(
  page: Page,
  dueDate: string // ISO date string like "2024-12-24T10:00:00"
): Promise<CreatedTask> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const timestamp = Date.now();
    const unique = Math.random().toString(36).substring(7);

    // Create task with due_date included in initial request
    const response = await apiContext.post(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: `CalendarTask-${unique}-${timestamp}`,
        description: 'Task with due date for calendar testing',
        priority: 'medium',
        difficulty: 'medium',
        duration: 'short',
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        due_date: dueDate,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create task with due date: ${response.status()} - ${error}`);
    }

    const task = await response.json();

    await page.reload();
    await page.waitForTimeout(500);

    return { id: task.id, title: task.title };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Complete a task via API.
 */
export async function completeTask(page: Page, taskId: string): Promise<void> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const response = await apiContext.post(`${API_BASE}/tasks/${taskId}/complete`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to complete task: ${response.status()} - ${error}`);
    }

    await page.reload();
    await page.waitForTimeout(500);
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Uncomplete a task via API.
 */
export async function uncompleteTask(page: Page, taskId: string): Promise<void> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const response = await apiContext.post(`${API_BASE}/tasks/${taskId}/uncomplete`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to uncomplete task: ${response.status()} - ${error}`);
    }

    await page.reload();
    await page.waitForTimeout(500);
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Create a task that will appear in the In Progress column.
 * Uses a due date within 1 day to trigger the in_progress status.
 */
export async function seedTaskInProgress(page: Page): Promise<CreatedTask> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const timestamp = Date.now();
    const unique = Math.random().toString(36).substring(7);

    // Set due date to 6 hours from now (within 1 day = in_progress)
    const dueDate = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    const response = await apiContext.post(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: `InProgress-${unique}-${timestamp}`,
        description: 'Task with due date soon for kanban testing',
        priority: 'medium',
        difficulty: 'medium',
        duration: 'short',
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
        due_date: dueDate,
      },
    });

    if (!response.ok()) {
      const error = await response.text();
      throw new Error(`Failed to create in-progress task: ${response.status()} - ${error}`);
    }

    const task = await response.json();

    await page.reload();
    await page.waitForTimeout(500);

    return { id: task.id, title: task.title };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Create a blocked task (task with incomplete dependency).
 */
export async function seedBlockedTask(
  page: Page
): Promise<{ blockedTask: CreatedTask; blockingTask: CreatedTask }> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    const timestamp = Date.now();
    const unique = Math.random().toString(36).substring(7);

    // Create blocking task (incomplete)
    const blockingResponse = await apiContext.post(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: `Blocking-${unique}-${timestamp}`,
        description: 'This task blocks another',
        priority: 'medium',
        difficulty: 'medium',
        duration: 'short',
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
      },
    });

    if (!blockingResponse.ok()) {
      const error = await blockingResponse.text();
      throw new Error(`Failed to create blocking task: ${blockingResponse.status()} - ${error}`);
    }

    const blockingTask = await blockingResponse.json();

    // Create blocked task (depends on incomplete blocking task)
    const blockedResponse = await apiContext.post(`${API_BASE}/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        title: `Blocked-${unique}-${timestamp}`,
        description: 'This task is blocked by dependency',
        priority: 'medium',
        difficulty: 'medium',
        duration: 'short',
        is_habit: false,
        tags: [],
        subtasks: [],
        dependencies: [],
      },
    });

    if (!blockedResponse.ok()) {
      const error = await blockedResponse.text();
      throw new Error(`Failed to create blocked task: ${blockedResponse.status()} - ${error}`);
    }

    const blockedTask = await blockedResponse.json();

    // Add dependency: blocked task depends on blocking task
    await addDependencyViaApi(apiContext, token, blockedTask.id, blockingTask.id);

    await page.reload();
    await page.waitForTimeout(500);

    return {
      blockedTask: { id: blockedTask.id, title: blockedTask.title },
      blockingTask: { id: blockingTask.id, title: blockingTask.title },
    };
  } finally {
    await apiContext.dispose();
  }
}

/**
 * Clean up test tasks by deleting them via API.
 */
export async function cleanupTasks(page: Page, taskIds: string[]): Promise<void> {
  const apiContext = await request.newContext();

  try {
    let token = await getAuthToken(page);
    if (!token) {
      token = await loginAndGetToken(apiContext);
    }

    for (const taskId of taskIds) {
      await apiContext.delete(`${API_BASE}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } finally {
    await apiContext.dispose();
  }
}
