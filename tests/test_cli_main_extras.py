"""Additional tests for main.py to improve code coverage."""

# pylint: disable=redefined-outer-name
# ^ This disables the "redefined-outer-name" warning which is normal for pytest fixtures

from typing import Any, cast
from unittest.mock import MagicMock

import pytest
from test_cli_main import create_mock_args

from motido.cli import main as cli_main
from motido.core.models import Task, User
from motido.data.abstraction import DataManager


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
    mock_manager.load_user.return_value = mock_user
    error_message = "Custom value error during save"
    mock_manager.save_user.side_effect = ValueError(error_message)
    # Use create_mock_args to ensure 'verbose' is present
    args = create_mock_args(description="Task causing ValueError")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager)

    mock_print.assert_any_call(f"Error saving task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_success(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit successfully updates a task and prints confirmation."""
    # Setup task with old description
    old_description = "Old task description"
    new_description = "Updated task description"
    mock_task = Task(description=old_description, id="edit-task-123")

    # Setup mocks
    mock_manager.load_user.return_value = mock_user
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with new description
    args = create_mock_args(id="edit-task", description=new_description, verbose=True)

    # Call the function being tested
    cli_main.handle_edit(args, mock_manager)

    # Verify function behavior
    mock_manager.load_user.assert_called_once_with(cli_main.DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Assert that the task description was updated
    assert mock_task.description == new_description

    # Verify the success messages are printed correctly
    mock_print.assert_any_call("Task updated successfully:")
    mock_print.assert_any_call(f"  Old Description: {old_description}")
    mock_print.assert_any_call(f"  New Description: {new_description}")

    # If verbose is enabled, verify verbose message
    if args.verbose:
        mock_print.assert_any_call(f"Editing task with ID prefix: '{args.id}'...")


def test_handle_view_type_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view catches TypeError during find_task_by_id."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Type error during find"
    mock_user.find_task_by_id.side_effect = TypeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="abc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_success(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test that handle_delete prints success message when task
    is deleted successfully."""
    # Setup mocks
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = True  # Task successfully deleted
    task_id = "abc123"
    args = create_mock_args(id=task_id, verbose=True)

    if hasattr(cli_main, "handle_delete"):
        # Call the function being tested
        cli_main.handle_delete(args, mock_manager)

        # Verify function behavior
        mock_manager.load_user.assert_called_once_with(cli_main.DEFAULT_USERNAME)
        mock_user.remove_task.assert_called_once_with(task_id)
        mock_manager.save_user.assert_called_once_with(mock_user)

        # Verify the success message is printed correctly
        mock_print.assert_any_call(f"Task '{task_id}' deleted successfully.")

        if args.verbose:
            mock_print.assert_any_call(f"Deleting task with ID prefix: '{task_id}'...")
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_edit_attribute_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches AttributeError during save."""
    mock_task = Task(description="Old", id="edit-attr-err")
    mock_user.find_task_by_id.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    error_message = "Attribute error on save"
    mock_manager.save_user.side_effect = AttributeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="edit-attr", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_attribute_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches AttributeError during removal."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Attribute error during remove"
    mock_user.remove_task.side_effect = AttributeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="del-attr")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

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
    mock_task = Task(description="Old IO", id="edit-io-err")
    mock_user.find_task_by_id.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    error_message = "IO error on save"
    mock_manager.save_user.side_effect = IOError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="edit-io", description="New Desc IO")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_io_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches IOError during save after deletion."""
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = True  # Deletion itself succeeds
    error_message = "IO error saving after delete"
    mock_manager.save_user.side_effect = IOError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="del-io")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_delete_type_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches TypeError during removal."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Type error during remove"
    mock_user.remove_task.side_effect = TypeError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="del-type")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(
            f"An unexpected error occurred during deletion: {error_message}"
        )
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_edit_os_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches OSError during save."""
    mock_task = Task(description="Old OS", id="edit-os-err")
    mock_user.find_task_by_id.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    error_message = "OS error on save"
    mock_manager.save_user.side_effect = OSError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="edit-os", description="New Desc OS")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_os_error(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches OSError during save after deletion."""
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = True  # Deletion succeeds
    error_message = "OS error saving after delete"
    mock_manager.save_user.side_effect = OSError(error_message)
    # Use create_mock_args
    args = create_mock_args(id="del-os")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_main_catches_other_exceptions(mocker: Any) -> None:
    """Test that the main function's broad except block catches non-standard errors."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_print = mocker.patch("builtins.print")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance

    # Simulate an unusual error during list handling
    error_message = "Some unusual runtime error"
    mocker.patch("motido.cli.main.handle_list", side_effect=RuntimeError(error_message))

    with pytest.raises(SystemExit) as excinfo:
        cli_main.main()

    # Check that the generic error message from the main except block is printed
    mock_print.assert_any_call(f"Error: {error_message}")
    mock_print.assert_any_call(
        "If you haven't initialized the application, try running 'motido init'."
    )
    assert excinfo.value.code == 1


def test_main_init_catches_other_exceptions(mocker: Any) -> None:
    """Test that handle_init's broad except block catches non-standard errors."""
    mocker.patch("sys.argv", ["main.py", "init"])
    mock_print = mocker.patch("builtins.print")
    mock_save_config = mocker.patch("motido.cli.main.save_config")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = MagicMock()
    mock_get_manager.return_value = mock_manager_instance

    # Simulate an unusual error during manager initialization
    error_message = "Very specific init error"
    mock_manager_instance.initialize.side_effect = RuntimeError(error_message)

    # Use create_mock_args for consistency, ensure command is set
    args = create_mock_args(backend="json", command="init")
    # Add the func attribute that would be set by parser_init.set_defaults
    args.func = cli_main.handle_init
    # We need to mock parse_args for the init case specifically
    mocker.patch("argparse.ArgumentParser.parse_args", return_value=args)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.main()
        # Note: We call main() here which calls handle_init

    mock_save_config.assert_called_once_with({"backend": "json"})
    mock_manager_instance.initialize.assert_called_once()
    # Check that the generic error message from handle_init's except block is printed
    mock_print.assert_any_call(
        f"An error occurred during initialization: {error_message}"
    )
    assert excinfo.value.code == 1


def test_handle_list_no_user(mock_manager: MagicMock, mock_print: MagicMock) -> None:
    """Test handle_list when the user is not found."""
    mock_manager.load_user.return_value = None
    args = create_mock_args(verbose=False)  # Non-verbose case

    cli_main.handle_list(args, mock_manager)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    mock_print.assert_any_call("Hint: Run 'motido init' first if you haven't already.")


def test_handle_view_generic_exception(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_view catches generic Exception during find_task_by_id."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Generic find error"
    mock_user.find_task_by_id.side_effect = Exception(error_message)
    args = create_mock_args(id="abc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.value.code == 1


def test_handle_edit_missing_args(
    mock_manager: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit exits if id or description is missing."""
    # Test missing description
    args_no_desc = create_mock_args(id="some-id", description=None)
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args_no_desc, mock_manager)
    mock_print.assert_any_call(
        "Error: Both --id and --description are required for editing."
    )
    assert excinfo.value.code == 1

    # Test missing id
    mock_print.reset_mock()
    args_no_id = create_mock_args(id=None, description="New Desc")
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args_no_id, mock_manager)
    mock_print.assert_any_call(
        "Error: Both --id and --description are required for editing."
    )
    assert excinfo.value.code == 1


def test_handle_edit_user_not_found(
    mock_manager: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit when the user is not found."""
    mock_manager.load_user.return_value = None
    args = create_mock_args(id="edit-user-miss", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(
        f"User '{cli_main.DEFAULT_USERNAME}' not found or no data available."
    )
    assert excinfo.value.code == 1


def test_handle_edit_task_not_found(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit when the task is not found."""
    mock_manager.load_user.return_value = mock_user
    mock_user.find_task_by_id.return_value = None  # Task not found
    args = create_mock_args(id="edit-task-miss", description="New Desc")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error: Task with ID prefix '{args.id}' not found.")
    assert excinfo.value.code == 1


def test_handle_edit_generic_exception(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_edit catches generic Exception during save."""
    mock_task = Task(description="Old Gen", id="edit-gen-err")
    mock_user.find_task_by_id.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    error_message = "Generic error on save"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="edit-gen", description="New Desc Gen")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.value.code == 1


def test_handle_delete_task_not_found(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete when the task to delete is not found."""
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = False  # Indicates task not found
    args = create_mock_args(id="del-miss")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(f"Error: Task with ID prefix '{args.id}' not found.")
        assert excinfo.value.code == 1
        # Save should not be called if task not found
        mock_manager.save_user.assert_not_called()
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_delete_ambiguous_id(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches ValueError for ambiguous ID."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Ambiguous ID prefix 'del-amb'"
    mock_user.remove_task.side_effect = ValueError(error_message)
    args = create_mock_args(id="del-amb")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(f"Error: {error_message}")
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_delete_generic_exception_on_remove(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches generic Exception during removal step."""
    mock_manager.load_user.return_value = mock_user
    error_message = "Generic error during remove"
    mock_user.remove_task.side_effect = Exception(error_message)
    args = create_mock_args(id="del-gen-rem")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(
            f"An unexpected error occurred during deletion: {error_message}"
        )
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


def test_handle_delete_generic_exception_on_save(
    mock_manager: MagicMock, mock_user: MagicMock, mock_print: MagicMock
) -> None:
    """Test handle_delete catches generic Exception during save after removal."""
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = True  # Removal succeeds
    error_message = "Generic error saving after delete"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="del-gen-save")

    if hasattr(cli_main, "handle_delete"):
        with pytest.raises(SystemExit) as excinfo:
            cli_main.handle_delete(args, mock_manager)

        mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
        assert excinfo.value.code == 1
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")
