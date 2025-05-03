"""Additional tests for main.py to improve code coverage."""

# pylint: disable=redefined-outer-name
# ^ This disables the "redefined-outer-name" warning which is normal for pytest fixtures

from datetime import datetime
from typing import Any, cast
from unittest.mock import MagicMock

import pytest

from motido.cli import main as cli_main
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DataManager

from .test_cli_main import create_mock_args


# Fixture to create a mock manager
@pytest.fixture
def mock_manager(mocker: Any) -> MagicMock:
    """Provides a reusable mock DataManager."""
    return cast(MagicMock, mocker.MagicMock(spec=DataManager))


# Fixture to create a mock user
@pytest.fixture
def mock_user(mocker: Any) -> MagicMock:
    """Provides a reusable mock User."""
    return cast(MagicMock, mocker.MagicMock(spec=User))


# Fixture to mock builtins.print
@pytest.fixture
def mock_print(mocker: Any) -> MagicMock:
    """Provides a mock for builtins.print."""
    return cast(MagicMock, mocker.patch("builtins.print"))


def test_handle_create_custom_exceptions(
    mock_manager: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_create with custom ValueError during save."""
    mock_user = MagicMock(spec=User)
    error_message = "Custom value error during save"
    mock_manager.save_user.side_effect = ValueError(error_message)
    # Use create_mock_args to ensure 'verbose' is present
    args = create_mock_args(description="Task causing ValueError")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_view_type_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view catches TypeError during find_task_by_id."""
    error_message = "Type error during find"
    mock_user.find_task_by_id.side_effect = TypeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="abc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_attribute_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches AttributeError during save."""
    mock_task = Task(
        description="Old",
        creation_date=datetime.now(),
        id="edit-attr-err",
        priority=Priority.LOW,
    )
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "Attribute error on save"
    mock_manager.save_user.side_effect = AttributeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="edit-attr", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_attribute_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches AttributeError during removal."""
    error_message = "Attribute error during remove"
    mock_user.remove_task.side_effect = AttributeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="del-attr")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager, mock_user)

        mock_print.assert_any_call(
            f"An unexpected error occurred during deletion: {error_message}"
        )
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_edit_io_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches IOError during save."""
    mock_task = Task(
        description="Old IO",
        creation_date=datetime.now(),
        id="edit-io-err",
        priority=Priority.LOW,
    )
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "IO error on save"
    mock_manager.save_user.side_effect = IOError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="edit-io", description="New Desc IO")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving task update: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_io_error(mocker: Any) -> None:
    """Test handle_delete handles IOError during save_user."""
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True
    error_message = "IO error saving after delete"
    mock_manager.save_user.side_effect = IOError(error_message)
    args = create_mock_args(id="task123", verbose=False)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, mock_user)

    mock_print.assert_called_once_with(
        f"Error saving after deleting task: {error_message}"
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_os_error(mocker: Any) -> None:
    """Test handle_delete handles OSError during save_user."""
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True
    error_message = "OS error saving after delete"
    mock_manager.save_user.side_effect = OSError(error_message)
    args = create_mock_args(id="task123", verbose=False)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, mock_user)

    mock_print.assert_called_once_with(
        f"Error saving after deleting task: {error_message}"
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_generic_exception_on_save(mocker: Any) -> None:
    """Test handle_delete handles generic exceptions during save_user."""
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True  # Simulate successful removal
    error_message = "Generic error saving after delete"
    mock_manager.save_user.side_effect = Exception(error_message)  # Simulate save error
    # Use the helper to create args
    args = create_mock_args(id="task123", verbose=False)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, mock_user)

    # Check that the correct error message for this specific case is printed
    mock_print.assert_called_once_with(
        f"Error saving after deleting task: {error_message}"
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_list_no_user(mock_manager: MagicMock, mock_print: MagicMock) -> None:
    """Test handle_list when the user is not found."""
    args = create_mock_args(verbose=False)  # Non-verbose case

    cli_main.handle_list(args, mock_manager, None)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    mock_print.assert_any_call("Hint: Run 'motido init' first if you haven't already.")


def test_handle_view_generic_exception(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view catches generic Exception during find_task_by_id."""
    error_message = "Generic find error"
    mock_user.find_task_by_id.side_effect = Exception(error_message)
    args = create_mock_args(id="abc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_missing_args(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit handles missing arguments gracefully.

    - If both description and priority are missing, it should print a message
      and return.
    - If ID is missing, it should exit with an error.
    """
    # Test missing both description and priority (should print and return, not exit)
    args_no_desc_no_priority = create_mock_args(
        id="some-id", description=None, priority=None, verbose=False
    )

    # Call the function - it should NOT raise SystemExit
    cli_main.handle_edit(
        args_no_desc_no_priority, mock_manager, mock_user
    )  # Pass mock_user

    # Assert the correct informational message was printed
    mock_print.assert_any_call("No changes specified. Nothing to update.")
    # Assert that save was NOT called
    mock_manager.save_user.assert_not_called()
    # Assert that find_task_by_id was NOT called
    mock_user.find_task_by_id.assert_not_called()

    # Clear mocks for the next part of the test
    mock_print.reset_mock()
    mock_manager.reset_mock()

    # Test missing ID (should exit)
    args_no_id = create_mock_args(
        id=None, description="Some description", priority=None, verbose=False
    )
    with pytest.raises(SystemExit) as excinfo:
        # Pass mock_user, although it exits before using it for missing ID
        cli_main.handle_edit(args_no_id, mock_manager, mock_user)

    # Assert the correct error message for missing ID
    mock_print.assert_any_call("Error: --id is required for editing.")
    assert excinfo.value.code == 1


def test_handle_edit_user_not_found(
    mock_manager: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit when the user is not found."""
    args = create_mock_args(id="edit-user-miss", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, None)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    assert excinfo.value.code == 1


def test_handle_edit_task_not_found(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit when the task is not found."""
    mock_user.find_task_by_id.return_value = None  # Task not found
    args = create_mock_args(id="edit-task-miss", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error: Task with ID prefix '{args.id}' not found.")
    assert excinfo.value.code == 1


def test_handle_complete_missing_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete when the task ID is missing."""
    args = create_mock_args(id=None)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call("Error: Please provide a task ID prefix using --id.")
    assert excinfo.value.code == 1


def test_handle_complete_user_not_found(
    mock_manager: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete when the user is not found."""
    args = create_mock_args(id="task123")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, None)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    assert excinfo.value.code == 1


def test_handle_complete_task_not_found(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete when the task is not found."""
    mock_user.find_task_by_id.return_value = None  # Task not found
    args = create_mock_args(id="complete-miss")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error: Task with ID prefix '{args.id}' not found.")
    assert excinfo.value.code == 1


def test_handle_complete_success(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete successfully marks a task as complete."""
    # Create a real Task object instead of a mock for proper attribute behavior
    mock_task = Task(
        description="Task to complete",
        creation_date=datetime.now(),
        id="complete-123",
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task
    args = create_mock_args(id="complete-123", verbose=True)

    cli_main.handle_complete(args, mock_manager, mock_user)

    # Check that the task was marked as complete
    assert mock_task.is_complete is True

    # Check that the user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Check that the correct success message was printed
    mock_print.assert_any_call(
        "Marking task with ID prefix: 'complete-123' as complete..."
    )
    mock_print.assert_any_call(
        f"Marked task '{mock_task.description}' (ID: {mock_task.id[:8]}) as complete."
    )


def test_handle_complete_already_completed(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete when the task is already marked as complete."""
    # Create a task that's already complete
    mock_task = Task(
        description="Already completed task",
        creation_date=datetime.now(),
        id="already-done",
        is_complete=True,
    )
    mock_user.find_task_by_id.return_value = mock_task
    args = create_mock_args(id="already-done")

    cli_main.handle_complete(args, mock_manager, mock_user)

    # Check that save_user was NOT called
    mock_manager.save_user.assert_not_called()

    # Check that the correct message was printed
    mock_print.assert_any_call(
        f"Task '{mock_task.description}' (ID: {mock_task.id[:8]}) is already marked as complete."
    )


def test_handle_complete_ambiguous_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete with an ambiguous task ID."""
    error_message = "Ambiguous ID prefix 'amb'. Multiple tasks found."
    mock_user.find_task_by_id.side_effect = ValueError(error_message)
    args = create_mock_args(id="amb")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error: {error_message}")
    assert excinfo.value.code == 1


def test_handle_complete_io_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete catches IOError during save."""
    mock_task = Task(
        description="Task with IO error",
        creation_date=datetime.now(),
        id="complete-io-err",
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "IO error on save"
    mock_manager.save_user.side_effect = IOError(error_message)
    args = create_mock_args(id="complete-io")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving task update: {error_message}")
    assert excinfo.value.code == 1


def test_handle_complete_unexpected_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete catches unexpected errors."""
    error_message = "Unexpected error"
    mock_user.find_task_by_id.side_effect = AttributeError(error_message)
    args = create_mock_args(id="complete-err")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_complete_generic_exception_on_save(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete catches generic exceptions during save."""
    # Create a real Task object for proper attribute behavior
    mock_task = Task(
        description="Task with generic error",
        creation_date=datetime.now(),
        id="complete-gen-err",
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "Generic error on save"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="complete-gen")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    # Verify the task was marked as complete before save failed
    assert mock_task.is_complete is True
    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_complete_generic_exception_during_find(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_complete catches generic exceptions during task find."""
    error_message = "Generic error during find"
    mock_user.find_task_by_id.side_effect = Exception(error_message)
    args = create_mock_args(id="complete-gen-find")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_complete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_generic_exception(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches generic Exception during save."""
    mock_task = Task(
        description="Old Gen",
        creation_date=datetime.now(),
        id="edit-gen-err",
        priority=Priority.LOW,
    )
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "Generic error on save"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="edit-gen", description="New Desc Gen")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_task_not_found(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete when the task to delete is not found."""
    mock_user.remove_task.return_value = False  # Indicates task not found
    args = create_mock_args(id="del-miss")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager, mock_user)

        mock_print.assert_any_call(f"Error: Task with ID prefix '{args.id}' not found.")
        assert excinfo.value.code == 1
        # Save should not be called if task not found
        mock_manager.save_user.assert_not_called()
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_delete_generic_exception_on_remove(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches generic Exception during removal step."""
    error_message = "Generic error during remove"
    mock_user.remove_task.side_effect = Exception(error_message)
    args = create_mock_args(id="del-gen-rem")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager, mock_user)

        mock_print.assert_any_call(
            f"An unexpected error occurred during deletion: {error_message}"
        )
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_list_sort_descending(
    mock_manager: MagicMock, mock_user: MagicMock
) -> None:
    """Test handle_list sorts tasks in descending order."""
    # Setup tasks with different IDs and descriptions
    task1 = Task(description="Task A", creation_date=datetime.now(), id="abc123")
    task2 = Task(description="Task B", creation_date=datetime.now(), id="def456")
    task3 = Task(description="Task C", creation_date=datetime.now(), id="ghi789")
    mock_user.tasks = [task1, task2, task3]

    # Test sorting by ID in descending order
    args = create_mock_args(sort_by="id", sort_order="desc", verbose=True)
    cli_main.handle_list(args, mock_manager, mock_user)

    # Verify tasks are sorted by ID in descending order
    assert mock_user.tasks == [task3, task2, task1]

    # Test sorting by description in descending order
    args = create_mock_args(sort_by="description", sort_order="desc", verbose=True)
    cli_main.handle_list(args, mock_manager, mock_user)

    # Verify tasks are sorted by description in descending order
    assert mock_user.tasks == [task3, task2, task1]


def test_handle_list_sort_by_status(
    mock_manager: MagicMock, mock_user: MagicMock
) -> None:
    """Test handle_list sorts tasks by completion status."""
    # Setup tasks with different completion statuses
    task1 = Task(
        description="Task A",
        creation_date=datetime.now(),
        id="abc123",
        is_complete=True,
    )
    task2 = Task(
        description="Task B",
        creation_date=datetime.now(),
        id="def456",
        is_complete=False,
    )
    task3 = Task(
        description="Task C",
        creation_date=datetime.now(),
        id="ghi789",
        is_complete=True,
    )

    # Deliberately mix the order
    mock_user.tasks = [task2, task1, task3]

    # Test sorting by status in ascending order (incomplete first)
    args = create_mock_args(sort_by="status", sort_order="asc", verbose=True)
    cli_main.handle_list(args, mock_manager, mock_user)

    # Verify tasks are sorted by completion status (False before True)
    assert mock_user.tasks[0] == task2  # The incomplete task should be first
    assert task1 in mock_user.tasks[1:]  # The complete tasks should follow
    assert task3 in mock_user.tasks[1:]

    # Test sorting by status in descending order (complete first)
    args = create_mock_args(sort_by="status", sort_order="desc", verbose=True)
    cli_main.handle_list(args, mock_manager, mock_user)

    # Verify tasks are sorted by completion status in reverse (True before False)
    assert task2 == mock_user.tasks[-1]  # The incomplete task should be last
    assert task1 in mock_user.tasks[0:2]  # The complete tasks should be first
    assert task3 in mock_user.tasks[0:2]


def test_main_handles_specific_exceptions(mocker: Any) -> None:
    """Test main function handles specific exceptions
    (IOError, OSError, ValueError, AttributeError, TypeError)."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_print = mocker.patch("builtins.print")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    # Test each specific exception type
    exceptions = [
        (IOError, "IO error occurred"),
        (OSError, "OS error occurred"),
        (ValueError, "Value error occurred"),
        (AttributeError, "Attribute error occurred"),
        (TypeError, "Type error occurred"),
    ]

    for exc_type, error_message in exceptions:
        # Reset mocks for each test
        mock_print.reset_mock()

        # Simulate the specific exception
        mocker.patch("motido.cli.main.handle_list", side_effect=exc_type(error_message))

        with pytest.raises(SystemExit) as excinfo:
            cli_main.main()

        # Verify error handling
        mock_print.assert_any_call(f"Error: {error_message}")
        mock_print.assert_any_call(
            "If you haven't initialized the application, try running 'motido init'."
        )
        assert excinfo.value.code == 1


def test_main_handles_user_data_loading_errors(mocker: Any) -> None:
    """Test main function handles errors during user data loading."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_print = mocker.patch("builtins.print")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance

    # Test each specific exception type
    exceptions = [
        (IOError, "IO error loading user data"),
        (OSError, "OS error loading user data"),
        (ValueError, "Value error loading user data"),
    ]

    for exc_type, error_message in exceptions:
        # Reset mocks for each test
        mock_print.reset_mock()

        # Simulate the specific exception during user loading
        mock_manager_instance.load_user.side_effect = exc_type(error_message)

        with pytest.raises(SystemExit) as excinfo:
            cli_main.main()

        # Verify error handling
        mock_print.assert_any_call(f"Error loading user data: {error_message}")
        mock_print.assert_any_call(
            "Hint: If you haven't initialized, run 'motido init'."
        )
        assert excinfo.value.code == 1


def test_handle_view_ambiguous_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view handles ambiguous ID prefix."""
    error_message = "Ambiguous ID prefix 'abc'"
    mock_user.find_task_by_id.side_effect = ValueError(error_message)
    args = create_mock_args(id="abc", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_ambiguous_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit handles ambiguous ID prefix."""
    error_message = "Ambiguous ID prefix 'edit-amb'"
    mock_user.find_task_by_id.side_effect = ValueError(error_message)
    args = create_mock_args(id="edit-amb", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_ambiguous_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete handles ambiguous ID prefix."""
    error_message = "Ambiguous ID prefix 'del-amb'"
    mock_user.remove_task.side_effect = ValueError(error_message)
    args = create_mock_args(id="del-amb", verbose=True)

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager, mock_user)

        mock_print.assert_any_call(f"Error: {error_message}")
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_main_handles_generic_exceptions(mocker: Any) -> None:
    """Test main function handles generic exceptions during command execution."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_print = mocker.patch("builtins.print")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    # Simulate a generic exception during command execution
    error_message = "Unexpected error during command execution"
    mocker.patch("motido.cli.main.handle_list", side_effect=Exception(error_message))

    with pytest.raises(SystemExit) as excinfo:
        cli_main.main()

    # Verify error handling
    mock_print.assert_any_call(f"Error: {error_message}")
    mock_print.assert_any_call(
        "If you haven't initialized the application, try running 'motido init'."
    )
    assert excinfo.value.code == 1


def test_main_handles_user_data_loading_generic_exception(mocker: Any) -> None:
    """Test main function handles generic exceptions during user data loading."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_print = mocker.patch("builtins.print")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance

    # Simulate a generic exception during user loading
    error_message = "Unexpected error loading user data"
    mock_manager_instance.load_user.side_effect = Exception(error_message)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.main()

    # Verify error handling
    mock_print.assert_any_call(
        f"An unexpected error occurred loading user data: {error_message}"
    )
    assert excinfo.value.code == 1


def test_handle_list_user_with_no_tasks(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_list when user exists but has no tasks."""
    mock_user.tasks = []  # User has no tasks
    args = create_mock_args(verbose=True)

    cli_main.handle_list(args, mock_manager, mock_user)

    mock_print.assert_any_call("No tasks found.")


def test_handle_view_no_user(mock_manager: MagicMock, mock_print: MagicMock) -> None:
    """Test handle_view when no user exists."""
    args = create_mock_args(id="abc123", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, None)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    assert excinfo.value.code == 1


def test_handle_view_invalid_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view when task ID is not found."""
    mock_user.find_task_by_id.return_value = None  # Task not found
    args = create_mock_args(id="invalid-id", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    mock_print.assert_any_call("Error: Task with ID prefix 'invalid-id' not found.")
    assert excinfo.value.code == 1


def test_handle_delete_no_id(mock_manager: MagicMock, mock_print: MagicMock) -> None:
    """Test handle_delete when no ID is provided."""
    args = create_mock_args(id=None, verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, None)

    mock_print.assert_any_call("Error: Please provide a task ID prefix using --id.")
    assert excinfo.value.code == 1


def test_handle_delete_no_user(mock_manager: MagicMock, mock_print: MagicMock) -> None:
    """Test handle_delete when no user exists."""
    args = create_mock_args(id="abc123", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, None)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    assert excinfo.value.code == 1


def test_handle_delete_invalid_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete when task ID is not found."""
    mock_user.remove_task.return_value = False  # Task not found
    args = create_mock_args(id="invalid-id", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, mock_user)

    mock_print.assert_any_call("Error: Task with ID prefix 'invalid-id' not found.")
    assert excinfo.value.code == 1


def test_handle_delete_generic_exception(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete when a generic exception occurs during save."""
    mock_user.remove_task.return_value = True  # Task found
    error_message = "Unexpected error during save"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="abc123", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager, mock_user)

    mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
    assert excinfo.value.code == 1
