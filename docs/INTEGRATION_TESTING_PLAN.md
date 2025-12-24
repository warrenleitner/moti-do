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

| Phase | Scope | Status | Tests |
|-------|-------|--------|-------|
| Phase 1 | Infrastructure | ✅ Complete | 0 (setup) |
| Phase 2 | Core Suites | ✅ Complete | ~40 tests |
| Phase 3 | Cross-Cutting | ✅ Complete | ~10 tests |
| Phase 4 | CI/CD | ✅ Complete | 0 (config) |
| Phase 5 | Page Objects | ✅ Complete | Refactoring |
| **Phase 5.5.1** | **Habit Delete Button** | ✅ Complete | **+1 test** |
| **Phase 5.5.2** | **Graph Dependency Seeding** | ✅ Complete | **+11 tests** |
| **Phase 5.5.3** | **Calendar Date Picker** | ⏳ Pending | **+3 tests** |
| **Phase 5.5.4** | **Kanban Drag-and-Drop** | ⏳ Pending | **+3 tests** |
| **Phase 5.5.5** | **Status Filter Fix** | ⏳ Pending | **+1 test** |
| **Phase 5.5.6** | **Vacation Mode Feature** | ✅ Complete | **+2 tests** |
| **Phase 5.5.7** | **XP History Feature** | ✅ Complete | **+2 tests** |
| **Phase 5.6** | **Docker/PostgreSQL** | ✅ Complete | **+9 tests** |
| **Phase 6** | **Visual Regression** | ✅ Complete | **+25 tests** |
| **Phase 7** | **Performance** | ✅ Complete | **+14 tests** |

**Current: 108 passing, 18 skipped** (after all phases through 7)
- 9 PostgreSQL tests skip when not running against PostgreSQL
- 9 tests skipped for calendar date picker (5.5.3) and kanban drag-and-drop (5.5.4)
**Target: ~110 E2E tests (achieved!)**

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

## Phase 5.5: Un-Skip Remaining Tests (Groundwork)

### Current Skipped Tests Summary

| Category | Tests Skipped | Root Cause |
|----------|---------------|------------|
| Calendar date picker | 3 | MUI DateTimePicker spinbuttons are complex |
| Dependency graph | 10 | Graph only shows tasks with dependencies |
| Kanban drag-and-drop | 3 | @hello-pangea/dnd flaky with Playwright |
| Vacation Mode | 2 | Feature doesn't exist in Settings UI |
| XP History | 2 | Feature doesn't exist in Settings UI |
| Habit deletion | 1 | No delete button on Habits page |
| Task uncomplete | 1 | Status filter selector not working |
| **Total** | **24** | |

### 5.5.1 Add Delete Button to Habit Cards

**Problem:** Habit cards only have an edit button, no delete option.

**Solution:** Add delete button to `HabitCard.tsx` component.

**Files to modify:**
- `frontend/src/components/habits/HabitCard.tsx` - Add delete icon button
- `frontend/src/pages/Habits.tsx` - Add delete handler with confirmation dialog

**Test to un-skip:**
- `habits.spec.ts: should delete a habit`

---

### 5.5.2 Add Task Dependency Creation UI

**Problem:** Graph page shows "No Dependencies" because there's no way to add dependencies in tests.

**Solution Options:**
1. **Option A (Recommended):** Seed test data with pre-created dependent tasks in `global-setup.ts`
2. **Option B:** Add dependency selection to task form (more complex)

**Files to create/modify:**
- `frontend/e2e/fixtures/seed-dependencies.ts` - Create tasks with dependencies via API
- `frontend/e2e/global-setup.ts` - Call seed function before graph tests

**Tests to un-skip:**
- `graph.spec.ts`: All 10 tests (Node Interactions, Dependency Visualization, Graph Controls, Graph Statistics)
- `cross-cutting.spec.ts`: Dependency Resolution Flow (3 tests)

---

### 5.5.3 Improve Calendar Date Picker Interaction

**Problem:** MUI DateTimePicker uses complex spinbutton interactions.

**Solution:** Use keyboard-based date entry with Tab navigation or click calendar button to open date picker popover.

**Files to modify:**
- `frontend/e2e/pages/tasks.page.ts` - Refactor `createTask` to use calendar popover
- `frontend/e2e/pages/calendar.page.ts` - Add date selection helper

**Tests to un-skip:**
- `calendar.spec.ts`: Task Display on Calendar (2 tests)
- `calendar.spec.ts`: Task Completion Status (1 test)

---

### 5.5.4 Fix Kanban Drag-and-Drop with Keyboard Navigation

**Problem:** `@hello-pangea/dnd` drag-and-drop is flaky with Playwright's `dragTo()`.

**Solution:** Use keyboard-based column changes:
1. Focus task card
2. Use keyboard shortcuts to move between columns
3. Or use API calls to change task status directly and verify UI updates

**Files to modify:**
- `frontend/e2e/pages/kanban.page.ts` - Add `moveTaskViaKeyboard()` or `moveTaskViaAPI()` method
- `frontend/e2e/tests/kanban.spec.ts` - Update drag tests to use new method

**Tests to un-skip:**
- `kanban.spec.ts`: Drag and Drop (3 tests)

---

### 5.5.5 Fix Task Status Filter

**Problem:** Status filter selector `getByLabel('Status')` not finding element.

**Solution:** Use correct selector for the filter dropdown.

**Files to modify:**
- `frontend/e2e/pages/tasks.page.ts` - Fix `statusFilter` selector

**Tests to un-skip:**
- `task-crud.spec.ts`: should mark task as incomplete

---

### 5.5.6 Implement Vacation Mode Feature

**Problem:** Vacation Mode tests exist but feature doesn't exist in Settings UI.

**Solution:** Implement Vacation Mode in Settings page:
1. Add vacation mode toggle switch to Settings page
2. When enabled, pause all streak tracking for habits
3. Store vacation start/end dates
4. Show vacation status indicator in UI

**Files to create/modify:**
- `frontend/src/pages/SettingsPage.tsx` - Add vacation mode UI section
- `frontend/src/store/userStore.ts` - Add vacation mode state
- `backend: src/motido/core/models.py` - Add vacation fields to user model
- `backend: src/motido/api/routes.py` - Add vacation mode endpoints

**Tests to un-skip:**
- `settings.spec.ts`: Vacation Mode (2 tests)

---

### 5.5.7 Implement XP History Feature

**Problem:** XP History tests exist but feature doesn't exist in Settings UI.

**Solution:** Implement XP History section in Settings page:
1. Add XP History accordion/section to Settings page
2. Display list of XP transactions with timestamps
3. Show source of XP (task completion, streak bonus, etc.)
4. Allow filtering by date range

**Files to create/modify:**
- `frontend/src/pages/SettingsPage.tsx` - Add XP History section
- `frontend/src/components/settings/XPHistory.tsx` - New XP history component
- `frontend/src/store/userStore.ts` - Add XP history state/actions
- `backend: src/motido/api/routes.py` - Add XP history endpoint (if needed)

**Tests to un-skip:**
- `settings.spec.ts`: XP History (2 tests)

---

## Phase 5.6: Docker/PostgreSQL Integration Testing

### 5.6.1 Overview

The JSON backend (`users.json`) is only for local development. Production uses PostgreSQL. We need E2E tests running against PostgreSQL to catch database-specific issues.

**Docker setup exists:** `docker-compose.test.yml` with PostgreSQL 16

### 5.6.2 Environment Configuration

**New file:** `frontend/e2e/.env.docker`
```env
DATABASE_URL=postgresql://motido_test:motido_test_password@localhost:5433/motido_test
STORAGE_BACKEND=postgresql
```

**Modify:** `playwright.config.ts` to support Docker profile
```typescript
export default defineConfig({
  projects: [
    {
      name: 'json-backend',
      use: { baseURL: 'http://localhost:5173' },
    },
    {
      name: 'postgres-backend',
      use: { baseURL: 'http://localhost:5173' },
      metadata: { requiresDocker: true },
    },
  ],
});
```

### 5.6.3 Docker Test Script

**New file:** `scripts/run-e2e-docker.sh`
```bash
#!/bin/bash
set -e

# Start PostgreSQL container
docker compose -f docker-compose.test.yml up -d
echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Run database migrations
DATABASE_URL=postgresql://motido_test:motido_test_password@localhost:5433/motido_test \
  poetry run alembic upgrade head

# Start backend with PostgreSQL
DATABASE_URL=postgresql://motido_test:motido_test_password@localhost:5433/motido_test \
  poetry run uvicorn motido.api.main:app --port 8000 &
BACKEND_PID=$!
sleep 3

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!
sleep 5

# Run E2E tests
npx playwright test --project=postgres-backend "$@"
EXIT_CODE=$?

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
docker compose -f docker-compose.test.yml down -v

exit $EXIT_CODE
```

### 5.6.4 CI Integration for Docker Tests

**Modify:** `.github/workflows/ci.yml`
```yaml
e2e-docker:
  runs-on: ubuntu-latest
  needs: [e2e-tests]  # Run after JSON backend tests pass
  services:
    postgres:
      image: postgres:16-alpine
      env:
        POSTGRES_USER: motido_test
        POSTGRES_PASSWORD: motido_test_password
        POSTGRES_DB: motido_test
      ports:
        - 5433:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v4
    - name: Run E2E tests with PostgreSQL
      env:
        DATABASE_URL: postgresql://motido_test:motido_test_password@localhost:5433/motido_test
      run: |
        cd frontend && npx playwright test --project=postgres-backend
```

### 5.6.5 Database-Specific Tests

**New file:** `frontend/e2e/tests/postgres-specific.spec.ts`

Tests that specifically verify PostgreSQL behavior:
- [ ] Data persistence after backend restart
- [ ] Concurrent user operations (race conditions)
- [ ] Large dataset handling (100+ tasks)
- [ ] Transaction rollback on errors
- [ ] Full-text search functionality (if PostgreSQL-specific)

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

### Phase 5.5 Success Criteria (Un-Skip Tests + Implement Missing Features)
- [x] Habit deletion test un-skipped and passing (5.5.1)
- [x] Dependency graph tests un-skipped and passing - 13 tests (5.5.2)
- [ ] Calendar date picker tests un-skipped and passing - 3 tests (5.5.3)
- [ ] Kanban drag-and-drop tests un-skipped and passing - 3 tests (5.5.4)
- [ ] Task status filter fixed and test passing - 1 test (5.5.5)
- [ ] Vacation Mode feature implemented and tests passing - 2 tests (5.5.6)
- [ ] XP History feature implemented and tests passing - 2 tests (5.5.7)
- [ ] **Target: 85+ tests passing, 0 skipped**

### Phase 5.6 Success Criteria (Docker/PostgreSQL)
- [x] PostgreSQL test container starts and is healthy (`docker-compose.test.yml`)
- [x] All E2E tests pass with PostgreSQL backend (via `./scripts/run-e2e.sh`)
- [x] `scripts/run-e2e.sh` works locally (default uses PostgreSQL, `--no-docker` for JSON)
- [x] CI runs E2E tests against PostgreSQL (configured in GitHub Actions)
- [x] Database-specific tests verify PostgreSQL behavior (`postgres-specific.spec.ts` - 9 tests)
- [x] Tests skip gracefully when not running against PostgreSQL

### Phase 6-7 Success Criteria (Visual/Performance)
- [x] Visual regression baseline established (21 screenshots in e2e/snapshots/)
- [x] Performance budgets defined and enforced (LCP, CLS, bundle size)
- [x] Tests complete in under 5 minutes (Chromium only) - 4.4 minutes
- [x] Test reports and screenshots uploaded as artifacts (playwright-report/)
- [x] Local `scripts/run-e2e.sh` works for developers
- [x] Page objects cover all major pages
