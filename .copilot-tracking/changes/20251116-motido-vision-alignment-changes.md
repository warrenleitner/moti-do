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

### Task 1.7: Update `view` command to show all fields ✅

**Status**: Complete
**Files Modified**:
- `src/motido/cli/main.py`
- `tests/test_cli_main.py`
- `tests/test_cli_view_enhanced.py` (new file)

**Changes**:
- Enhanced `handle_view()` function to display all Task model fields
- Updated text_description display to always show ("Not set" if empty)
- Added due_date display with color coding:
  - Red bold: Overdue tasks (due_date < today and not complete)
  - Yellow: Tasks due within 3 days
  - Normal: Future dates
  - Dim "Not set": No due date
- Added start_date display (formatted YYYY-MM-DD or "Not set")
- Added tags display (comma-separated list or "Not set")
- Added project display (project name or "Not set")
- Updated existing test `test_handle_view_success_with_difficulty()` to accommodate new fields
- Added mock fields to test: text_description, due_date, start_date, tags, project
- Updated assertion from 9 rows to 13 rows (added 5 new fields: Description, Due Date, Start Date, Tags, Project)
- Updated Text() call count from 5 to 10 (added 5 "Not set" Text objects)
- Created comprehensive test suite with 4 test cases:
  - `test_handle_view_with_all_fields()` - Task with all optional fields populated
  - `test_handle_view_with_minimal_fields()` - Task with only required fields
  - `test_handle_view_with_overdue_task()` - Overdue task (red color coding)
  - `test_handle_view_with_due_soon_task()` - Task due soon (yellow color coding)
- All 360 tests passing (4 new tests)
- 100% test coverage maintained (1316 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The view command now provides a complete task detail view with all fields visible:
1. **Always visible fields**: ID, Status, Priority, Created, Difficulty, Duration, Title
2. **Always shown with fallback**: Description, Due Date, Start Date, Tags, Project ("Not set" if empty)
3. **Color coding**: Matches list command pattern for due dates
4. **Rich formatting**: Uses Text objects for styled output, emojis for enums
5. **Row count**: 13 rows total (was 9, added 4 new fields + Description now always shown)

Example output with all fields:
```
ID:           abc123def456
Status:       Incomplete
Priority:     🟡 High
Created:      2025-11-16 14:30:00
Difficulty:   🟠 Medium
Duration:     🟣 Long
Title:        Task with all fields
Description:  This is a detailed description
              with multiple lines
Due Date:     2025-11-21
Start Date:   2025-11-14
Tags:         urgent, work, important
Project:      MyProject
Score:        45
```

Example output with minimal fields:
```
ID:           xyz789abc123
Status:       Incomplete
Priority:     ⚪ Low
Created:      2025-11-16 14:30:00
Difficulty:   ⚪ Trivial
Duration:     ⚪ Miniscule
Title:        Minimal task
Description:  Not set
Due Date:     Not set
Start Date:   Not set
Tags:         Not set
Project:      Not set
Score:        10
```

This provides users with complete visibility into all task details, supporting informed decision-making.

### Task 1.8: Write comprehensive tests for new commands ✅

**Status**: Complete
**Files Verified**:
- `tests/test_cli_describe.py` - 10 comprehensive tests for describe command
- `tests/test_cli_dates.py` - 24 comprehensive tests for set-due and set-start commands
- `tests/test_cli_tags.py` - 17 comprehensive tests for tag management
- `tests/test_cli_project.py` - 17 comprehensive tests for project assignment
- `tests/test_cli_list_enhanced.py` - 3 comprehensive tests for enhanced list display
- `tests/test_cli_view_enhanced.py` - 4 comprehensive tests for enhanced view display
- `tests/test_cli_main.py` - Updated existing tests for compatibility

**Test Coverage Summary**:
- Total CLI tests: 189 tests passing
- CLI module coverage: 100% (709 statements, 0 missed)
- Total project coverage: 100% (1316 statements, 0 missed)
- All tests pass with Pylint 10.0/10.0
- Type checking passes with mypy (40 source files)

**Technical Details**:
All test files created during Phase 1 implementation provide comprehensive coverage:

1. **test_cli_describe.py** (Task 1.2):
   - Adding description to task without one
   - Updating existing description
   - Multi-line text support
   - Error handling (task not found, no user, ambiguous ID, save errors)
   - Verbose mode
   - Empty description to clear

2. **test_cli_dates.py** (Task 1.3):
   - ISO date format parsing
   - Relative date formats (tomorrow, today, next friday, in 3 days)
   - Clear flag functionality
   - Invalid date handling
   - Error handling (task not found, missing user, ambiguous ID, save errors)
   - Verbose mode
   - Both set-due and set-start commands

3. **test_cli_tags.py** (Task 1.4):
   - Adding new tags
   - Duplicate prevention
   - Whitespace stripping
   - Removing existing/non-existent tags
   - Listing tags (with tags, without tags, multiple tags)
   - Error handling (task not found, no user, ambiguous ID, save errors)
   - Verbose mode
   - Missing tag argument validation

4. **test_cli_project.py** (Task 1.5):
   - Setting new project
   - Updating existing project
   - Project names with spaces, dashes, underscores
   - Whitespace stripping
   - Clearing existing project
   - Invalid character validation
   - Error handling (task not found, no user, ambiguous ID, save errors)
   - Verbose mode
   - Missing arguments validation

5. **test_cli_list_enhanced.py** (Task 1.6):
   - Tasks with all optional fields populated
   - Mixed tasks (some with fields, some without)
   - Tasks with no optional fields
   - Conditional column display logic

6. **test_cli_view_enhanced.py** (Task 1.7):
   - Task with all optional fields populated
   - Task with only required fields
   - Overdue task (red color coding)
   - Task due soon (yellow color coding)

**Verification Results**:
- ✅ 100% code coverage maintained across all modules
- ✅ All tests pass (360 total, 189 CLI-specific)
- ✅ Pylint 10.0/10.0 score maintained
- ✅ Type checking passes (mypy)
- ✅ Tests cover happy path and error cases
- ✅ Tests verify data persistence
- ✅ Edge cases handled (invalid input, missing data, errors)

## Phase 1: Foundation Completion - COMPLETE ✅

**All 8 tasks completed successfully!**

**Summary of Phase 1 Achievements**:
1. ✅ Fixed XP persistence system - XP now properly saves to user data
2. ✅ Activated text_description field with `describe` command
3. ✅ Activated due_date and start_date fields with `set-due` and `set-start` commands
4. ✅ Activated tags field with `tag` command (add/remove/list operations)
5. ✅ Activated project field with `project` command (set/clear operations)
6. ✅ Enhanced `list` command with conditional columns and color coding
7. ✅ Enhanced `view` command to display all fields with fallbacks
8. ✅ Comprehensive test suite with 100% coverage

**Quality Metrics**:
- Test Coverage: 100% (1316 statements, 0 missed)
- Pylint Score: 10.0/10.0
- Type Safety: 100% (mypy passing on 40 files)
- Total Tests: 360 passing
- CLI Tests: 189 passing

**Fields Now Accessible**:
- ✅ text_description (via `describe` command)
- ✅ due_date (via `set-due` command)
- ✅ start_date (via `set-start` command)
- ✅ tags (via `tag` command)
- ✅ project (via `project` command)
- ✅ All fields visible in `list` and `view` commands

**Next Steps**:
Phase 1 complete! Ready to proceed to Phase 2: Enhanced Scoring System, which will implement:
- Due date proximity scoring (exponential)
- Start date aging bonus
- Dependency chain scoring
- Tag/project custom multipliers
- Priority multiplier integration

---

## Phase 2: Enhanced Scoring System (Week 3-4)

### Task 2.1: Implement due date proximity scoring ✅

**Status**: Complete
**Files Modified**:
- `src/motido/data/scoring_config.json`
- `src/motido/core/scoring.py`
- `tests/test_fixtures.py`
- `tests/test_scoring.py`
- `tests/test_scoring_edge_cases.py`

**Changes**:
- Added `due_date_proximity` configuration section to scoring_config.json with 4 parameters:
  - `enabled`: Boolean feature toggle (default: true)
  - `overdue_multiplier_per_day`: Exponential scaling for overdue tasks (default: 0.5)
  - `approaching_threshold_days`: Days before due date to start increasing score (default: 14)
  - `approaching_multiplier_per_day`: Linear scaling within threshold (default: 0.1)
- Added `due_date_proximity` to default_config in `load_scoring_config()`
- Added `due_date_proximity` to required_keys list in validation
- Implemented comprehensive validation for all 4 due_date_proximity fields (20 validation checks)
- Created `calculate_due_date_multiplier()` function (51 lines) with three scoring modes:
  - **Overdue tasks**: `1.0 + (days_overdue × 0.5)` - aggressive exponential growth
  - **Approaching tasks**: `1.0 + ((14 - days_until_due) × 0.1)` - gradual linear increase
  - **Future tasks** (>14 days): `1.0` - no bonus
- Integrated due_date_multiplier into `calculate_score()` formula
- Added type casts for mypy compliance (float/int explicit conversions)
- Updated test helper functions in test_fixtures.py:
  - Added due_date_proximity to `get_default_scoring_config()`
  - Added due_date_proximity to `get_simple_scoring_config()`
- Created 9 comprehensive tests in test_scoring.py:
  - `test_calculate_due_date_multiplier_no_due_date()` - Returns 1.0 when no due date
  - `test_calculate_due_date_multiplier_disabled()` - Returns 1.0 when feature disabled
  - `test_calculate_due_date_multiplier_overdue()` - 7 days overdue = 4.5x multiplier
  - `test_calculate_due_date_multiplier_approaching()` - 3 days away = 2.1x multiplier
  - `test_calculate_due_date_multiplier_at_threshold()` - 14 days = 1.0x (boundary case)
  - `test_calculate_due_date_multiplier_beyond_threshold()` - 30 days = 1.0x
  - `test_calculate_due_date_multiplier_one_day_overdue()` - 1 day = 1.5x
  - `test_calculate_score_with_due_date_multiplier()` - Integration test: score = 63
  - `test_calculate_score_with_overdue_multiplier()` - Overdue integration: score = 81
- Created 9 validation tests in test_scoring_edge_cases.py:
  - `test_load_scoring_config_invalid_due_date_proximity_type()` - Type validation
  - `test_load_scoring_config_missing_due_date_proximity_enabled_key()` - Missing enabled
  - `test_load_scoring_config_invalid_due_date_proximity_enabled_type()` - Bool validation
  - `test_load_scoring_config_missing_overdue_multiplier_per_day_key()` - Missing multiplier
  - `test_load_scoring_config_invalid_overdue_multiplier_per_day_value()` - Negative check
  - `test_load_scoring_config_missing_approaching_threshold_days_key()` - Missing threshold
  - `test_load_scoring_config_invalid_approaching_threshold_days_value()` - Negative check
  - `test_load_scoring_config_missing_approaching_multiplier_per_day_key()` - Missing multiplier
  - `test_load_scoring_config_invalid_approaching_multiplier_per_day_value()` - Negative check
- All 378 tests passing (18 new tests)
- 100% test coverage maintained (1352 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The due date proximity scoring creates urgency for approaching and overdue tasks using two different scaling strategies:

1. **Overdue Scoring (Exponential)**:
   - Formula: `1.0 + (days_overdue × 0.5)`
   - Example: 7 days overdue → 4.5x multiplier
   - Rationale: Overdue tasks should become exponentially more urgent each day

2. **Approaching Scoring (Linear)**:
   - Formula: `1.0 + ((threshold - days_until_due) × 0.1)`
   - Threshold: 14 days (configurable)
   - Example: 3 days until due → 2.1x multiplier
   - Rationale: Gradual increase as deadline approaches

3. **Future Tasks (Beyond Threshold)**:
   - Formula: `1.0` (no bonus)
   - Example: 30 days until due → 1.0x multiplier
   - Rationale: Far-future tasks don't need urgency boost

**Integration**:
Final score calculation now includes due date multiplier:
```python
final_score = base * difficulty * duration * age * due_date_proximity
```

**Configuration Example**:
```json
"due_date_proximity": {
  "enabled": true,
  "overdue_multiplier_per_day": 0.5,
  "approaching_threshold_days": 14,
  "approaching_multiplier_per_day": 0.1
}
```

**Usage Example**:
```bash
# Create task with due date
motido create "Urgent task" --priority High --difficulty Medium
motido set-due --id abc123 "in 3 days"

# Task score increases as due date approaches
# 14+ days: base score
# 3 days: base × 2.1
# Overdue 7 days: base × 4.5
```

This fulfills the vision requirement for time-sensitive task prioritization and prepares for future enhancements (start date aging, dependency chains).

### Task 2.2: Add start date aging bonus ✅

**Status**: Complete
**Files Modified**:
- `src/motido/data/scoring_config.json`
- `src/motido/core/scoring.py`
- `tests/test_fixtures.py`
- `tests/test_scoring.py`
- `tests/test_scoring_edge_cases.py`

**Changes**:
- Added `start_date_aging` configuration section to scoring_config.json with 2 parameters:
  - `enabled`: Boolean feature toggle (default: true)
  - `bonus_points_per_day`: Linear bonus per day past start date (default: 0.5)
- Added `start_date_aging` to default_config in `load_scoring_config()`
- Added `start_date_aging` to required_keys list in validation
- Implemented comprehensive validation for start_date_aging fields (8 validation checks)
- Created `calculate_start_date_bonus()` function (48 lines) with smart bonus logic:
  - **No start date**: returns 0.0
  - **Feature disabled**: returns 0.0
  - **Future start date**: returns 0.0
  - **Past start date**: `days_past_start * 0.5` points added to base score
  - **Overdue tasks**: returns 0.0 (avoids double-counting with due date proximity)
  - **Non-overdue with start date**: applies bonus
- Integrated start_date_bonus into `calculate_score()` as additive to base (not multiplicative)
- Updated test helper functions in test_fixtures.py:
  - Added start_date_aging to `get_default_scoring_config()`
  - Added start_date_aging to `get_simple_scoring_config()`
- Created 9 comprehensive tests in test_scoring.py:
  - `test_calculate_start_date_bonus_no_start_date()` - Returns 0.0 when no start date
  - `test_calculate_start_date_bonus_disabled()` - Returns 0.0 when feature disabled
  - `test_calculate_start_date_bonus_future_start()` - Returns 0.0 when start in future
  - `test_calculate_start_date_bonus_past_start()` - 10 days past = 5.0 bonus
  - `test_calculate_start_date_bonus_overdue_task()` - Returns 0.0 for overdue tasks
  - `test_calculate_start_date_bonus_with_future_due_date()` - Applies when due date is future
  - `test_calculate_score_with_start_date_bonus()` - Integration test: score = 45
  - `test_calculate_score_with_both_start_and_due_date()` - Both bonuses: score = 142
- Created 5 validation tests in test_scoring_edge_cases.py:
  - `test_load_scoring_config_invalid_start_date_aging_type()` - Type validation
  - `test_load_scoring_config_missing_start_date_aging_enabled_key()` - Missing enabled
  - `test_load_scoring_config_invalid_start_date_aging_enabled_type()` - Bool validation
  - `test_load_scoring_config_missing_bonus_points_per_day_key()` - Missing bonus key
  - `test_load_scoring_config_invalid_bonus_points_per_day_value()` - Negative check
- Updated 4 existing tests to include start_date_aging in mock configs
- All 391 tests passing (14 new tests)
- 100% test coverage maintained (1379 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The start date aging bonus rewards tasks that have been in progress for a while, using a linear additive formula (not multiplicative like due date proximity):

1. **Linear Bonus Calculation**:
   - Formula: `days_past_start * 0.5` points added to base score
   - Example: 10 days past start → +5.0 points to base score
   - Rationale: Tasks that have been started deserve priority

2. **Smart Avoidance of Double-Counting**:
   - If task is overdue (due_date < effective_date), start date bonus does NOT apply
   - This prevents stacking urgency from both start date aging AND due date proximity
   - Only tasks with future due dates or no due dates get start date bonus

3. **Additive vs Multiplicative**:
   - Start date bonus is added to base score BEFORE multiplication
   - This makes it contribute to the foundation rather than amplifying the final score
   - Example: `(base + start_bonus) * difficulty * duration * age * due_date`

**Integration**:
Final score calculation formula:
```python
additive_base = base_score + text_desc_bonus + start_date_bonus
final_score = additive_base * difficulty * duration * age * due_date_proximity
```

**Configuration Example**:
```json
"start_date_aging": {
  "enabled": true,
  "bonus_points_per_day": 0.5
}
```

**Usage Example**:
```bash
# Create task with start date
motido create "Long-running project" --priority Medium --difficulty High
motido set-start --id abc123 "2025-01-01"
motido set-due --id abc123 "2025-02-01"

# On 2025-01-15 (15 days past start):
# base = 10 + (15 * 0.5) = 17.5
# Due in 17 days, so no due date multiplier
# score = 17.5 * 2.0 (med) * 3.0 (high) * age_mult = higher score

# If task becomes overdue on 2025-02-05:
# Start date bonus stops applying (avoids double-counting)
# Due date multiplier takes over for urgency
```

This fulfills the vision requirement for rewarding tasks that have been started and are in progress, while intelligently avoiding double-counting urgency with the due date proximity system.

### Task 2.3: Implement dependency chain scoring ✅

**Status**: Complete
**Files Modified**:
- `src/motido/data/scoring_config.json`
- `src/motido/core/scoring.py`
- `src/motido/cli/main.py`
- `tests/test_fixtures.py`
- `tests/test_scoring.py`
- `tests/test_scoring_edge_cases.py`
- `tests/test_cli_scoring.py`
- `tests/test_scoring_dependencies.py` (new file)

**Changes**:
- Added `dependency_chain` configuration section to scoring_config.json with 2 parameters:
  - `enabled`: Boolean feature toggle (default: true)
  - `dependent_score_percentage`: Percentage of dependent task scores to add as bonus (default: 0.1 = 10%)
- Added `dependency_chain` to default_config in `load_scoring_config()`
- Added `dependency_chain` to required_keys list in validation
- Implemented comprehensive validation for dependency_chain fields (7 validation checks)
- Created `calculate_dependency_chain_bonus()` function (67 lines) with recursive scoring:
  - **No dependents**: returns 0.0
  - **Feature disabled**: returns 0.0
  - **Circular dependency detection**: raises ValueError with specific error message
  - **Recursive calculation**: Finds all incomplete tasks that depend on this task, recursively calculates their scores (including their dependencies), and returns configurable percentage (default 10%) of total as bonus
  - **Completed tasks excluded**: Only incomplete dependent tasks contribute to bonus
  - **Visited set tracking**: Prevents infinite loops in circular dependency graphs
- Updated `calculate_score()` function signature to accept `all_tasks` parameter (Dict[str, Task] | None)
- Added `visited` parameter to calculate_score for circular dependency detection
- Integrated dependency_chain_bonus into calculate_score as additive to final score
- Updated all CLI calls to calculate_score to pass `None` for all_tasks (dependency command will be added later):
  - `handle_list()`: calculate_score(task, None, scoring_config, today)
  - `handle_view()`: calculate_score(task, None, scoring_config, date.today())
  - `handle_complete()`: calculate_score(task, None, scoring_config, date.today())
- Updated test helper functions in test_fixtures.py:
  - Added dependency_chain to `get_default_scoring_config()`
  - Added dependency_chain to `get_simple_scoring_config()`
- Updated all existing calculate_score calls in tests to pass `None` for all_tasks parameter:
  - Fixed 9 calls in test_scoring.py
  - Fixed 1 call in test_scoring_edge_cases.py
  - Fixed 2 calls in test_cli_scoring.py
- Updated 4 existing test mock configs to include dependency_chain:
  - test_load_scoring_config_valid
  - test_load_scoring_config_invalid_multiplier
  - test_load_scoring_config_invalid_age_factor
  - test_load_scoring_config_invalid_daily_penalty
- Created comprehensive test file test_scoring_dependencies.py with 11 tests:
  - `test_calculate_dependency_chain_bonus_no_dependents()` - Returns 0.0 when no dependents
  - `test_calculate_dependency_chain_bonus_disabled()` - Returns 0.0 when feature disabled
  - `test_calculate_dependency_chain_bonus_single_dependent()` - One dependent task (10% of dependent's score)
  - `test_calculate_dependency_chain_bonus_multiple_dependents()` - Multiple dependents (10% of sum)
  - `test_calculate_dependency_chain_bonus_completed_dependent_excluded()` - Completed tasks don't contribute
  - `test_calculate_dependency_chain_bonus_recursive()` - Recursive chain A <- B <- C
  - `test_calculate_dependency_chain_bonus_circular_dependency()` - Raises ValueError for circular deps
  - `test_calculate_dependency_chain_bonus_custom_percentage()` - Custom percentage (20%)
  - `test_calculate_score_with_dependency_chain_integration()` - Integration test
  - `test_calculate_dependency_chain_bonus_self_dependency_prevention()` - Task can't depend on itself
- Created 7 validation tests in test_scoring_edge_cases.py:
  - `test_load_scoring_config_invalid_dependency_chain_type()` - Type validation
  - `test_load_scoring_config_missing_dependency_chain_enabled_key()` - Missing enabled
  - `test_load_scoring_config_invalid_dependency_chain_enabled_type()` - Bool validation
  - `test_load_scoring_config_missing_dependent_score_percentage_key()` - Missing percentage key
  - `test_load_scoring_config_invalid_dependent_score_percentage_type()` - Number validation
  - `test_load_scoring_config_invalid_dependent_score_percentage_range()` - Range validation (0.0-1.0)
- All 407 tests passing (16 new tests)
- 100% test coverage maintained (1414 statements, 0 missed)
- Pylint 10.0/10 maintained

**Technical Details**:
The dependency chain scoring rewards tasks that are blocking other work, using a recursive additive formula:

1. **Recursive Bonus Calculation**:
   - Formula: `sum(dependent_task_scores) * 0.1` (default 10%)
   - Example: Task A has 2 dependents with scores 30 and 50 → A gets (30+50)*0.1 = 8 bonus points
   - Rationale: Tasks that block other work should be prioritized

2. **Circular Dependency Detection**:
   - Uses visited set to track traversal path
   - Raises ValueError if circular dependency detected
   - Error message includes task ID prefix for debugging

3. **Completed Task Exclusion**:
   - Only incomplete dependent tasks contribute to bonus
   - Prevents completed work from inflating scores

4. **Additive vs Multiplicative**:
   - Dependency bonus is added to final score AFTER multipliers
   - This makes it a direct reward rather than an amplifier
   - Example: `base * difficulty * duration * age * due_date + dependency_bonus`

**Integration**:
Final score calculation formula:
```python
base_final_score = additive_base * difficulty_mult * duration_mult * age_mult * due_date_mult
dependency_bonus = calculate_dependency_chain_bonus(task, all_tasks, config, effective_date)
final_score = base_final_score + dependency_bonus
```

**Configuration Example**:
```json
"dependency_chain": {
  "enabled": true,
  "dependent_score_percentage": 0.1
}
```

**Usage Example** (CLI command will be implemented in separate task):
```bash
# Task dependencies are stored in Task.dependencies field (List[str] of task IDs)
# Example scenario:
# - Task A: "Foundation" (base score 20)
# - Task B: "Build walls" depends on A (base score 30)
# - Task C: "Build roof" depends on B (base score 40)
#
# Scoring:
# - Task C: 40 (no dependents)
# - Task B: 30 + (40 * 0.1) = 34 (gets 10% of C's score)
# - Task A: 20 + (34 * 0.1) = 23.4 = 23 (gets 10% of B's full score)
#
# This encourages completing blocking tasks first
```

This fulfills the vision requirement for dependency-aware task prioritization, making the system understand task relationships and prioritize work that unblocks other tasks.



