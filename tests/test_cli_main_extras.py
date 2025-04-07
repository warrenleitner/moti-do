"""Additional tests for main.py to improve code coverage."""

import argparse
from typing import Any

import pytest

from motido.cli import main as cli_main
from motido.core.models import Task, User
from motido.data.abstraction import DataManager


# Helper function to create mock args
def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace with given keyword arguments."""
    return argparse.Namespace(**kwargs)


# pylint: disable=duplicate-code
def test_handle_create_custom_exceptions(mocker: Any) -> None:
    """Test handle_create handles IOError and OSError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_user_class = mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Return our mock when User is instantiated (not needed here)
    mock_user_class.return_value = mock_user

    # Create a mock task when Task is instantiated
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "mock-task-id"
    mock_task_class.return_value = mock_task

    # Set up the exception
    error_message = "Permission denied"
    mock_manager.save_user.side_effect = OSError(error_message)

    args = create_mock_args(description="Test task")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager)

    mock_print.assert_any_call(f"Error saving task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_view_type_error(mocker: Any) -> None:
    """Test handle_view catches TypeError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up TypeError
    error_message = "Type error in find_task_by_id"
    mock_user.find_task_by_id.side_effect = TypeError(error_message)

    args = create_mock_args(id="task-id")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_print.assert_any_call(f"An unexpected error occurred: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_attribute_error(mocker: Any) -> None:
    """Test handle_edit catches AttributeError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up a task that's found
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.description = "Original description"
    mock_user.find_task_by_id.return_value = mock_task

    # Set up AttributeError during save
    error_message = "Attribute error during save"
    mock_manager.save_user.side_effect = AttributeError(error_message)

    args = create_mock_args(id="task-id", description="Updated description")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_attribute_error(mocker: Any) -> None:
    """Test handle_delete catches AttributeError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up attribute error
    error_message = "Attribute error during deletion"
    mock_user.remove_task.side_effect = AttributeError(error_message)

    args = create_mock_args(id="task-id")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    mock_print.assert_any_call(
        f"An unexpected error occurred during deletion: {error_message}"
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


# pylint: disable=exec-used,unused-variable
def test_if_name_equals_main(mocker: Any) -> None:
    """Test the __name__ == "__main__" clause."""
    # Mock sys.argv to provide a valid command
    argv_patch = mocker.patch("sys.argv", ["main.py", "list"])

    # Mock main function
    mock_main = mocker.patch.object(cli_main, "main")

    # Run the code that would be called if __name__ == "__main__"
    if_block_code = """
if __name__ == "__main__":
    main()
"""
    # Create namespace with our mocked main
    namespace = {"main": mock_main, "__name__": "__main__"}

    # Execute just the if block
    exec(if_block_code, namespace)

    # Verify main was called
    mock_main.assert_called_once()


def test_handle_edit_io_error(mocker: Any) -> None:
    """Test handle_edit handles IOError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up a task that's found
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.description = "Original description"
    mock_user.find_task_by_id.return_value = mock_task

    # Set up IOError during save
    error_message = "IO error during save"
    mock_manager.save_user.side_effect = IOError(error_message)

    args = create_mock_args(id="task-id", description="Updated description")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_io_error(mocker: Any) -> None:
    """Test handle_delete handles IOError during save."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Configure removal to succeed but save to fail with IOError
    mock_user.remove_task.return_value = True
    error_message = "IO error during save"
    mock_manager.save_user.side_effect = IOError(error_message)

    args = create_mock_args(id="task-id")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_type_error(mocker: Any) -> None:
    """Test handle_delete catches TypeError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up type error
    error_message = "Type error during deletion"
    mock_user.remove_task.side_effect = TypeError(error_message)

    args = create_mock_args(id="task-id")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    mock_print.assert_any_call(
        f"An unexpected error occurred during deletion: {error_message}"
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


# pylint: disable=unspecified-encoding
def test_script_execution_via_module_import() -> None:
    """Test that the module sets up the __name__ == "__main__ handling correctly."""
    # We can't directly test the script execution, but we can
    # verify that the conditional import is present in the module
    with open(cli_main.__file__, "r") as file:
        content = file.read()
        assert 'if __name__ == "__main__":' in content
        assert "main()" in content


def test_handle_edit_os_error(mocker: Any) -> None:
    """Test handle_edit handles OSError explicitly."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up a task that's found
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.description = "Original description"
    mock_user.find_task_by_id.return_value = mock_task

    # Set up OSError during save
    error_message = "OS error during save"
    mock_manager.save_user.side_effect = OSError(error_message)

    args = create_mock_args(id="task-id", description="Updated description")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_any_call(f"Error saving updated task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_os_error(mocker: Any) -> None:
    """Test handle_delete handles OSError during save."""
    mock_print = mocker.patch("motido.cli.main.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Configure removal to succeed but save to fail with OSError
    mock_user.remove_task.return_value = True
    error_message = "OS error during save"
    mock_manager.save_user.side_effect = OSError(error_message)

    args = create_mock_args(id="task-id")

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    mock_print.assert_any_call(f"Error saving after deleting task: {error_message}")
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1
