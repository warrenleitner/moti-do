# Plan: Add creation_date field to Task Model and Update CLI

This plan outlines the steps to add a `creation_date` field to the `Task` data model and update the `add`, `view`, and `edit` CLI commands and their corresponding tests to handle this new field.

## Goals

1.  Modify the `Task` data model to include a `creation_date` field.
2.  Update the `add` command to automatically set the `creation_date`.
3.  Update unit tests for the `add` command to verify `creation_date` is set correctly.
4.  Update the `view` command to display the `creation_date`.
5.  Update unit tests for the `view` command to verify `creation_date` is displayed correctly.
6.  Ensure the `edit` command does not modify the `creation_date`.
7.  Add a unit test for the `edit` command to verify `creation_date` immutability.
8.  Run linter and type checker, and ensure all tests pass.

## Detailed Steps

1.  **Modify `src/motido/core/models.py`:**
    *   Import the `datetime` module.
    *   Add a `creation_date: datetime` field to the `Task` dataclass. This field should not have a default value, ensuring it's set during instantiation.
    *   Update the `__str__` method in the `Task` class (around line 62) to include the `creation_date` in the output, formatted as "Created: YYYY-MM-DD HH:MM:SS".

2.  **Modify `src/motido/cli/main.py`:**
    *   Import the `datetime` module.
    *   In the `handle_create` function (around line 54), before creating a new `Task` object, get the current timestamp using `datetime.datetime.now()` and pass it to the `Task` constructor for the `creation_date` field.
    *   In the `handle_view` function (around line 147), update the rich table display logic (around line 162) to include a row for the `creation_date`, formatted as "Created: YYYY-MM-DD HH:MM:SS".
    *   In the `handle_edit` function (around line 233), ensure that the `creation_date` is not modified when editing a task. The current implementation only updates `description` and `priority`, so this should be implicitly handled, but it's good to be aware of.

3.  **Modify `tests/test_cli_main.py`:**
    *   Import the `datetime` module and `timedelta` from `datetime`.
    *   In the `test_handle_create_success_existing_user` (around line 306) and `test_handle_create_success_new_user` (around line 362) tests (and their non-verbose counterparts), add assertions to check that the `Task` object created by the mocked `Task` class was called with a `creation_date` argument that is a `datetime` object and is close to the current time (within a small delta).
    *   Add a new test `test_handle_view_with_creation_date` to specifically test that the `view` command output includes the "Created:" label and a correctly formatted timestamp. This test should mock a `User` and `Task` object with a predefined `creation_date`.
    *   Add a new test `test_handle_edit_preserves_creation_date` to verify that the `creation_date` of a task is not changed after calling the `edit` command. This test should mock a `User` and `Task` object with a predefined `creation_date`, call `handle_edit`, and then assert that the `creation_date` of the mocked task remains the same.

4.  **Run Checks:** After making the code and test changes, run `poetry run poe check` to ensure all tests pass and there are no linting or type checking issues.

## Visual Representation

```mermaid
graph TD
    A[Start] --> B{Modify Task Model};
    B --> C{Update Add Command};
    C --> D{Update Add Tests};
    D --> E{Update View Command};
    E --> F{Update View Tests};
    F --> G{Update Edit Command};
    G --> H{Update Edit Tests};
    H --> I{Run Checks};
    I --> J[End];

    B --> src_motido_core_models_py[src/motido/core/models.py];
    C --> src_motido_cli_main_py[src/motido/cli/main.py];
    E --> src_motido_cli_main_py;
    G --> src_motido_cli_main_py;
    D --> tests_test_cli_main_py[tests/test_cli_main.py];
    F --> tests_test_cli_main_py;
    H --> tests_test_cli_main_py;
    I --> Poetry[poetry run poe check];