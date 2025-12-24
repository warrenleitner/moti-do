# Integration Testing Implementation Plan for Moti-Do

## Executive Summary

The Moti-Do codebase has strong unit testing (100% coverage) but lacks integration and E2E tests. Many UI components are excluded from coverage with notes like "tested via integration tests" that **don't actually exist**. This plan addresses that gap.

## Current State

| Aspect | Status |
|--------|--------|
| Unit Tests | ✅ 525 frontend + 935 backend tests passing |
| Coverage | ✅ 100% enforced |
| E2E Framework | ❌ None installed |
| Integration Tests | ❌ Only 1 Python file (scoring) |
| Docker Setup | ❌ None |

## Recommended Approach: Playwright for E2E Testing

**Why Playwright over Cypress:**
- Native TypeScript support (matches frontend stack)
- Multi-browser support (Chromium, Firefox, WebKit)
- Better async/await handling
- Parallel test execution built-in
- API testing support (can test backend directly)
- Auto-wait for elements (reduces flakiness)

---

## Phase 1: Infrastructure Setup

### 1.1 Install Playwright

**Files to modify:**
- `frontend/package.json` - Add Playwright dependencies
- `frontend/playwright.config.ts` - Create configuration
- `.github/workflows/ci.yml` - Add E2E job

**Dependencies:**
```json
{
  "devDependencies": {
    "@playwright/test": "^1.40.0"
  }
}
```

### 1.2 Create Test Infrastructure

**New directory structure:**
```
frontend/
├── e2e/
│   ├── fixtures/
│   │   ├── auth.fixture.ts      # Login/auth helpers
│   │   ├── task.fixture.ts      # Task creation helpers
│   │   └── base.fixture.ts      # Extended test with fixtures
│   ├── pages/
│   │   ├── login.page.ts        # Login page object
│   │   ├── tasks.page.ts        # Tasks page object
│   │   ├── calendar.page.ts     # Calendar page object
│   │   ├── kanban.page.ts       # Kanban page object
│   │   ├── habits.page.ts       # Habits page object
│   │   └── graph.page.ts        # Graph page object
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── task-crud.spec.ts
│   │   ├── calendar.spec.ts
│   │   ├── kanban.spec.ts
│   │   ├── habits.spec.ts
│   │   ├── graph.spec.ts
│   │   └── settings.spec.ts
│   └── global-setup.ts          # Start backend server
├── playwright.config.ts
```

### 1.3 Backend Test Server Setup

**New file:** `scripts/start-test-server.sh`
- Starts backend with test database
- Uses ephemeral JSON storage
- Cleans up between test runs

---

## Phase 2: Core Test Suites

### 2.1 Authentication Flow (`auth.spec.ts`)

**Scenarios:**
- [ ] User registration (first-time setup)
- [ ] Login with valid credentials
- [ ] Login with invalid credentials (error message)
- [ ] Password change flow
- [ ] Logout and redirect to login
- [ ] Protected route redirect when not authenticated

### 2.2 Task CRUD Operations (`task-crud.spec.ts`)

**Scenarios:**
- [ ] Create task with minimal fields (title only)
- [ ] Create task with all fields (priority, difficulty, duration, due date, tags, subtasks, dependencies)
- [ ] Edit existing task
- [ ] Delete task with confirmation dialog
- [ ] Mark task complete → verify XP increase
- [ ] Mark task incomplete → verify state change
- [ ] Toggle subtask completion
- [ ] View mode toggle (list vs table)

### 2.3 Calendar View (`calendar.spec.ts`)

**Scenarios:**
- [ ] View tasks on calendar
- [ ] Click date to create new task (date pre-filled)
- [ ] Click task event to view details
- [ ] Drag task to reschedule (due date changes)
- [ ] Filter by project
- [ ] Completed tasks appear grayed
- [ ] Overdue tasks appear in red

### 2.4 Kanban Board (`kanban.spec.ts`)

**Scenarios:**
- [ ] View tasks in correct columns (backlog, todo, in_progress, blocked, done)
- [ ] Drag task to different column → status changes
- [ ] Move to "Done" → task marked complete
- [ ] Move from "Done" → task marked incomplete
- [ ] Filter by project and tag
- [ ] Blocked tasks appear in blocked column

### 2.5 Habits Management (`habits.spec.ts`)

**Scenarios:**
- [ ] Create habit with recurrence rule
- [ ] Complete habit → streak increments
- [ ] Complete habit on consecutive days → streak grows
- [ ] View heatmap visualization
- [ ] Edit habit details
- [ ] Delete habit

### 2.6 Dependency Graph (`graph.spec.ts`)

**Scenarios:**
- [ ] View graph with connected tasks
- [ ] Click node to select task
- [ ] View task details in drawer
- [ ] Toggle completion from drawer
- [ ] Pan and zoom graph
- [ ] Blocked tasks show correct styling

### 2.7 Settings Page (`settings.spec.ts`)

**Scenarios:**
- [ ] Export user data
- [ ] Import user data
- [ ] Toggle vacation mode
- [ ] Change password
- [ ] View XP history

---

## Phase 3: Cross-Cutting Flows

### 3.1 Full User Journey Test

**Scenario: New user onboarding**
1. Register new user
2. Land on dashboard
3. Create first task
4. Navigate to Tasks page → verify task appears
5. Navigate to Calendar → verify task on calendar
6. Navigate to Kanban → verify task in backlog
7. Mark task complete
8. Verify XP awarded on dashboard
9. Check badge earned (if applicable)

### 3.2 Data Consistency Test

**Scenario: Task state across views**
1. Create task on Tasks page
2. Navigate to Calendar → verify visible
3. Drag to reschedule on Calendar
4. Navigate to Tasks → verify due date updated
5. Navigate to Kanban → verify correct column
6. Mark complete on Kanban
7. Navigate to Tasks → verify completed state
8. Navigate to Dashboard → verify stats updated

### 3.3 Dependency Resolution Test

**Scenario: Task dependencies**
1. Create Task A
2. Create Task B with dependency on A
3. Navigate to Graph → verify connection shown
4. Try to complete Task B → verify blocked
5. Complete Task A
6. Complete Task B → verify now allowed
7. Verify XP includes dependency bonus

---

## Phase 4: CI/CD Integration

### 4.1 GitHub Actions Workflow Addition

**Modify:** `.github/workflows/ci.yml`

```yaml
e2e-tests:
  runs-on: ubuntu-latest
  needs: [frontend-build, python-test]
  steps:
    - uses: actions/checkout@v4
    - name: Setup Node.js
      uses: actions/setup-node@v4
    - name: Setup Python
      uses: actions/setup-python@v5
    - name: Install dependencies
      run: |
        cd frontend && npm ci
        npx playwright install --with-deps chromium
        poetry install
    - name: Start backend
      run: |
        poetry run uvicorn motido.api.main:app --host 0.0.0.0 --port 8000 &
        sleep 5
    - name: Run E2E tests
      run: cd frontend && npx playwright test
    - name: Upload test results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: frontend/playwright-report/
```

### 4.2 Local Test Script

**New file:** `scripts/run-e2e.sh`

```bash
#!/bin/bash
# Start backend in background
poetry run uvicorn motido.api.main:app --port 8000 &
BACKEND_PID=$!
sleep 3

# Run E2E tests
cd frontend
npx playwright test "$@"
EXIT_CODE=$?

# Cleanup
kill $BACKEND_PID
exit $EXIT_CODE
```

---

## Phase 5: Page Object Model Implementation

### Example: Tasks Page Object

```typescript
// frontend/e2e/pages/tasks.page.ts
import { Page, Locator } from '@playwright/test';

export class TasksPage {
  readonly page: Page;
  readonly newTaskButton: Locator;
  readonly taskList: Locator;
  readonly taskForm: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newTaskButton = page.getByRole('button', { name: /new task/i });
    this.taskList = page.getByTestId('task-list');
    this.taskForm = page.getByRole('dialog');
  }

  async goto() {
    await this.page.goto('/tasks');
  }

  async createTask(title: string, options?: {
    priority?: string;
    dueDate?: string;
    tags?: string[];
  }) {
    await this.newTaskButton.click();
    await this.page.fill('[name="title"]', title);
    if (options?.priority) {
      await this.page.selectOption('[name="priority"]', options.priority);
    }
    await this.page.click('button[type="submit"]');
    await this.taskForm.waitFor({ state: 'hidden' });
  }

  async completeTask(title: string) {
    const taskRow = this.page.locator(`text=${title}`).locator('..');
    await taskRow.getByRole('checkbox').click();
  }
}
```

---

## Implementation Timeline

| Phase | Scope | Estimated Tests |
|-------|-------|-----------------|
| Phase 1 | Infrastructure | 0 (setup only) |
| Phase 2 | Core Suites | ~40 tests |
| Phase 3 | Cross-Cutting | ~10 tests |
| Phase 4 | CI/CD | 0 (config only) |
| Phase 5 | Page Objects | Refactoring |

**Total: ~50 E2E tests**

---

## Files to Create/Modify

### New Files:
1. `frontend/playwright.config.ts`
2. `frontend/e2e/fixtures/base.fixture.ts`
3. `frontend/e2e/fixtures/auth.fixture.ts`
4. `frontend/e2e/pages/*.page.ts` (6 files)
5. `frontend/e2e/tests/*.spec.ts` (7 files)
6. `frontend/e2e/global-setup.ts`
7. `scripts/run-e2e.sh`
8. `scripts/start-test-server.sh`

### Modified Files:
1. `frontend/package.json` - Add Playwright
2. `.github/workflows/ci.yml` - Add E2E job
3. `CLAUDE.md` - Document E2E testing commands

---

## Success Criteria

- [ ] All 50+ E2E tests pass
- [ ] Tests run in CI on every PR
- [ ] Tests complete in under 5 minutes
- [ ] Test reports uploaded as artifacts
- [ ] Local `scripts/run-e2e.sh` works for developers
- [ ] Page objects cover all major pages
- [ ] Cross-cutting flows validate data consistency

---

## Configuration Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test Data | Shared database with cleanup | Faster execution, cleanup hooks between tests |
| Browsers | Chromium only | Fastest CI, covers majority of users |
| CI Blocking | Yes (blocking) | Ensures quality, prevents regressions |
| Visual Testing | Yes | Screenshot comparisons for UI consistency |
| Performance | Yes | Track page load times and Core Web Vitals |

---

## Phase 6: Visual Regression Testing

### 6.1 Screenshot Comparisons

**Configuration in `playwright.config.ts`:**
```typescript
export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 100,
      threshold: 0.2,
    },
  },
  snapshotDir: './e2e/snapshots',
});
```

**Key Screenshots to Capture:**
- [ ] Dashboard (empty state)
- [ ] Dashboard (with data)
- [ ] Tasks page (list view)
- [ ] Tasks page (table view)
- [ ] Calendar (month view)
- [ ] Kanban board (all columns)
- [ ] Dependency graph
- [ ] Task form (create mode)
- [ ] Task form (edit mode)

**New test file:** `frontend/e2e/tests/visual.spec.ts`

---

## Phase 7: Performance Metrics

### 7.1 Core Web Vitals Tracking

**Metrics to capture:**
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)
- Time to First Byte (TTFB)

**Implementation:**
```typescript
// frontend/e2e/tests/performance.spec.ts
test('dashboard loads within performance budget', async ({ page }) => {
  await page.goto('/');

  const metrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        resolve({
          lcp: entries.find(e => e.entryType === 'largest-contentful-paint')?.startTime,
          cls: entries.find(e => e.entryType === 'layout-shift')?.value,
        });
      }).observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
    });
  });

  expect(metrics.lcp).toBeLessThan(2500); // Good LCP < 2.5s
});
```

### 7.2 Performance Budget

| Page | LCP Target | Bundle Size Limit |
|------|------------|-------------------|
| Dashboard | < 2.0s | 500KB |
| Tasks | < 2.5s | 600KB |
| Calendar | < 3.0s | 800KB (FullCalendar) |
| Kanban | < 2.5s | 600KB |
| Graph | < 3.0s | 700KB (React Flow) |

---

## Updated File List

### New Files (24 total):
1. `frontend/playwright.config.ts`
2. `frontend/e2e/fixtures/base.fixture.ts`
3. `frontend/e2e/fixtures/auth.fixture.ts`
4. `frontend/e2e/fixtures/cleanup.fixture.ts` (for shared DB cleanup)
5. `frontend/e2e/pages/login.page.ts`
6. `frontend/e2e/pages/tasks.page.ts`
7. `frontend/e2e/pages/calendar.page.ts`
8. `frontend/e2e/pages/kanban.page.ts`
9. `frontend/e2e/pages/habits.page.ts`
10. `frontend/e2e/pages/graph.page.ts`
11. `frontend/e2e/tests/auth.spec.ts`
12. `frontend/e2e/tests/task-crud.spec.ts`
13. `frontend/e2e/tests/calendar.spec.ts`
14. `frontend/e2e/tests/kanban.spec.ts`
15. `frontend/e2e/tests/habits.spec.ts`
16. `frontend/e2e/tests/graph.spec.ts`
17. `frontend/e2e/tests/settings.spec.ts`
18. `frontend/e2e/tests/visual.spec.ts`
19. `frontend/e2e/tests/performance.spec.ts`
20. `frontend/e2e/tests/cross-cutting.spec.ts`
21. `frontend/e2e/global-setup.ts`
22. `frontend/e2e/global-teardown.ts`
23. `scripts/run-e2e.sh`
24. `scripts/start-test-server.sh`

### Modified Files:
1. `frontend/package.json` - Add Playwright + dependencies
2. `.github/workflows/ci.yml` - Add blocking E2E job
3. `CLAUDE.md` - Document E2E commands

---

## Updated Success Criteria

- [ ] All 50+ E2E tests pass
- [ ] Tests run as **blocking** CI check on every PR
- [ ] Tests complete in under 5 minutes (Chromium only)
- [ ] Test reports and screenshots uploaded as artifacts
- [ ] Visual regression baseline established
- [ ] Performance budgets defined and enforced
- [ ] Local `scripts/run-e2e.sh` works for developers
- [ ] Shared database cleanup works reliably
- [ ] Page objects cover all major pages
