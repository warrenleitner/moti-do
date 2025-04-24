# Plan: Add Difficulty Field to Moti-Do Task

This plan outlines the steps to add a `difficulty` field to the `Task` model, update the CLI, and ensure proper testing and quality checks.

**User Request:** (Sub-Stage 1.5: Add difficulty field)

*   Step 1.5.1: Define Enum/constants: NOT_SET, TRIVIAL, LOW, MEDIUM, HIGH, HERCULEAN.
*   Step 1.5.2: Modify Task model: Add difficulty field. Type: Enum/constant type. Default: NOT_SET. Update type hints.
*   Step 1.5.3: Update add parser: Add --difficulty <level>. Validate input. Update help.
*   Step 1.5.4: Update add logic: Convert string to Enum, store, handle default/invalid.
*   Step 1.5.5: Write/update add tests: Test each level, default, invalid input.
*   Step 1.5.6: Update edit parser: Add --difficulty <level>. Validate. Update help.
*   Step 1.5.7: Update edit logic: Update only difficulty. Convert input. Handle invalid.
*   Step 1.5.8: Write/update edit tests: Test editing to each level.
*   Step 1.5.9: Update view output: Display difficulty if not NOT_SET.
*   Step 1.5.10: Write/update view tests: Test display for each level, test NOT_SET.
*   Step 1.5.11: Run linter/type checker. Fix issues. Ensure tests pass. This MUST be confirmed with `poetry run poe check`

---

## Implementation Plan

**Phase 1: Core Model and CLI Argument Updates**

1.  **Define `Difficulty` Enum (Step 1.5.1):**
    *   File: `src/motido/core/models.py`
    *   Action: Define `Difficulty(str, Enum)` with members `NOT_SET`, `TRIVIAL`, `LOW`, `MEDIUM`, `HIGH`, `HERCULEAN`.
    *   Optional: Add `emoji()` and `display_style()` methods.

2.  **Modify `Task` Model (Step 1.5.2):**
    *   File: `src/motido/core/models.py`
    *   Action: Add `difficulty: Difficulty = field(default=Difficulty.NOT_SET)` to `Task` dataclass.

3.  **Update `add` Parser (Step 1.5.3):**
    *   File: `src/motido/cli/main.py` (in `setup_parser`)
    *   Action: Add `--difficulty`/`-f` argument to `parser_create` with choices from `Difficulty` enum.

4.  **Update `edit` Parser (Step 1.5.6):**
    *   File: `src/motido/cli/main.py` (in `setup_parser`)
    *   Action: Add `--difficulty`/`-f` argument to `parser_edit` (optional). Update help text.

**Phase 2: Logic Implementation**

5.  **Update `add` Logic (Step 1.5.4):**
    *   File: `src/motido/cli/main.py` (in `handle_create`)
    *   Action: Parse `--difficulty` argument, convert to `Difficulty` enum (handle `ValueError`), pass to `Task` constructor.

6.  **Update `edit` Logic (Step 1.5.7):**
    *   File: `src/motido/cli/main.py`
    *   Action:
        *   Add check for `args.difficulty` in `handle_edit`.
        *   Create `_update_task_difficulty` helper function.
        *   Call helper in `handle_edit`, handle `ValueError`.
        *   Update `_print_task_updates` signature and body.
        *   Update initial "no changes" check in `handle_edit`.

7.  **Update `view` Output (Step 1.5.9):**
    *   File: `src/motido/cli/main.py` (in `handle_view`)
    *   Action: Add a row to the `rich` table to display `task.difficulty.value` *only if* `task.difficulty != Difficulty.NOT_SET`.

**Phase 3: Testing and Verification**

8.  **Write/Update Tests (Steps 1.5.5, 1.5.8, 1.5.10):**
    *   `tests/test_models.py`: Test `Difficulty` enum, `Task` default.
    *   `tests/test_cli_main.py`: Test `create`, `edit`, `view` commands with various difficulty inputs (valid, invalid, default).
    *   `tests/test_json_manager.py`, `tests/test_database_manager.py`: Verify persistence implicitly or add specific tests.

9.  **Run Quality Checks (Step 1.5.11):**
    *   Command: `poetry run poe check`
    *   Action: Fix all reported `black`, `isort`, `pylint`, `mypy` errors. Ensure all `pytest` tests pass.

---

## Flow Diagram

```mermaid
graph TD
    subgraph "Phase 1: Model & CLI Args"
        direction LR
        P1_Enum[1. Define Difficulty Enum<br>(models.py)] --> P1_Model[2. Add difficulty field to Task<br>(models.py)]
        P1_Model --> P1_AddParser[3. Update 'add' parser<br>(main.py)]
        P1_Model --> P1_EditParser[4. Update 'edit' parser<br>(main.py)]
    end

    subgraph "Phase 2: Logic Implementation"
        direction LR
        P1_AddParser --> P2_AddLogic[5. Update 'add' logic<br>(handle_create)]
        P1_EditParser --> P2_EditLogic[6. Update 'edit' logic<br>(handle_edit, helpers)]
        P1_Model --> P2_ViewLogic[7. Update 'view' output<br>(handle_view)]
    end

    subgraph "Phase 3: Testing & Verification"
        direction TB
        P2_AddLogic --> P3_AddTests[8a. Write/Update 'add' tests]
        P2_EditLogic --> P3_EditTests[8b. Write/Update 'edit' tests]
        P2_ViewLogic --> P3_ViewTests[8c. Write/Update 'view' tests]
        P3_AddTests --> P3_Persistence[8d. Verify Persistence Tests]
        P3_EditTests --> P3_Persistence
        P3_ViewTests --> P3_Persistence
        P3_Persistence --> P3_Checks[9. Run 'poetry run poe check'<br>(Linters, Types, Tests)]
    end

    P1_Enum --> P2_AddLogic
    P1_Enum --> P2_EditLogic
    P1_Enum --> P2_ViewLogic

    P3_Checks --> End[Feature Complete & Verified]

    style P3_Checks fill:#f9f,stroke:#333,stroke-width:2px