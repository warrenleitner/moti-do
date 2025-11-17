# Implementation Changes: MotiDo Vision Alignment

## Phase 1: Foundation Completion (Week 1-2)

### Task 1.1: Fix XP persistence system ✅

**Status**: Complete
**Files Modified**:
- `src/motido/core/scoring.py`
- `src/motido/cli/main.py`
- `tests/test_scoring.py`
- `tests/test_cli_scoring.py`
- `tests/test_scoring_edge_cases.py`
- `tests/test_cli_main_extras.py`

**Changes**:
- Modified `add_xp()` function signature to accept `User` and `DataManager` parameters
- Updated `add_xp()` implementation to persist XP changes by calling `user.total_xp += points` and `manager.save_user(user)`
- Updated `apply_penalties()` function signature to accept `User` and `DataManager` parameters
- Updated `apply_penalties()` to pass user and manager to `add_xp()` calls
- Updated `handle_complete()` in CLI to pass user and manager to `add_xp()`
- Updated `handle_run_penalties()` parameter from `_manager` to `manager` and pass to `apply_penalties()`
- Updated all test files to match new function signatures with mock User and DataManager objects
- Added 4 new XP persistence tests:
  - `test_add_xp_persists_to_user()` - Verifies positive XP updates and persists
  - `test_add_xp_with_penalty_persists()` - Verifies negative XP (penalties) persist
  - `test_add_xp_multiple_calls_accumulate()` - Verifies cumulative XP across calls
  - `test_add_xp_mixed_positive_and_negative()` - Verifies mixed XP transactions
- All 271 tests passing

**Technical Details**:
The XP system now properly persists user progression to the backend. Previously, `add_xp()` only printed messages without saving state. The function now:
1. Accepts the User object and DataManager instance
2. Modifies `user.total_xp` directly
3. Calls `manager.save_user(user)` to persist changes
4. Maintains backward compatibility with print output for user feedback

This enables true progression tracking across sessions, fulfilling the vision requirement for XP-driven gamification.

### Task 1.2: Add `describe` command for text_description field ✅

**Status**: Complete
**Files Modified**:
- `src/motido/cli/main.py`
- `tests/test_cli_describe.py` (new file)

**Changes**:
- Added `handle_describe()` function to set/update task text_description field
- Added CLI subparser for `describe` command with `--id` and `description` arguments
- Command syntax: `motido describe --id <task-id> "description text"`
- Supports multi-line text descriptions (newlines preserved)
- Provides different feedback messages for adding vs. updating descriptions
- Created comprehensive test suite with 10 test cases:
  - `test_handle_describe_adds_description()` - Adding description to task without one
  - `test_handle_describe_updates_existing_description()` - Updating existing description
  - `test_handle_describe_multiline_text()` - Multi-line text support
  - `test_handle_describe_task_not_found()` - Non-existent task ID
  - `test_handle_describe_no_user()` - Missing user handling
  - `test_handle_describe_ambiguous_id()` - Ambiguous ID prefix
  - `test_handle_describe_save_error()` - IOError during save
  - `test_handle_describe_generic_exception()` - Generic exception handling
  - `test_handle_describe_verbose_mode()` - Verbose output verification
  - `test_handle_describe_empty_description()` - Empty string to clear description
- All 281 tests passing
- 100% test coverage maintained

**Technical Details**:
The `describe` command allows users to add rich text descriptions to tasks, which:
1. Provides context and details beyond the task title
2. Earns a +5 point scoring bonus (configured in `scoring_config.json`)
3. Supports narrative task documentation as specified in the vision
4. Enables multi-line text for comprehensive task descriptions

Example usage:
```bash
motido describe --id abc123 "Detailed task description
with multiple lines
and comprehensive context"
```

### Task 1.3: Add `set-due` and `set-start` commands for date fields ✅

**Status**: Complete
**Files Modified**:
- `src/motido/core/utils.py`
- `src/motido/cli/main.py`
- `tests/test_cli_dates.py` (new file)
- `tests/test_utils_parse_date.py` (new file)

**Changes**:
- Added `parse_date()` utility function to `core/utils.py` supporting multiple date formats:
  - ISO format: "2025-12-31"
  - Relative dates: "today", "tomorrow", "yesterday"
  - Named weekdays: "next friday", "next monday", etc.
  - Intervals: "in 3 days", "in 2 weeks"
- Added `handle_set_due()` function to set or clear task due dates
- Added `handle_set_start()` function to set or clear task start dates
- Both commands support `--clear` flag to remove dates
- Added validation: error if neither date nor --clear is provided
- Added two CLI subparsers: `set-due` and `set-start`
- Created `test_cli_dates.py` with 24 comprehensive tests covering:
  - ISO date format
  - Relative date formats (tomorrow, today, next friday, in 3 days)
  - Clear flag functionality
  - Invalid date handling
  - Task not found
  - Missing user
  - Ambiguous ID
  - Save errors (IOError, RuntimeError)
  - Verbose mode
  - Missing date/clear validation
- Created `test_utils_parse_date.py` with 14 tests for date parsing:
  - All supported date formats
  - Case insensitivity
  - Whitespace handling
  - Invalid format error handling
- All 319 tests passing
- 100% test coverage maintained

**Technical Details**:
The flexible date parsing system allows users to set due and start dates using natural language instead of only strict ISO format dates. The `parse_date()` function:
1. Normalizes input to lowercase and strips whitespace
2. Attempts ISO format first (YYYY-MM-DD)
3. Falls through to relative dates (today/tomorrow)
4. Handles interval formats ("in X days/weeks")
5. Supports next weekday calculations
6. Returns datetime at midnight for consistency
7. Raises ValueError with helpful message for invalid formats

This fulfills the vision requirement for user-friendly date entry and prepares the system for future scoring enhancements based on due date proximity.

Example usage:
```bash
motido set-due --id abc123 "2025-12-31"
motido set-due --id abc123 "next friday"
motido set-due --id abc123 "in 3 days"
motido set-due --id abc123 --clear

motido set-start --id abc123 "today"
motido set-start --id abc123 "2025-01-15"
motido set-start --id abc123 --clear
```

### Task 1.4: Add `tag` command for tag management ✅

**Status**: Complete
**Files Modified**:
- `src/motido/cli/main.py`
- `tests/test_cli_tags.py` (new file)

**Changes**:
- Added `handle_tag()` function with three subcommands: add, remove, list
- Command syntax: `motido tag <add|remove|list> --id <task-id> [tag]`
- Add operation prevents duplicate tags and strips whitespace
- Remove operation validates tag exists before removing
- List operation displays all tags or indicates none present
- Added validation to require tag argument for add/remove operations
- Added tag CLI subparser with choices constraint
- Created comprehensive test suite with 17 test cases:
  - `test_handle_tag_add_new_tag()` - Adding new tag to task
  - `test_handle_tag_add_duplicate_tag()` - Duplicate prevention
  - `test_handle_tag_add_with_whitespace()` - Whitespace stripping
  - `test_handle_tag_remove_existing_tag()` - Removing existing tag
  - `test_handle_tag_remove_nonexistent_tag()` - Removing non-existent tag
  - `test_handle_tag_list_with_tags()` - Listing tags when present
  - `test_handle_tag_list_without_tags()` - Listing when no tags
  - `test_handle_tag_list_with_multiple_tags()` - Multiple tags display
  - `test_handle_tag_task_not_found()` - Non-existent task ID
  - `test_handle_tag_no_user()` - Missing user handling
  - `test_handle_tag_ambiguous_id()` - Ambiguous ID prefix
  - `test_handle_tag_add_save_error()` - IOError during add
  - `test_handle_tag_remove_save_error()` - IOError during remove
  - `test_handle_tag_generic_exception()` - Generic exception handling
  - `test_handle_tag_verbose_mode()` - Verbose output verification
  - `test_handle_tag_add_missing_tag_argument()` - Validation for missing tag on add
  - `test_handle_tag_remove_missing_tag_argument()` - Validation for missing tag on remove
- All 336 tests passing (17 new tests)
- 100% test coverage maintained (1220 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The `tag` command enables users to organize and categorize tasks using flexible tags. The implementation:
1. Supports three operations via subcommands (add, remove, list)
2. Prevents duplicate tags when adding (uses `in` operator for fast lookup)
3. Strips whitespace from tags for consistency
4. Validates tag argument is provided for add/remove operations
5. Provides clear feedback for each operation (added, already exists, removed, not found, listed)
6. Follows the same error handling pattern as other CLI commands (ValueError, IOError, Exception)
7. Uses Task.tags List[str] field from the model

This prepares for future tag-based filtering and custom scoring multipliers planned for Phase 2.

Example usage:
```bash
motido tag add --id abc123 "urgent"
motido tag add --id abc123 "work"
motido tag list --id abc123
# Output: Tags for task 'Task Title': urgent, work

motido tag remove --id abc123 "urgent"
motido tag list --id abc123
# Output: Tags for task 'Task Title': work
```

### Task 1.5: Add `project` command for project assignment ✅

**Status**: Complete
**Files Modified**:
- `src/motido/cli/main.py`
- `tests/test_cli_project.py` (new file)

**Changes**:
- Added `import re` to module imports for project name validation
- Added `handle_project()` function to set or clear task projects
- Command syntax: `motido project --id <task-id> <project-name>` or `motido project --id <task-id> --clear`
- Implemented project name validation using regex pattern `^[a-zA-Z0-9\s\-_]+$`
- Supports alphanumeric characters, spaces, dashes, and underscores in project names
- Strips leading/trailing whitespace from project names
- Added validation requiring either project name or --clear flag
- Added project CLI subparser with optional project argument and --clear flag
- Created comprehensive test suite with 17 test cases:
  - `test_handle_project_set_new_project()` - Setting new project on task
  - `test_handle_project_update_existing_project()` - Updating existing project
  - `test_handle_project_with_spaces()` - Project names with spaces
  - `test_handle_project_with_dashes()` - Project names with dashes
  - `test_handle_project_with_underscores()` - Project names with underscores
  - `test_handle_project_with_whitespace()` - Whitespace stripping
  - `test_handle_project_clear_existing_project()` - Clearing existing project
  - `test_handle_project_clear_when_no_project()` - Clearing when no project set
  - `test_handle_project_invalid_characters()` - Validation for invalid characters
  - `test_handle_project_no_project_no_clear()` - Validation for missing arguments
  - `test_handle_project_task_not_found()` - Non-existent task ID
  - `test_handle_project_no_user()` - Missing user handling
  - `test_handle_project_ambiguous_id()` - Ambiguous ID prefix
  - `test_handle_project_save_error()` - IOError during set
  - `test_handle_project_clear_save_error()` - IOError during clear
  - `test_handle_project_generic_exception()` - Generic exception handling
  - `test_handle_project_verbose_mode()` - Verbose output verification
- All 353 tests passing (17 new tests)
- 100% test coverage maintained (1256 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The `project` command enables users to organize tasks by assigning them to projects. The implementation:
1. Uses regex validation to ensure project names contain only safe characters
2. Strips whitespace for consistency
3. Validates that either a project name or --clear flag is provided
4. Provides clear feedback for set and clear operations
5. Follows the same error handling pattern as other CLI commands (ValueError, IOError, Exception)
6. Uses Task.project str | None field from the model

This prepares for future project-based filtering and custom scoring multipliers planned for Phase 2.

Example usage:
```bash
motido project --id abc123 "Work Tasks"
motido project --id abc123 "my-project"
motido project --id abc123 --clear
```

### Task 1.6: Update `list` command to display new fields ✅

**Status**: Complete
**Files Modified**:
- `src/motido/cli/main.py`
- `tests/test_cli_list_enhanced.py` (new file)

**Changes**:
- Added `timedelta` to datetime imports for date comparison logic
- Enhanced `handle_list()` function to conditionally display optional task fields
- Implemented field detection logic:
  - `has_due_dates = any(task.due_date for task, _ in tasks_with_scores)`
  - `has_start_dates = any(task.start_date for task, _ in tasks_with_scores)`
  - `has_tags = any(task.tags for task, _ in tasks_with_scores)`
  - `has_projects = any(task.project for task, _ in tasks_with_scores)`
- Conditionally add columns to table only if any task has that field
- Added color coding for due dates:
  - Red bold: Overdue tasks (due_date < today and not complete)
  - Yellow: Tasks due within 3 days
  - Normal style: Future dates
  - Dim: Empty values displayed as "-"
- Added start date column with formatted dates (YYYY-MM-DD)
- Added tags column displaying comma-separated list
- Added project column displaying project name
- Updated row building with type hint: `row_data: list[str | Text]`
- Created comprehensive test suite with 3 test cases:
  - `test_handle_list_with_all_fields()` - Tasks with all optional fields populated
  - `test_handle_list_with_partial_fields()` - Mixed tasks (some with fields, some without)
  - `test_handle_list_without_optional_fields()` - Tasks with no optional fields
- All 356 tests passing (3 new tests)
- 100% test coverage maintained (1295 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The enhanced list command provides a dynamic table view that adapts to the data. Key implementation patterns:
1. **Conditional columns**: Only show columns if at least one task has that field populated
2. **Color coding strategy**:
   - Overdue tasks highlighted in red bold to draw attention
   - Tasks due within 3 days shown in yellow for urgency
   - Completed tasks use dim style throughout
3. **Graceful degradation**: Empty values shown as "-" in dim style
4. **Type safety**: Used `list[str | Text]` for row_data to support mixed content types
5. **Date comparison**: `timedelta(days=3)` for "due soon" threshold

Example output with all fields:
```
┌─────────┬──────────┬───────────┬──────────────┬──────────┬───────┬────────────┬────────────┬─────────────┬──────────┐
│ Status  │ ID       │ Priority  │ Difficulty   │ Duration │ Score │ Due Date   │ Start Date │ Tags        │ Project  │
├─────────┼──────────┼───────────┼──────────────┼──────────┼───────┼────────────┼────────────┼─────────────┼──────────┤
│ ⭕ TODO │ uuid-001 │ High      │ Medium       │ Medium   │   30  │ 2025-01-20 │ 2025-01-10 │ urgent,work │ MyProject│
│ ⭕ TODO │ uuid-002 │ Defcon 1  │ High         │ Long     │   90  │ 2025-01-10 │ 2025-01-01 │ late        │ Old...   │
└─────────┴──────────┴───────────┴──────────────┴──────────┴───────┴────────────┴────────────┴─────────────┴──────────┘
```

This prepares the UI for enhanced scoring factors (due date proximity) planned in Phase 2.

