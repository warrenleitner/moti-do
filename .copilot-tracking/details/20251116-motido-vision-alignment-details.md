<!-- markdownlint-disable-file -->
# Task Details: MotiDo Vision Alignment & Milestone Progression

## Research Reference

**Source Research**: #file:../research/20251116-motido-vision-alignment-research.md

## Phase 1: Foundation Completion (Milestone 0.1+ - Week 1-2)

### Task 1.1: Fix XP persistence system

Update `add_xp()` function in `src/motido/core/scoring.py` to actually persist XP to the User model and save to backend.

- **Files**:
  - `src/motido/core/scoring.py` - Modify `add_xp()` to persist XP
  - `src/motido/cli/main.py` - Update `handle_complete()` to pass manager
  - `tests/test_scoring.py` - Add XP persistence tests
- **Success**:
  - `add_xp()` updates `user.total_xp` correctly
  - XP persists across sessions
  - Tests verify XP accumulation
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 122-135) - Current XP system analysis
- **Dependencies**:
  - None

### Task 1.2: Add `describe` command for text_description field

Create CLI command to set/edit the text_description field on tasks.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_describe()` function and subparser
  - `tests/test_cli_describe.py` - New test file for describe command
- **Success**:
  - `motido describe <task-id> "description text"` sets text_description
  - Supports multi-line text input
  - Updates scoring bonus correctly
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 92-95) - Task model schema
- **Dependencies**:
  - None

### Task 1.3: Add `set-due` and `set-start` commands for date fields

Create CLI commands to set due_date and start_date on tasks with flexible date parsing.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_set_due()` and `handle_set_start()` functions
  - `src/motido/core/utils.py` - Add `parse_date()` helper for flexible date parsing
  - `tests/test_cli_dates.py` - New test file for date commands
- **Success**:
  - Supports formats: "2025-12-31", "tomorrow", "next friday", "in 3 days"
  - Clear error messages for invalid dates
  - Can clear dates with `--clear` flag
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 92-95) - Task model schema
- **Dependencies**:
  - None

### Task 1.4: Add `tag` command for tag management

Create CLI command to add/remove/list tags on tasks.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_tag()` function with subcommands (add, remove, list)
  - `tests/test_cli_tags.py` - New test file for tag commands
- **Success**:
  - `motido tag add <task-id> <tag>` adds tag to task
  - `motido tag remove <task-id> <tag>` removes tag
  - `motido tag list <task-id>` shows all tags
  - Prevents duplicate tags
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 92-95) - Task model schema
- **Dependencies**:
  - None

### Task 1.5: Add `project` command for project assignment

Create CLI command to assign/clear project on tasks.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_project()` function
  - `tests/test_cli_project.py` - New test file for project command
- **Success**:
  - `motido project <task-id> <project-name>` assigns project
  - `motido project <task-id> --clear` removes project
  - Project names validated (alphanumeric + spaces/dashes)
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 92-95) - Task model schema
- **Dependencies**:
  - None

### Task 1.6: Update `list` command to display new fields

Enhance task list table to show due dates, start dates, tags, and projects when present.

- **Files**:
  - `src/motido/cli/main.py` - Modify `handle_list()` to add columns
  - `tests/test_cli_main.py` - Update list command tests
- **Success**:
  - New columns: Due Date, Start Date, Tags, Project
  - Color coding for overdue tasks (red) and upcoming (yellow)
  - Tags displayed as comma-separated list
  - Columns only shown if any task has that field populated
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 60-65) - Rich console display patterns
- **Dependencies**:
  - Tasks 1.2, 1.3, 1.4, 1.5 complete

### Task 1.7: Update `view` command to show all fields

Enhance task detail view to display all Task model fields.

- **Files**:
  - `src/motido/cli/main.py` - Modify `handle_view()` to show all fields
  - `tests/test_cli_main.py` - Update view command tests
- **Success**:
  - Displays: title, id, creation_date, due_date, start_date, priority, difficulty, duration, tags, project, text_description, is_complete
  - Empty fields shown as "Not set"
  - Rich formatting with colors and emojis
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 60-65) - Rich console display patterns
- **Dependencies**:
  - Tasks 1.2, 1.3, 1.4, 1.5 complete

### Task 1.8: Write comprehensive tests for new commands

Create comprehensive test suite for all new CLI commands.

- **Files**:
  - `tests/test_cli_describe.py` - Test describe command
  - `tests/test_cli_dates.py` - Test set-due and set-start commands
  - `tests/test_cli_tags.py` - Test tag management
  - `tests/test_cli_project.py` - Test project assignment
  - `tests/test_cli_main.py` - Update existing tests for list/view changes
- **Success**:
  - 100% code coverage maintained
  - Tests cover happy path and error cases
  - Tests verify data persistence
  - All tests pass with Pylint 10.0/10.0
- **Research References**:
  - #file:../../.github/copilot-instructions.md - Testing requirements
- **Dependencies**:
  - All Phase 1 tasks complete

## Phase 2: Enhanced Scoring System (Milestone 0.2 - Week 3-4)

### Task 2.1: Implement due date proximity scoring

Add exponential scoring boost based on proximity to due date, with past-due tasks escalating rapidly.

- **Files**:
  - `src/motido/core/scoring.py` - Add `calculate_due_date_multiplier()` function
  - `src/motido/data/scoring_config.json` - Add due_date_proximity config
  - `tests/test_scoring.py` - Add due date proximity tests
- **Success**:
  - Multiplier increases exponentially as due date approaches
  - Past-due tasks get aggressive multipliers (e.g., 5x after 1 week overdue)
  - Configurable via scoring_config.json
  - Formula: `1.0 + (days_until_due < 0 ? abs(days) * 0.5 : max(0, (14 - days) * 0.1))`
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 169-177) - Vision requirements for due date scoring
- **Dependencies**:
  - Phase 1 complete (due_date field accessible)

### Task 2.2: Add start date aging bonus

Add smaller additive bonus based on days past start date.

- **Files**:
  - `src/motido/core/scoring.py` - Add `calculate_start_date_bonus()` function
  - `src/motido/data/scoring_config.json` - Add start_date_aging config
  - `tests/test_scoring.py` - Add start date aging tests
- **Success**:
  - Linear bonus: `days_past_start * 0.5` points added to base
  - Only applies if start_date is set and in the past
  - Does not apply if task is already past due (avoid double-counting urgency)
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 169-177) - Vision requirements for start date
- **Dependencies**:
  - Phase 1 complete (start_date field accessible)

### Task 2.3: Implement dependency chain scoring

Add scoring boost proportional to total score of all dependent tasks.

- **Files**:
  - `src/motido/core/scoring.py` - Add `calculate_dependency_chain_score()` function
  - `src/motido/cli/main.py` - Add `dependency` command to manage dependencies
  - `tests/test_scoring_dependencies.py` - New test file for dependency scoring
  - `tests/test_cli_dependencies.py` - Test dependency command
- **Success**:
  - Recursively calculates score of all tasks that depend on this task
  - Adds percentage of dependent scores (configurable, default 10%)
  - Detects circular dependencies and reports error
  - CLI command: `motido dependency add <task-id> <depends-on-id>`
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 169-177) - Vision requirements for dependency scoring
- **Dependencies**:
  - Phase 1 complete

### Task 2.4: Add tag/project multiplier configuration

Allow users to define custom score multipliers for specific tags and projects.

- **Files**:
  - `src/motido/data/scoring_config.json` - Add tag_multipliers and project_multipliers sections
  - `src/motido/core/scoring.py` - Apply tag/project multipliers in `calculate_score()`
  - `src/motido/cli/main.py` - Add `config scoring` command to manage multipliers
  - `tests/test_scoring_multipliers.py` - New test file for tag/project multipliers
- **Success**:
  - Config format: `{"tag_multipliers": {"urgent": 1.5, "important": 1.3}}`
  - Multipliers stack (tag 1.5x and project 1.2x = 1.8x total)
  - CLI: `motido config scoring tag urgent 1.5`
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 169-177) - Vision requirements for custom multipliers
- **Dependencies**:
  - Phase 1 complete (tags and projects accessible)

### Task 2.5: Add priority multiplier to scoring

Integrate priority enum into scoring calculation with configurable multipliers.

- **Files**:
  - `src/motido/core/scoring.py` - Add priority multiplier to `calculate_score()`
  - `src/motido/data/scoring_config.json` - Add priority_multiplier section
  - `tests/test_scoring.py` - Add priority multiplier tests
- **Success**:
  - Priority multipliers: TRIVIAL=1.0, LOW=1.2, MEDIUM=1.5, HIGH=2.0, DEFCON_ONE=3.0
  - Stacks with difficulty and duration multipliers
  - Configurable via scoring_config.json
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 48-56) - Enum patterns
- **Dependencies**:
  - None

### Task 2.6: Write scoring integration tests

Create comprehensive tests for complete scoring system with all factors.

- **Files**:
  - `tests/test_scoring_integration.py` - New comprehensive integration test file
- **Success**:
  - Tests realistic task scenarios with multiple scoring factors active
  - Verifies score calculation with all multipliers and bonuses
  - Tests edge cases (overdue + dependencies + tags)
  - 100% coverage of all scoring paths
- **Research References**:
  - #file:../../.github/copilot-instructions.md - Testing requirements
- **Dependencies**:
  - All Phase 2 tasks complete

## Phase 3: Incremental Completion (Milestone 0.3 - Week 5)

### Task 3.1: Add last_processed_date to User model

Add field to track current "virtual date" for incremental processing.

- **Files**:
  - `src/motido/core/models.py` - Add `last_processed_date: date` field to User
  - `src/motido/data/json_manager.py` - Update serialization
  - `src/motido/data/database_manager.py` - Update database schema
  - `tests/test_models.py` - Test new field
- **Success**:
  - Field defaults to current date on first use
  - Persists across sessions
  - Used by advance/skip-to commands
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 291-298) - Incremental completion requirements
- **Dependencies**:
  - None

### Task 3.2: Implement `advance` command for date progression

Create command to advance virtual date one day at a time, processing recurrences and penalties.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_advance()` function
  - `src/motido/core/utils.py` - Add `process_day()` helper
  - `tests/test_cli_advance.py` - New test file for advance command
- **Success**:
  - `motido advance` increments last_processed_date by 1 day
  - Applies penalties for incomplete tasks
  - Shows diff of XP changes
  - Displays current virtual date before and after
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 291-298) - Incremental completion requirements
- **Dependencies**:
  - Task 3.1 complete

### Task 3.3: Implement `skip-to` command for date jumping

Create command to jump to specific date, processing all days in between.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_skip_to()` function
  - `tests/test_cli_skip_to.py` - New test file
- **Success**:
  - `motido skip-to 2025-12-31` processes all days up to target date
  - Shows summary of XP changes
  - Prevents skipping backwards (requires confirmation flag)
  - Displays progress for large date ranges
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 291-298) - Incremental completion requirements
- **Dependencies**:
  - Task 3.2 complete

### Task 3.4: Add completion_date field to Task model

Track when tasks were completed for historical analysis.

- **Files**:
  - `src/motido/core/models.py` - Add `completion_date: datetime | None` field
  - `src/motido/data/json_manager.py` - Update serialization
  - `src/motido/data/database_manager.py` - Update schema
  - `tests/test_models.py` - Test new field
- **Success**:
  - Field set automatically when task marked complete
  - Persists in backend
  - Displayed in task view
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 291-298) - Incremental completion requirements
- **Dependencies**:
  - None

### Task 3.5: Update complete command to support backdating

Allow completion with custom date for incremental processing.

- **Files**:
  - `src/motido/cli/main.py` - Modify `handle_complete()` to accept `--date` flag
  - `tests/test_cli_main.py` - Update complete command tests
- **Success**:
  - `motido complete <task-id> --date 2025-11-15` completes on specific date
  - Awards XP as of that date
  - Sets completion_date to specified date
  - Validates date is not in future
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 291-298) - Incremental completion requirements
- **Dependencies**:
  - Tasks 3.1, 3.4 complete

## Phase 4: Terminal User Interface (Milestone 0.5 - Week 6-8)

### Task 4.1: Refactor CLI into service layer

Extract business logic from CLI handlers into reusable service functions.

- **Files**:
  - `src/motido/core/services.py` - New file with service functions
  - `src/motido/cli/main.py` - Refactor to use services
  - `tests/test_services.py` - New test file for service layer
- **Success**:
  - Service functions: `create_task()`, `update_task()`, `delete_task()`, `complete_task()`, `list_tasks()`, etc.
  - CLI handlers become thin wrappers calling services
  - Services testable independently of CLI
  - 100% test coverage maintained
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 391-398) - TUI implementation approach
- **Dependencies**:
  - Phases 1-3 complete

### Task 4.2: Install Textual and create TUI module structure

Set up Textual framework and create TUI package structure.

- **Files**:
  - `pyproject.toml` - Add `textual` dependency
  - `src/motido/tui/__init__.py` - New TUI package
  - `src/motido/tui/app.py` - Main TUI app class
  - `src/motido/tui/screens/__init__.py` - Screens package
- **Success**:
  - `poetry add textual` completes successfully
  - Module structure follows Textual best practices
  - Basic app runs: `poetry run python -m motido.tui.app`
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 70-88) - Textual framework patterns
  - #githubRepo:"Textualize/textual" - TUI examples
- **Dependencies**:
  - Task 4.1 complete

### Task 4.3: Create TaskListScreen with keyboard navigation

Build main task list screen with DataTable and keyboard shortcuts.

- **Files**:
  - `src/motido/tui/screens/task_list.py` - TaskListScreen class
  - `src/motido/tui/widgets/task_table.py` - Custom TaskTable widget
  - `tests/test_tui_task_list.py` - Test task list screen
- **Success**:
  - Displays tasks in sortable DataTable (by score, due date, creation date)
  - Keyboard shortcuts: n=new, e=edit, d=delete, c=complete, Enter=view details
  - Live score updates on task changes
  - Color coding for priority/due dates
  - Filtering by tags/projects (f key)
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 70-88) - Textual Screen patterns
- **Dependencies**:
  - Task 4.2 complete

### Task 4.4: Create TaskFormScreen for task creation/editing

Build form screen for creating and editing tasks with all fields.

- **Files**:
  - `src/motido/tui/screens/task_form.py` - TaskFormScreen class
  - `src/motido/tui/widgets/date_input.py` - Custom date input widget
  - `tests/test_tui_task_form.py` - Test task form screen
- **Success**:
  - Input fields for all Task fields: title, description, priority, difficulty, duration, due date, start date, tags, project
  - Select widgets for enums (Priority, Difficulty, Duration)
  - Date inputs with validation
  - Save button commits changes
  - Cancel button discards changes
  - Form validation with error messages
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 70-88) - Textual Input/Form patterns
- **Dependencies**:
  - Task 4.2 complete

### Task 4.5: Create TaskDetailScreen for full task view

Build detailed read-only view screen for individual tasks.

- **Files**:
  - `src/motido/tui/screens/task_detail.py` - TaskDetailScreen class
  - `tests/test_tui_task_detail.py` - Test task detail screen
- **Success**:
  - Displays all task fields with labels
  - Shows calculated score with breakdown
  - Rich formatting with colors and emojis
  - Buttons: Edit, Complete, Delete, Back
  - Keyboard shortcuts: e=edit, c=complete, d=delete, Esc=back
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 70-88) - Textual Screen patterns
- **Dependencies**:
  - Task 4.2 complete

### Task 4.6: Implement MotiDoApp with screen navigation

Create main TUI app class with screen management and navigation.

- **Files**:
  - `src/motido/tui/app.py` - MotiDoApp class implementation
  - `tests/test_tui_app.py` - Test app navigation
- **Success**:
  - Registers all screens: TaskListScreen, TaskFormScreen, TaskDetailScreen
  - Implements screen navigation: push_screen(), pop_screen()
  - Global keybindings: q=quit, h=help, s=stats
  - Header shows current user and XP
  - Footer shows available actions
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 70-88) - Textual App architecture
- **Dependencies**:
  - Tasks 4.3, 4.4, 4.5 complete

### Task 4.7: Add TUI entry point and CSS styling

Create entry point script and CSS styling for TUI.

- **Files**:
  - `src/motido/tui/__main__.py` - Entry point for `python -m motido.tui`
  - `src/motido/tui/motido.tcss` - Textual CSS file
  - `pyproject.toml` - Add `motido-tui` script entry point
- **Success**:
  - `poetry run motido-tui` launches TUI
  - CSS provides consistent theming (colors, borders, spacing)
  - Responsive layout on different terminal sizes
  - Follows Material Design color scheme from vision
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 90-110) - Textual CSS patterns
- **Dependencies**:
  - Task 4.6 complete

### Task 4.8: Write TUI integration tests

Create comprehensive test suite for TUI screens and navigation.

- **Files**:
  - `tests/test_tui_integration.py` - Integration tests
  - All existing TUI test files enhanced
- **Success**:
  - Tests cover screen transitions
  - Tests verify keyboard shortcuts
  - Tests validate data persistence through TUI
  - Snapshot tests for UI rendering
  - 100% coverage maintained
- **Research References**:
  - #file:../../.github/copilot-instructions.md - Testing requirements
- **Dependencies**:
  - All Phase 4 tasks complete

## Phase 5: Web Backend Architecture (Milestone 0.7 - Week 9-11)

### Task 5.1: Design REST API specification

Document complete REST API with endpoints, schemas, and authentication.

- **Files**:
  - `docs/api-spec.md` - OpenAPI 3.0 specification
  - `docs/api-examples.md` - Usage examples with curl
- **Success**:
  - Endpoints documented: GET/POST/PUT/DELETE for tasks, users, config
  - Request/response schemas defined
  - Authentication strategy specified (JWT tokens)
  - Error response formats standardized
  - Rate limiting strategy defined
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 577-585) - Web deployment requirements
- **Dependencies**:
  - None

### Task 5.2: Create Vercel Postgres data manager

Implement PostgresDataManager following DataManager interface.

- **Files**:
  - `src/motido/data/postgres_manager.py` - PostgresDataManager class
  - `src/motido/data/migrations/001_initial_schema.sql` - Database schema
  - `src/motido/data/backend_factory.py` - Add postgres backend option
  - `tests/test_postgres_manager.py` - Test Postgres manager
- **Success**:
  - Connects to Vercel Postgres via connection string
  - Implements all DataManager methods
  - Uses connection pooling
  - Handles transactions correctly
  - Migration system for schema changes
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 600-612) - Postgres implementation
  - #file:../../.github/copilot-instructions.md - Backend abstraction pattern
- **Dependencies**:
  - Task 5.1 complete, Vercel account created

### Task 5.3: Implement serverless function endpoints

Create Vercel serverless functions for all API endpoints.

- **Files**:
  - `api/tasks/index.py` - Tasks endpoints (GET, POST)
  - `api/tasks/[id].py` - Single task endpoints (GET, PUT, DELETE)
  - `api/user/index.py` - User endpoints
  - `api/auth/login.py` - Authentication endpoint
  - `api/_middleware.py` - Authentication middleware
  - `tests/test_api_endpoints.py` - API endpoint tests
- **Success**:
  - All endpoints follow API spec
  - JWT authentication enforced
  - Error handling with proper status codes
  - CORS configured for frontend
  - Request validation with schemas
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 627-640) - Serverless functions
- **Dependencies**:
  - Task 5.2 complete

### Task 5.4: Build React frontend with Material-UI

Create React SPA with Material-UI components matching vision design.

- **Files**:
  - `frontend/package.json` - Dependencies (React, Material-UI, TanStack Query)
  - `frontend/src/App.tsx` - Main app component
  - `frontend/src/components/TaskList.tsx` - Task list component
  - `frontend/src/components/TaskForm.tsx` - Task form component
  - `frontend/src/components/TaskCard.tsx` - Task card component
  - `frontend/src/hooks/useTasks.ts` - TanStack Query hooks
  - `frontend/src/theme.ts` - Material-UI theme configuration
- **Success**:
  - Responsive layout (mobile-first)
  - Material Design components throughout
  - Real-time data sync with TanStack Query
  - Loading states and error handling
  - Form validation matching backend
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 654-668) - React frontend requirements
- **Dependencies**:
  - Task 5.3 complete, Node.js/npm installed

### Task 5.5: Configure Vercel deployment

Set up Vercel project with automatic deployments from Git.

- **Files**:
  - `vercel.json` - Vercel configuration
  - `.env.example` - Environment variable template
  - `README.md` - Update with deployment instructions
- **Success**:
  - `vercel deploy` succeeds
  - Automatic deployments on git push to main
  - Environment variables configured (database URL, JWT secret)
  - Custom domain configured (optional)
  - HTTPS enforced
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 682-693) - Deployment configuration
- **Dependencies**:
  - Tasks 5.3, 5.4 complete

### Task 5.6: Add E2E tests with Playwright

Create end-to-end test suite covering critical user flows.

- **Files**:
  - `frontend/e2e/auth.spec.ts` - Authentication flow tests
  - `frontend/e2e/tasks.spec.ts` - Task CRUD flow tests
  - `frontend/e2e/scoring.spec.ts` - Scoring display tests
  - `frontend/playwright.config.ts` - Playwright configuration
- **Success**:
  - Tests run in CI/CD pipeline
  - Tests cover: login, create task, edit task, complete task, delete task
  - Visual regression tests for key screens
  - Mobile viewport tests
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 705-715) - E2E testing requirements
- **Dependencies**:
  - Task 5.5 complete

## Phase 6: Progressive Web App (Milestone 1.0 - Week 12-13)

### Task 6.1: Add PWA manifest and service worker

Configure app as installable PWA with offline support.

- **Files**:
  - `frontend/public/manifest.json` - PWA manifest
  - `frontend/public/service-worker.js` - Service worker
  - `frontend/public/icons/` - App icons (various sizes)
  - `frontend/src/registerServiceWorker.ts` - Service worker registration
- **Success**:
  - App installable on mobile and desktop
  - App icons display correctly
  - Service worker caches app shell
  - Offline fallback page shown when disconnected
  - Passes Lighthouse PWA audit
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 727-738) - PWA requirements
- **Dependencies**:
  - Phase 5 complete

### Task 6.2: Implement offline support with IndexedDB

Add client-side persistence for offline task management.

- **Files**:
  - `frontend/src/db/indexedDB.ts` - IndexedDB wrapper
  - `frontend/src/hooks/useOfflineSync.ts` - Offline sync hook
  - `frontend/src/utils/syncQueue.ts` - Sync queue for offline changes
- **Success**:
  - Tasks cached in IndexedDB
  - Changes queued when offline
  - Auto-sync when connection restored
  - Conflict resolution for concurrent edits
  - User notified of offline mode
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 750-760) - Offline support requirements
- **Dependencies**:
  - Task 6.1 complete

### Task 6.3: Configure push notifications

Set up push notification system for task reminders.

- **Files**:
  - `api/notifications/subscribe.py` - Push subscription endpoint
  - `api/notifications/send.py` - Send notification function
  - `frontend/src/utils/notifications.ts` - Notification request logic
  - `src/motido/core/notifications.py` - Notification scheduling logic
- **Success**:
  - User can enable notifications
  - Notifications sent for due tasks
  - Notifications work on iOS and Android
  - User can customize notification timing
  - Unsubscribe functionality works
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 772-782) - Push notification requirements
- **Dependencies**:
  - Task 6.1 complete

### Task 6.4: Test and optimize mobile experience

Comprehensive testing and optimization for mobile devices.

- **Files**:
  - `frontend/src/styles/mobile.css` - Mobile-specific styles
  - `docs/mobile-testing.md` - Mobile testing checklist
- **Success**:
  - Tested on iOS Safari and Android Chrome
  - Touch targets meet accessibility guidelines (44px minimum)
  - Swipe gestures for common actions
  - No horizontal scrolling
  - Fast load times (< 3s on 3G)
  - Passes Lighthouse performance audit (90+ score)
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 794-805) - Mobile optimization requirements
- **Dependencies**:
  - Tasks 6.1, 6.2, 6.3 complete

## Phase 7: Habit Tracking Foundation (Milestone 2.5 - Week 14-15)

### Task 7.1: Install python-dateutil and extend Task model

Add habit-specific fields to Task model and install recurrence library.

- **Files**:
  - `pyproject.toml` - Add `python-dateutil` dependency
  - `src/motido/core/models.py` - Add habit fields to Task
  - `src/motido/data/json_manager.py` - Update serialization
  - `src/motido/data/postgres_manager.py` - Update schema
  - `tests/test_models.py` - Test new fields
- **Success**:
  - New fields: `is_habit`, `recurrence_rule`, `next_due_date`, `advance_days`, `parent_habit_id`
  - `poetry add python-dateutil` succeeds
  - Fields serialize/deserialize correctly
  - Database migration successful
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 817-828) - Habit model requirements
  - #fetch:"https://dateutil.readthedocs.io/en/stable/rrule.html" - Recurrence rules
- **Dependencies**:
  - Phase 6 complete

### Task 7.2: Implement recurrence rule engine

Build system to parse and generate recurrence instances using dateutil.

- **Files**:
  - `src/motido/core/recurrence.py` - Recurrence engine module
  - `tests/test_recurrence.py` - Recurrence engine tests
- **Success**:
  - Functions: `parse_recurrence()`, `generate_next_instance()`, `generate_instances_between()`
  - Supports: daily, weekly, monthly, yearly with all rrule parameters
  - Handles: "every Friday", "first Monday of month", "every 3 days"
  - Stores rrule strings in recurrence_rule field
  - Generates next_due_date correctly
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 842-855) - Recurrence implementation
  - #fetch:"https://dateutil.readthedocs.io/en/stable/rrule.html" - rrule documentation
- **Dependencies**:
  - Task 7.1 complete

### Task 7.3: Add habit creation and completion commands

Create CLI commands for habit management.

- **Files**:
  - `src/motido/cli/main.py` - Add `handle_create_habit()`, `handle_complete_habit()` functions
  - `tests/test_cli_habits.py` - Habit command tests
- **Success**:
  - `motido habit create "Exercise" --recurrence "daily"` creates habit
  - `motido habit complete <habit-id>` marks complete and generates next instance
  - Support recurrence patterns: daily, weekly, monthly, custom rrule strings
  - Habits visible in task list with special indicator
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 867-880) - Habit commands
- **Dependencies**:
  - Task 7.2 complete

### Task 7.4: Update TUI and web UI for habits

Add habit-specific UI components and flows.

- **Files**:
  - `src/motido/tui/screens/habit_form.py` - Habit creation form
  - `frontend/src/components/HabitForm.tsx` - React habit form
  - `frontend/src/components/HabitCard.tsx` - Habit card with recurrence display
- **Success**:
  - Habit forms include recurrence rule builder
  - Visual indicator distinguishes habits from tasks
  - Recurrence pattern displayed in human-readable format
  - Completion history preview shown
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 892-905) - Habit UI requirements
- **Dependencies**:
  - Task 7.3 complete

## Phase 8: Advanced Habit Features (Milestone 3.0 - Week 16-17)

### Task 8.1: Implement completion history and streak calculation

Track habit completions and calculate streaks.

- **Files**:
  - `src/motido/core/models.py` - Add `completion_history` field to Task
  - `src/motido/core/streaks.py` - Streak calculation module
  - `tests/test_streaks.py` - Streak tests
- **Success**:
  - `completion_history` stores list of completion dates
  - Functions: `calculate_current_streak()`, `calculate_longest_streak()`, `get_completion_rate()`
  - Streaks account for recurrence pattern (daily vs weekly)
  - Missed days break streak appropriately
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 917-930) - Streak requirements
- **Dependencies**:
  - Phase 7 complete

### Task 8.2: Build heat map data generation

Generate data structure for habit completion heat maps.

- **Files**:
  - `src/motido/core/heatmap.py` - Heat map data generation
  - `api/habits/[id]/heatmap.py` - Heat map API endpoint
  - `tests/test_heatmap.py` - Heat map data tests
- **Success**:
  - Function: `generate_heatmap_data(habit_id, start_date, end_date)`
  - Returns array of {date, completion_count, intensity} objects
  - Intensity calculated based on recurrence frequency
  - Handles multiple completions per day
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 942-953) - Heat map requirements
- **Dependencies**:
  - Task 8.1 complete

### Task 8.3: Create frontend heat map component

Build interactive heat map visualization for habit history.

- **Files**:
  - `frontend/src/components/HabitHeatMap.tsx` - Heat map component
  - `frontend/package.json` - Add `react-calendar-heatmap` dependency
- **Success**:
  - Displays year of habit history in calendar grid
  - Color intensity shows completion frequency
  - Tooltips show completion details on hover
  - Click opens day detail with completion times
  - Responsive on mobile
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 965-975) - Heat map UI requirements
- **Dependencies**:
  - Task 8.2 complete

### Task 8.4: Add habit-specific scoring bonuses

Integrate streak bonuses into scoring calculation.

- **Files**:
  - `src/motido/core/scoring.py` - Add `calculate_streak_bonus()` function
  - `src/motido/data/scoring_config.json` - Add streak_bonus configuration
  - `tests/test_scoring.py` - Streak bonus tests
- **Success**:
  - Bonus formula: `current_streak * streak_multiplier` (configurable)
  - Longer streaks = higher priority to maintain momentum
  - Applies only to habit instances, not one-time tasks
  - Displayed in score breakdown
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 987-997) - Streak scoring requirements
- **Dependencies**:
  - Task 8.1 complete

## Phase 9: Advanced Features (Milestone 4.0 - Week 18-20)

### Task 9.1: Implement vacation mode

Add system to pause penalty calculations during vacation.

- **Files**:
  - `src/motido/core/models.py` - Add `vacation_mode` and `vacation_start_date` to User
  - `src/motido/cli/main.py` - Add `vacation` command
  - `frontend/src/components/VacationModeToggle.tsx` - Vacation mode UI
  - `tests/test_vacation_mode.py` - Vacation mode tests
- **Success**:
  - `motido vacation start` enables vacation mode
  - `motido vacation end` disables and recalculates
  - Penalties not applied for days in vacation mode
  - Habits optionally paused (configurable per habit)
  - Vacation days tracked in user stats
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1011-1022) - Vacation mode requirements
- **Dependencies**:
  - None

### Task 9.2: Create badge system with rewards

Implement achievement badges for milestones.

- **Files**:
  - `src/motido/core/badges.py` - Badge definitions and awarding logic
  - `src/motido/core/models.py` - Add `badges` field to User
  - `api/user/badges.py` - Badge API endpoint
  - `frontend/src/components/BadgeDisplay.tsx` - Badge UI component
  - `tests/test_badges.py` - Badge tests
- **Success**:
  - Badges: "First Task", "Week Warrior" (7-day streak), "Century" (100 XP), "Perfectionist" (30 tasks completed)
  - Badges auto-awarded on achievement
  - Badge notifications shown in UI
  - Badge gallery displays earned and locked badges
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1034-1048) - Badge system requirements
- **Dependencies**:
  - None

### Task 9.3: Build Kanban board view

Create drag-and-drop Kanban board for task management.

- **Files**:
  - `frontend/src/components/KanbanBoard.tsx` - Kanban board component
  - `frontend/src/components/KanbanColumn.tsx` - Kanban column component
  - `frontend/src/components/KanbanCard.tsx` - Draggable task card
  - `frontend/package.json` - Add `@dnd-kit/core` for drag-and-drop
- **Success**:
  - Columns: Backlog, Ready, In Progress, Blocked, Done
  - Drag tasks between columns
  - Column assignments persist
  - Keyboard navigation support
  - Mobile-friendly (tap to move)
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1060-1073) - Kanban requirements
- **Dependencies**:
  - Phase 6 complete (web UI)

### Task 9.4: Implement dependency graph visualization

Build interactive dependency graph using Cytoscape.

- **Files**:
  - `frontend/src/components/DependencyGraph.tsx` - Graph component
  - `frontend/package.json` - Add `cytoscape` and `cytoscape-react`
  - `api/tasks/graph.py` - Graph data endpoint
- **Success**:
  - Displays tasks as nodes, dependencies as edges
  - Color-coded by status (complete, in-progress, blocked)
  - Click node to view task details
  - Highlights dependency chains on hover
  - Auto-layout with configurable algorithms
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1085-1098) - Graph visualization requirements
- **Dependencies**:
  - Phase 6 complete

### Task 9.5: Add bulk editing functionality

Create UI for editing multiple tasks simultaneously.

- **Files**:
  - `frontend/src/components/BulkEditModal.tsx` - Bulk edit modal
  - `api/tasks/bulk.py` - Bulk update endpoint
  - `tests/test_bulk_edit.py` - Bulk edit tests
- **Success**:
  - Select multiple tasks with checkboxes
  - Bulk actions: set priority, set project, add tag, set due date, delete
  - Confirmation dialog before destructive actions
  - Undo option after bulk operations
  - Progress indicator for large batch operations
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1110-1122) - Bulk editing requirements
- **Dependencies**:
  - Phase 6 complete

### Task 9.6: Implement undo/redo system

Add comprehensive undo/redo for all user actions.

- **Files**:
  - `src/motido/core/history.py` - Command pattern implementation
  - `frontend/src/utils/undoManager.ts` - Frontend undo manager
  - `api/user/history.py` - History sync endpoint
  - `tests/test_undo_redo.py` - Undo/redo tests
- **Success**:
  - All mutations wrapped in command objects
  - Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo)
  - History persists across sessions
  - History limit configurable (default 50 actions)
  - UI shows action description in undo menu
- **Research References**:
  - #file:../research/20251116-motido-vision-alignment-research.md (Lines 1134-1145) - Undo/redo requirements
- **Dependencies**:
  - Phase 6 complete

## Dependencies

**Python Libraries:**
- `rich` (installed) - Console output
- `textual` (add Phase 4) - TUI framework
- `python-dateutil` (add Phase 7) - Recurrence rules
- `psycopg2-binary` (add Phase 5) - Postgres driver
- `pyjwt` (add Phase 5) - JWT authentication

**Frontend Dependencies:**
- `react`, `react-dom` - UI framework
- `@mui/material`, `@emotion/react`, `@emotion/styled` - Material-UI
- `@tanstack/react-query` - API state management
- `react-calendar-heatmap` - Habit heat maps
- `cytoscape`, `cytoscape-react` - Dependency graphs
- `@dnd-kit/core` - Drag and drop

**Infrastructure:**
- Vercel account for hosting
- Vercel Postgres database
- Node.js 18+ and npm
- GitHub repository for deployments

## Success Criteria

**Overall Success Criteria:**
- All 14 milestones (0.1 through 4.0) implemented
- 100% test coverage maintained throughout
- Pylint 10.0/10.0 score maintained
- PWA passes Lighthouse audit (90+ in all categories)
- Mobile-responsive and accessible (WCAG 2.1 AA)
- Documentation complete for all features
