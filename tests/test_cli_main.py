"""Tests for the main CLI module and command handlers."""

# pylint: disable=too-many-lines

import argparse
from typing import Any
from unittest.mock import MagicMock, call

import pytest

# Modules and classes to test or mock
from motido.cli import main as cli_main
from motido.core.models import Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager

# W0611: Removed unused import
# from motido.data.config import DEFAULT_BACKEND


# Helper to create mock argparse Namespace
def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace with given keyword arguments."""
    # Ensure 'verbose' is present, defaulting to False if not provided
    if "verbose" not in kwargs:
        kwargs["verbose"] = False
    return argparse.Namespace(**kwargs)


def test_main_dispatch_init(mocker: Any) -> None:
    """Test main() parses 'init' command and calls handle_init."""
    mocker.patch("sys.argv", ["main.py", "init", "--backend", "db"])
    mock_handle_init = mocker.patch("motido.cli.main.handle_init")
    mock_get_manager = mocker.patch(
        "motido.cli.main.get_data_manager"
    )  # Should not be called for init

    cli_main.main()

    mock_handle_init.assert_called_once()
    # Check the args passed to handle_init
    args_passed = mock_handle_init.call_args[0][0]
    assert args_passed.command == "init"
    assert args_passed.backend == "db"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    mock_get_manager.assert_not_called()


def test_main_dispatch_create(mocker: Any) -> None:
    """Test main() parses 'create' command and calls handle_create."""
    mocker.patch("sys.argv", ["main.py", "create", "-d", "New task"])
    mock_handle_create = mocker.patch("motido.cli.main.handle_create")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()

    mock_handle_create.assert_called_once()
    args_passed, manager_passed, user_passed = mock_handle_create.call_args[0]
    assert args_passed.command == "create"
    assert args_passed.description == "New task"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_get_manager.assert_called_once()  # Ensure manager was fetched
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_list(mocker: Any) -> None:
    """Test main() parses 'list' command and calls handle_list."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_handle_list = mocker.patch("motido.cli.main.handle_list")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()  # Execute the main function to test dispatch

    # Verify the correct functions were called
    mock_get_manager.assert_called_once()
    mock_handle_list.assert_called_once()

    # Check the arguments passed to handle_list
    args_passed, manager_passed, user_passed = mock_handle_list.call_args[0]
    assert args_passed.command == "list"
    assert hasattr(args_passed, "verbose")  # Just check that verbose flag exists
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_view(mocker: Any) -> None:
    """Test main() parses 'view' command and calls handle_view."""
    mocker.patch("sys.argv", ["main.py", "view", "--id", "abc"])
    mock_handle_view = mocker.patch("motido.cli.main.handle_view")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()

    mock_handle_view.assert_called_once()
    args_passed, manager_passed, user_passed = mock_handle_view.call_args[0]
    assert args_passed.command == "view"
    assert args_passed.id == "abc"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_get_manager.assert_called_once()
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_edit(mocker: Any) -> None:
    """Test main() parses 'edit' command and calls handle_edit."""
    mocker.patch("sys.argv", ["main.py", "edit", "--id", "abc", "-d", "Updated"])
    mock_handle_edit = mocker.patch("motido.cli.main.handle_edit")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()

    mock_handle_edit.assert_called_once()
    args_passed, manager_passed, user_passed = mock_handle_edit.call_args[0]
    assert args_passed.command == "edit"
    assert args_passed.id == "abc"
    assert args_passed.description == "Updated"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_get_manager.assert_called_once()
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_delete(mocker: Any) -> None:
    """Test main() parses 'delete' command and calls handle_delete."""
    mocker.patch("sys.argv", ["main.py", "delete", "--id", "xyz"])
    mock_handle_delete = mocker.patch("motido.cli.main.handle_delete")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()  # Execute the main function to test dispatch

    # Verify the correct functions were called
    mock_get_manager.assert_called_once()
    mock_handle_delete.assert_called_once()

    # Check the arguments passed to handle_delete
    args_passed, manager_passed, user_passed = mock_handle_delete.call_args[0]
    assert args_passed.command == "delete"
    assert args_passed.id == "xyz"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_verbose_flag(mocker: Any) -> None:
    """Test main() parses commands with the verbose flag."""
    # Example using 'list' command - verbose flag BEFORE command
    mocker.patch("sys.argv", ["main.py", "-v", "list"])  # Fixed order: -v before list
    mock_handle_list = mocker.patch("motido.cli.main.handle_list")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_user = mocker.MagicMock(spec=User)
    mock_manager_instance.load_user.return_value = mock_user

    cli_main.main()

    mock_get_manager.assert_called_once()
    mock_handle_list.assert_called_once()

    # Check the args passed to handle_list
    args_passed, manager_passed, user_passed = mock_handle_list.call_args[0]
    assert args_passed.command == "list"
    assert args_passed.verbose is True  # Check verbose flag is set
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_handle_init_success(mocker: Any) -> None:
    """Test handle_init successfully initializes with a chosen backend (verbose)."""
    # Only mock builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_save_config = mocker.patch("motido.cli.main.save_config")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    args = create_mock_args(backend="db", verbose=True)  # Enable verbose
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager

    cli_main.handle_init(args)

    mock_save_config.assert_called_once_with({"backend": "db"})
    mock_get_manager.assert_called_once()
    mock_manager.initialize.assert_called_once()
    # Check both verbose and non-verbose prints are called via builtins.print
    mock_print.assert_has_calls(
        [
            call("Initializing Moti-Do..."),  # Verbose
            call("Initialization complete. Using 'db' backend."),  # Standard
        ]
    )


def test_handle_init_success_not_verbose(mocker: Any) -> None:
    """Test handle_init non-verbose output."""
    # Only mock builtins.print
    mock_print = mocker.patch("builtins.print")
    mocker.patch("motido.cli.main.save_config")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    args = create_mock_args(backend="json", verbose=False)  # Verbose is False
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager

    cli_main.handle_init(args)

    # Verbose print should NOT be called
    mock_print.assert_called_once_with("Initialization complete. Using 'json' backend.")
    # Double check the verbose message wasn't printed
    verbose_message = "Initializing Moti-Do..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_init_exception(mocker: Any) -> None:
    """Test handle_init handles exceptions during manager initialization."""
    # Errors are always printed
    mock_print = mocker.patch("builtins.print")
    mock_save_config = mocker.patch("motido.cli.main.save_config")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    args = create_mock_args(backend="json", verbose=True)  # Check verbose scenario
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager
    error_message = "Disk is full"
    mock_manager.initialize.side_effect = Exception(error_message)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_init(args)

    mock_save_config.assert_called_once_with({"backend": "json"})
    mock_get_manager.assert_called_once()
    mock_manager.initialize.assert_called_once()
    # Check verbose was printed (since args.verbose=True)
    # Check error was printed
    mock_print.assert_has_calls(
        [
            call("Initializing Moti-Do..."),  # Verbose call
            call(
                f"An error occurred during initialization: {error_message}"
            ),  # Error call
        ]
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_init_io_error(mocker: Any) -> None:
    """Test handle_init handles IOError during manager initialization."""
    mock_print = mocker.patch("builtins.print")
    mock_save_config = mocker.patch("motido.cli.main.save_config")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    args = create_mock_args(backend="json", verbose=False)  # Non-verbose scenario
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager
    error_message = "IO Error during initialization"
    mock_manager.initialize.side_effect = IOError(error_message)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_init(args)

    mock_save_config.assert_called_once_with({"backend": "json"})
    mock_get_manager.assert_called_once()
    mock_manager.initialize.assert_called_once()
    # Check error was printed (verbose should not be, as args.verbose=False)
    mock_print.assert_called_once_with(
        f"An error occurred during initialization: {error_message}"
    )
    # Double check the verbose message wasn't printed
    verbose_message = "Initializing Moti-Do..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_create_success_existing_user(mocker: Any) -> None:
    """Test handle_create successfully creates a task for an existing user (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "task123abc"
    mock_task_class.return_value = mock_task
    args = create_mock_args(description="My new task", verbose=True)  # Verbose enabled

    cli_main.handle_create(args, mock_manager, mock_user)

    mock_task_class.assert_called_once_with(description="My new task")
    mock_user.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check verbose message and non-verbose success message were printed
    mock_print.assert_has_calls(
        [
            call("Creating task: 'My new task'..."),  # Verbose
            call(
                f"Task created successfully with ID prefix: {mock_task.id[:8]}"
            ),  # Non-verbose
        ]
    )


def test_handle_create_success_existing_user_not_verbose(mocker: Any) -> None:
    """Test handle_create non-verbose output for existing user."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "task123abc"
    mock_task_class.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(
        description="My new task", verbose=False
    )  # Verbose disabled

    cli_main.handle_create(args, mock_manager, mock_user)

    # Verbose should not be called
    # Check non-verbose success message was printed
    mock_print.assert_called_once_with(
        f"Task created successfully with ID prefix: {mock_task.id[:8]}"
    )
    # Double check verbose message wasn't printed
    verbose_message = "Creating task: 'My new task'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_create_success_new_user(mocker: Any) -> None:
    """Test handle_create creates a new user if none exists (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_user_class = mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user_instance = mocker.MagicMock(spec=User)
    mock_user_class.return_value = mock_user_instance
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "newtask456"
    mock_task_class.return_value = mock_task
    args = create_mock_args(description="First task", verbose=True)  # Verbose enabled

    cli_main.handle_create(args, mock_manager, None)

    mock_user_class.assert_called_once_with(username=DEFAULT_USERNAME)
    mock_task_class.assert_called_once_with(description="First task")
    mock_user_instance.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user_instance)
    # Check verbose messages and non-verbose success message
    mock_print.assert_has_calls(
        [
            call("Creating task: 'First task'..."),  # Verbose
            call(f"User '{DEFAULT_USERNAME}' not found. Creating new user."),  # Verbose
            call(
                f"Task created successfully with ID prefix: {mock_task.id[:8]}"
            ),  # Non-verbose
        ]
    )


def test_handle_create_success_new_user_not_verbose(mocker: Any) -> None:
    """Test handle_create creates a new user if none exists (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_user_class = mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user_instance = mocker.MagicMock(spec=User)
    mock_user_class.return_value = mock_user_instance
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "newtask456"
    mock_task_class.return_value = mock_task
    args = create_mock_args(description="First task", verbose=False)  # Verbose disabled

    cli_main.handle_create(args, mock_manager, None)

    # No verbose calls expected
    # Check non-verbose success message
    mock_print.assert_called_once_with(
        f"Task created successfully with ID prefix: {mock_task.id[:8]}"
    )
    # Double check verbose messages weren't printed
    verbose_msg1 = "Creating task: 'First task'..."
    verbose_msg2 = f"User '{DEFAULT_USERNAME}' not found. Creating new user."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_msg1 not in printed_messages
    assert verbose_msg2 not in printed_messages


def test_handle_create_empty_description(mocker: Any) -> None:
    """Test handle_create exits if description is empty."""
    # Error messages are always printed
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    args = create_mock_args(description="", verbose=False)  # Empty description

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager, None)

    mock_print.assert_any_call("Error: Task description cannot be empty.")
    # No verbose calls expected
    assert not any(
        "Creating task:" in c.args[0] for c in mock_print.call_args_list if c.args
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_create_save_error(mocker: Any) -> None:
    """Test handle_create handles exceptions during manager.save_user."""
    # Error messages are always printed
    mock_print = mocker.patch("builtins.print")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "taskfail789"
    mock_task_class.return_value = mock_task
    error_message = "Failed to write file"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(
        description="Task to fail save", verbose=True
    )  # Verbose enabled

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager, mock_user)

    mock_task_class.assert_called_once_with(description="Task to fail save")
    mock_user.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check verbose message was called (since verbose=True)
    # Check error message was printed (non-verbose)
    mock_print.assert_has_calls(
        [
            call("Creating task: 'Task to fail save'..."),  # Verbose
            call(f"Error saving task: {error_message}"),  # Error
        ]
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_create_generic_exception(mocker: Any) -> None:
    """Test handle_create handles generic exceptions during save_user."""
    # Error messages are always printed
    mock_print = mocker.patch("builtins.print")
    mock_user_class = mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user_class.return_value = mock_user
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "mock-task-id"
    mock_task_class.return_value = mock_task
    error_message = "Unexpected database error"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(description="Test task", verbose=False)  # Non-verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager, mock_user)

    # Check error message was printed (verbose should not be, as verbose=False)
    mock_print.assert_called_once_with(f"Error saving task: {error_message}")
    # Double check verbose wasn't printed
    verbose_message = "Creating task: 'Test task'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_list_success(mocker: Any) -> None:
    """Test handle_list prints tasks correctly using rich (verbose)."""
    mock_print = mocker.patch("builtins.print")
    mock_console_class = mocker.patch("motido.cli.main.Console")
    mock_table_class = mocker.patch("motido.cli.main.Table")
    mock_console_instance = MagicMock()
    mock_table_instance = MagicMock()
    mock_console_class.return_value = mock_console_instance
    mock_table_class.return_value = mock_table_instance

    mock_manager = MagicMock(spec=DataManager)
    mock_user = MagicMock(spec=User)
    task1 = Task(description="Task One", id="abc12345-xyz")
    task2 = Task(description="Task Two", id="def67890-uvw")
    mock_user.tasks = [task1, task2]
    args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)  # Verbose

    cli_main.handle_list(args, mock_manager, mock_user)

    mock_print.assert_any_call("Listing all tasks...")  # Check verbose print

    # Verify rich table creation and population
    mock_console_class.assert_called_once_with()
    mock_table_class.assert_called_once_with(
        show_header=True, header_style="bold magenta"
    )
    mock_table_instance.add_column.assert_has_calls(
        [
            call("ID Prefix", style="dim", width=12),
            call("Description"),
        ]
    )
    mock_table_instance.add_row.assert_has_calls(
        [
            call(task1.id[:8], task1.description),
            call(task2.id[:8], task2.description),
        ]
    )
    # Verify the table is printed to the console
    mock_console_instance.print.assert_called_once_with(mock_table_instance)

    # Check the final "Total tasks" print
    mock_print.assert_any_call(f"Total tasks: {len(mock_user.tasks)}")


def test_handle_view_success(mocker: Any) -> None:
    """Test handle_view successfully finds and prints a task using rich (verbose)."""
    mock_print = mocker.patch("builtins.print")
    mock_console_class = mocker.patch("motido.cli.main.Console")
    mock_table_class = mocker.patch("motido.cli.main.Table")
    mock_console_instance = MagicMock()
    mock_table_instance = MagicMock()
    mock_console_class.return_value = mock_console_instance
    mock_table_class.return_value = mock_table_instance

    mock_manager = MagicMock(spec=DataManager)
    mock_user = MagicMock(spec=User)
    mock_task = MagicMock(spec=Task)
    mock_task.id = "abc-123"
    mock_task.description = "View this task"
    mock_user.find_task_by_id.return_value = mock_task
    args = create_mock_args(id="abc", verbose=True)  # Verbose

    cli_main.handle_view(args, mock_manager, mock_user)

    mock_user.find_task_by_id.assert_called_once_with("abc")
    mock_print.assert_called_once_with(
        "Viewing task with ID prefix: 'abc'..."
    )  # Check verbose print

    # Verify rich table creation and population for view
    mock_console_class.assert_called_once_with()
    mock_table_class.assert_called_once_with(
        show_header=False, box=None, show_edge=False
    )
    mock_table_instance.add_column.assert_has_calls(
        [
            call("Attribute", style="bold cyan"),
            call("Value"),
        ]
    )
    mock_table_instance.add_row.assert_has_calls(
        [
            call("ID:", mock_task.id),
            call("Description:", mock_task.description),
        ]
    )
    # Verify the table is printed to the console
    mock_console_instance.print.assert_called_once_with(mock_table_instance)


def test_handle_edit_success(mocker: Any) -> None:
    """Test handle_edit successfully updates a task and prints confirmation."""
    # Setup task with old description
    old_description = "Old task description"
    new_description = "Updated task description"
    mock_task = Task(description=old_description, id="edit-task-123")

    # Setup mocks
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with new description
    args = create_mock_args(id="edit-task", description=new_description, verbose=True)

    # Call the function being tested
    cli_main.handle_edit(args, mock_manager, mock_user)

    # Verify function behavior
    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Assert that the task description was updated
    assert mock_task.description == new_description

    # Verify the success messages are printed correctly
    mock_print.assert_has_calls(
        [
            call("Task updated successfully:"),
            call(f"  Old Description: {old_description}"),
            call(f"  New Description: {new_description}"),
        ]
    )

    # If verbose is enabled, verify verbose message
    if args.verbose:
        mock_print.assert_any_call(f"Editing task with ID prefix: '{args.id}'...")


def test_handle_delete_success(mocker: Any) -> None:
    """Test that handle_delete prints success message when task
    is deleted successfully."""
    # Setup mocks
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True  # Task successfully deleted
    task_id = "abc123"
    args = create_mock_args(id=task_id, verbose=True)

    if hasattr(cli_main, "handle_delete"):
        # Call the function being tested
        cli_main.handle_delete(args, mock_manager, mock_user)

        # Verify function behavior
        mock_user.remove_task.assert_called_once_with(task_id)
        mock_manager.save_user.assert_called_once_with(mock_user)

        # Verify the success message is printed correctly
        mock_print.assert_has_calls([call(f"Task '{task_id}' deleted successfully.")])

        if args.verbose:
            mock_print.assert_any_call(f"Deleting task with ID prefix: '{task_id}'...")
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found")


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
