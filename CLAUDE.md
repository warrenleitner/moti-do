# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build/Test Commands

### All Checks (Python + Frontend + E2E) - Sign-Off Workflow
- **Run all checks**: `bash scripts/check-all.sh` (recommended)
  - This is our **sign-off workflow** - run this before considering any work complete
  - Runs ALL checks including E2E tests, matching CI/CD pipeline behavior exactly
  - Uses LOCAL Docker PostgreSQL (not Supabase) - no cloud resources consumed
- **Skip E2E tests**: `bash scripts/check-all.sh --skip-e2e` or `--unit-only`
  - Runs only unit tests (faster, no Docker required)
  - Use sparingly - E2E tests are part of our quality standard

### Python Backend
- Format code: `poetry run poe format`
- Lint code: `poetry run poe lint`
- Type check: `poetry run poe typecheck`
- Run all tests: `poetry run poe test`
- Run a single test: `poetry run pytest tests/test_file.py::test_function_name -v`
- Run tests with coverage: `poetry run poe coverage`
- Python-only checks: `poetry run poe check-python`

### Frontend (from frontend/ directory)
- Lint: `npm run lint`
- Type check: `npx tsc --noEmit`
- Run tests: `npm run test`
- Build: `npm run build`
- All frontend checks: `poetry run poe frontend-check` (from project root)

### E2E Tests (Playwright)
- Run all E2E tests: `bash scripts/run-e2e.sh` (from project root)
- Run E2E with Playwright UI: `bash scripts/run-e2e.sh --ui`
- Run E2E in headed browser: `bash scripts/run-e2e.sh --headed`
- Keep Docker DB running after tests: `bash scripts/run-e2e.sh --keep-db`
- Use JSON storage instead of Docker: `bash scripts/run-e2e.sh --no-docker`

**Note**: E2E tests use a **Docker PostgreSQL** container for realistic database testing (port 5433). The script starts Docker, backend, and frontend servers automatically. No cloud resources (Supabase) are consumed.

### Visual Regression Tests
- Run visual tests: `cd frontend && npx playwright test visual.spec.ts`
- Update baselines: `cd frontend && npx playwright test visual.spec.ts --update-snapshots`
- Baselines stored in: `frontend/e2e/snapshots/`

**Important**: Visual baselines MUST be committed to git. When you make intentional UI changes:
1. Run `--update-snapshots` to regenerate baselines
2. Review the new screenshots to verify they're correct
3. Commit the updated baselines with your UI changes

### Performance Tests
- Run performance tests: `cd frontend && npx playwright test performance.spec.ts`
- Tests measure: LCP, FCP, CLS, DOM load times, bundle sizes, API response times

**Performance Budgets**:
- LCP < 2.5-3.5s (depending on page complexity)
- CLS < 0.1-0.15
- Page navigation < 4s

## Code Style Guidelines
- Python 3.9+ compatible code with type hints (checked by mypy)
- Line length: 88 characters (Black default)
- Imports: Use isort with Black profile (multi_line_output=3, include_trailing_comma=True)
- Naming: snake_case for variables/functions, PascalCase for classes, UPPER_CASE for constants
- Error handling: Use specific exceptions with descriptive error messages
- Documentation: Docstrings for modules, classes, and functions (triple quotes)
- Testing: Use pytest, aim for 100% test coverage
- Follow Pylint guidelines, minimum score 10.0
- Use Enum classes for constants with limited values (Priority, Difficulty, Duration)

## Development Requirements
When implementing features or modifications for Moti-Do, you MUST:

1. Analyze the impact of changes across the entire project structure (motido.core, motido.data, motido.cli)
2. Write clear, readable, efficient, and well-commented Python code
3. Adhere to Black formatting and isort import sorting rules
4. Use appropriate type hints for all function signatures and significant variables
5. Write comprehensive pytest unit tests for ALL new functionality or modified logic
6. Ensure all existing and new tests pass successfully after changes
7. Aim for high test coverage for new/modified code
8. Consider how changes affect existing tests and update them as needed
9. Use Poetry for managing dependencies (pyproject.toml)
10. Verify compliance with `bash scripts/check-all.sh` before submitting (sign-off workflow)

## Feature Development Workflow - MANDATORY

### One Feature, One Commit, One CI Run
When implementing multiple features, you MUST follow this incremental workflow:

1. **Complete ONE feature at a time** - Do not batch multiple features together
2. **Run full checks including E2E** - Never skip E2E tests (`bash scripts/check-all.sh` without `--skip-e2e`)
3. **Commit the feature** - Create a focused commit for that single feature
4. **Wait for CI** - Let GitHub Actions run and verify the feature passes in CI
5. **Only then proceed** - Start the next feature only after CI passes

**Why this matters:**
- Smaller commits are easier to review and debug
- CI catches environment-specific issues early
- Rollbacks are simpler if a feature causes problems
- Each feature gets proper validation before building on it

**NEVER do this:**
- Implement 3+ features in one session without committing
- Skip E2E tests to "save time"
- Batch all features into one giant commit
- Proceed to the next feature before CI passes

### E2E Test Requirements for New Features
Every new user-facing feature MUST have E2E test coverage. This is not optional.

**When to add E2E tests:**
- New UI components that users interact with (buttons, forms, toggles)
- New user workflows or navigation paths
- New API endpoints that affect user-visible behavior
- Changes to existing workflows

**E2E test locations:**
- `frontend/e2e/` - Main E2E test directory
- Add tests to existing spec files when extending features
- Create new spec files for entirely new feature areas

**Example E2E test scenarios for common features:**
- Toggle/switch: Test all states, verify persistence across page reload
- Form field: Test input, validation, submission, and error states
- Filter/sort: Test each option, verify results update correctly
- CRUD operations: Test create, read, update, delete flows

### Performance Test Requirements
New features that affect page load or user interactions should have performance coverage:

**When to add performance tests:**
- New pages or major UI sections
- Features that load significant data
- Features with complex rendering (graphs, calendars, large lists)

**Performance test location:** `frontend/e2e/performance.spec.ts`

**What to measure:**
- Page load times (LCP, FCP)
- Interaction responsiveness
- Bundle size impact (check build output)

## CI/CD Requirements - MANDATORY
**Before completing ANY feature or fix, you MUST verify all CI checks pass locally:**

### Sign-Off Workflow (REQUIRED)
Run everything in one command from the project root:
```bash
bash scripts/check-all.sh
```

**This is the official sign-off workflow.** Use this to verify all changes before committing.

This single command runs:
- **Python**: format, lint (10.0/10.0), typecheck (0 errors), coverage (100%)
- **Frontend**: lint (ESLint), typecheck (TypeScript), test (Vitest), build
- **E2E**: Playwright tests against Docker PostgreSQL (full user workflow coverage)

Alternative: `poetry run poe check` (unit tests only, does not include E2E)

### Manual Verification (if needed)
If you need to run checks individually:

**Python Backend (from project root):**
```bash
poetry run poe format      # Format code with Black + isort
poetry run poe lint        # Pylint must score 10.0/10.0
poetry run poe typecheck   # Mypy strict mode, no errors
poetry run poe coverage    # Pytest with 100% coverage required
poetry run poe check-python  # Run all above Python checks
```

**Frontend (from frontend/ directory):**
```bash
cd frontend
npm run lint               # ESLint must pass
npx tsc --noEmit           # TypeScript must compile without errors
npm run test               # Vitest tests must pass
npm run build              # Build must succeed
```

### Verification Checklist
Before marking any task complete, confirm:
- [ ] **`bash scripts/check-all.sh`** passes (sign-off workflow - includes ALL checks: Python, Frontend, and E2E)

**These checks are enforced by GitHub Actions CI on every PR. Do NOT submit code that fails these checks.**

### E2E Testing in CI
E2E tests (Playwright) run automatically in CI after unit tests pass:
- Uses **Docker PostgreSQL** service container (same as local testing)
- Runs against real backend + frontend servers
- Tests full user workflows across all pages
- Failures block PR merges
- Test reports are uploaded as artifacts for debugging

## Quality Standards
- **Python**: 100% test coverage, Pylint 10.0/10.0, zero Mypy errors
- **Frontend**: 100% test coverage, zero ESLint errors, zero TypeScript errors, all Vitest tests pass
- **E2E**: All Playwright tests must pass (runs in CI)
- Always run the full check suite before considering work complete
- This "almost ridiculous" quality standard applies at all times and all phases

## Testing Philosophy

### Saving Test Output for Analysis
When running tests (individual or full suites), **always save output to a file** for efficient analysis:

```bash
# Save output for later analysis (recommended)
bash scripts/check-all.sh 2>&1 | tee /tmp/test-output.txt

# Run E2E tests with saved output
bash scripts/run-e2e.sh --no-docker 2>&1 | tee /tmp/e2e-output.txt

# Run specific Python test with output
poetry run pytest tests/test_file.py -v 2>&1 | tee /tmp/pytest-output.txt

# Run frontend tests with output
cd frontend && npm run test 2>&1 | tee /tmp/vitest-output.txt
```

**Benefits:**
- Quickly grep for specific errors without re-running tests
- Compare output between runs
- Share output for debugging
- Analyze different aspects without waiting for slow re-runs

**Quick analysis commands:**
```bash
# Find all failures
grep -E "FAIL|Error|✘" /tmp/test-output.txt

# Count passing/failing tests
grep -c "✓\|passed" /tmp/test-output.txt
grep -c "✘\|failed" /tmp/test-output.txt

# Find specific error messages
grep -A5 "AssertionError" /tmp/test-output.txt
```

### Three Layers of Testing
Moti-Do uses a comprehensive testing strategy with three layers:

1. **Unit Tests (100% coverage required)**
   - Python: pytest with coverage enforcement
   - Frontend: Vitest with React Testing Library
   - Test business logic, utilities, and component rendering
   - Fast execution, run on every commit

2. **Integration Tests**
   - Python: tests/integration/ for scoring and data operations
   - Test interactions between modules

3. **E2E Tests (Playwright)**
   - Located in `frontend/e2e/`
   - Test full user workflows through real browser
   - Cover authentication, task CRUD, all views (calendar, kanban, habits, graph)
   - Run in CI after unit tests pass

### When to Write Which Test
- **Unit tests**: Logic, calculations, component rendering, state management
- **E2E tests**: User flows, cross-page navigation, API integration
- **Both**: Critical paths should have unit AND E2E coverage

### Coverage Exceptions
Some UI code is marked with `/* v8 ignore */` because it's "tested via integration tests" (E2E). This is acceptable when:
- The code is pure UI orchestration (button clicks, form submissions)
- E2E tests cover the user workflow
- The code has no complex logic worth unit testing

### Coverage Requirements (100% Enforced)
Both Python and frontend REQUIRE 100% test coverage. The build will FAIL if coverage drops below 100%.

**When code truly cannot be tested** (rare cases like platform-specific code, deliberate error paths):

**Python** - Add inline pragma comment:
```python
# This line cannot be tested because [specific reason]
if sys.platform == "win32":  # pragma: no cover
    use_windows_specific_function()
```

**Frontend (TypeScript/JavaScript)** - Add V8 ignore comment:
```typescript
// This cannot be tested because [specific reason]
/* v8 ignore next 3 */
if (process.env.NODE_ENV === 'production') {
  performProductionOnlyAction();
}
```

**IMPORTANT**:
- Coverage ignore comments MUST include an explanation of why the code cannot be tested
- Use these sparingly - most code CAN and SHOULD be tested
- Reviewers will scrutinize any coverage exclusions
- Do NOT use coverage ignores to avoid writing tests for testable code