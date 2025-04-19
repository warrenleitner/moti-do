"""Tests for the main CLI module and command handlers."""

# pylint: disable=too-many-lines

import argparse
from typing import Any
from unittest.mock import MagicMock, call

import pytest

# Modules and classes to test or mock
from motido.cli import main as cli_main
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager

# W0611: Removed unused import
# from motido.data.config import DEFAULT_BACKEND


# Helper to create mock argparse Namespace
def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace with given keyword arguments."""
    # Ensure 'verbose' is present, defaulting to False if not provided
    if "verbose" not in kwargs:
        kwargs["verbose"] = False
    # Ensure 'priority' is present for create/edit commands
    if "priority" not in kwargs:
        kwargs["priority"] = None
    # Ensure 'description' is present for create/edit commands
    if "description" not in kwargs:
        kwargs["description"] = None
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

    mock_task_class.assert_called_once_with(
        description="My new task", priority=Priority.LOW
    )
    mock_user.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user)
    mock_print.assert_any_call("Creating task: 'My new task'...")
    mock_print.assert_any_call(
        f"Task created successfully with ID prefix: {mock_task.id[:8]}"
    )


def test_handle_create_success_existing_user_not_verbose(mocker: Any) -> None:
    """Test handle_create successfully creates a task
    for an existing user (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "task123abc"
    mock_task_class.return_value = mock_task
    args = create_mock_args(
        description="My new task", verbose=False
    )  # Verbose disabled

    cli_main.handle_create(args, mock_manager, mock_user)

    mock_task_class.assert_called_once_with(
        description="My new task", priority=Priority.LOW
    )
    mock_user.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check that the *verbose* print was not called
    verbose_message = "Creating task..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert not any(verbose_message in msg for msg in printed_messages)
    # Check that the *standard* success print WAS called
    success_message_prefix = "Task created successfully with ID prefix:"
    assert any(msg.startswith(success_message_prefix) for msg in printed_messages)


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
    mock_task_class.assert_called_once_with(
        description="First task", priority=Priority.LOW
    )
    mock_user_instance.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user_instance)
    mock_print.assert_any_call("Creating task: 'First task'...")
    mock_print.assert_any_call(
        f"User '{DEFAULT_USERNAME}' not found. Creating new user."
    )  # Verbose specific
    mock_print.assert_any_call(
        f"Task created successfully with ID prefix: {mock_task.id[:8]}"
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

    mock_user_class.assert_called_once_with(username=DEFAULT_USERNAME)
    mock_task_class.assert_called_once_with(
        description="First task", priority=Priority.LOW
    )
    mock_user_instance.add_task.assert_called_once_with(mock_task)
    mock_manager.save_user.assert_called_once_with(mock_user_instance)
    # These messages should not be printed (verbose=False)
    assert call("Creating task: 'First task'...") not in mock_print.call_args_list
    assert (
        call(f"User '{DEFAULT_USERNAME}' not found. Creating new user.")
        not in mock_print.call_args_list
    )
    # Success message should be printed regardless of verbose setting
    mock_print.assert_any_call(
        f"Task created successfully with ID prefix: {mock_task.id[:8]}"
    )


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

    mock_task_class.assert_called_once_with(
        description="Task to fail save", priority=Priority.LOW
    )
    mock_print.assert_any_call(f"Error saving task: {error_message}")
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
    task1 = Task(description="Task One", id="abc12345-xyz", priority=Priority.LOW)
    task2 = Task(description="Task Two", id="def67890-uvw", priority=Priority.MEDIUM)
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
            call("Priority", width=15),
            call("Description"),
        ]
    )

    # Check the correct number of rows were added (one per task)
    assert mock_table_instance.add_row.call_count == 2

    # Check the arguments passed to add_row for each task more explicitly
    expected_row_calls = [
        call(
            task1.id[:8],
            f"{task1.priority.emoji()} {task1.priority.value}",
            task1.description,
        ),
        call(
            task2.id[:8],
            f"{task2.priority.emoji()} {task2.priority.value}",
            task2.description,
        ),
    ]
    mock_table_instance.add_row.assert_has_calls(expected_row_calls, any_order=False)

    # Check total tasks count was printed
    mock_print.assert_any_call("Total tasks: 2")


def test_handle_view_success(mocker: Any) -> None:
    """Test handle_view successfully finds and prints a task using rich (verbose)."""
    mock_print = mocker.patch("builtins.print")
    mock_console_class = mocker.patch("motido.cli.main.Console")
    mock_table_class = mocker.patch("motido.cli.main.Table")
    mock_text_class = mocker.patch("motido.cli.main.Text")

    # Mock instances
    mock_console_instance = MagicMock()
    mock_table_instance = MagicMock()
    mock_text_instance = MagicMock()

    # Setup returns
    mock_console_class.return_value = mock_console_instance
    mock_table_class.return_value = mock_table_instance
    mock_text_class.return_value = mock_text_instance

    # Mock Task with real priority
    mock_manager = MagicMock(spec=DataManager)
    mock_user = MagicMock(spec=User)
    mock_task = MagicMock(spec=Task)
    mock_task.id = "abc-123"
    mock_task.description = "View this task"
    # Use a real Priority instance
    mock_task.priority = Priority.MEDIUM  # Example priority

    # Setup user.find_task_by_id to return the mock task
    mock_user.find_task_by_id.return_value = mock_task

    args = create_mock_args(id="abc", verbose=True)

    cli_main.handle_view(args, mock_manager, mock_user)

    # Assertions
    mock_print.assert_called_once_with("Viewing task with ID prefix: 'abc'...")
    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_console_class.assert_called_once()
    mock_table_class.assert_called_once_with(
        show_header=False, box=None, show_edge=False
    )
    # Check that table rows were added correctly
    expected_calls = [
        call("Attribute", style="bold cyan"),
        call("Value"),
    ]
    mock_table_instance.add_column.assert_has_calls(expected_calls)

    # Check add_row calls, especially for priority formatting
    add_row_calls = mock_table_instance.add_row.call_args_list
    assert len(add_row_calls) == 3
    assert add_row_calls[0] == call("ID:", "abc-123")

    # Verify the Text object creation and append calls
    mock_text_class.assert_called_once_with()  # Check Text() was called
    mock_text_instance.append.assert_has_calls(
        [
            # First append call
            call(f"{mock_task.priority.emoji()} "),
            # Second append call
            call(mock_task.priority.value, style=mock_task.priority.display_style()),
        ]
    )

    # Check priority row call - the second argument should be the mock_text_instance
    assert add_row_calls[1] == call("Priority:", mock_text_instance)

    # Check description row
    assert add_row_calls[2] == call("Description:", "View this task")

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

    # Verify verbose message
    mock_print.assert_any_call(f"Editing task with ID prefix: '{args.id}'...")


def test_handle_edit_success_priority_only(mocker: Any) -> None:
    """Test handle_edit successfully updates only the priority of a task."""
    # Setup task with old priority
    old_priority = Priority.LOW
    new_priority = Priority.HIGH
    mock_task = Task(
        description="Task with priority", id="edit-prio-123", priority=old_priority
    )

    # Setup mocks
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with new priority
    args = create_mock_args(id="edit-prio", priority=new_priority.value, verbose=False)

    # Call the function being tested
    cli_main.handle_edit(args, mock_manager, mock_user)

    # Verify function behavior
    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Assert that the task priority was updated and description remains unchanged
    assert mock_task.priority == new_priority
    assert mock_task.description == "Task with priority"  # Original description

    # Verify the success messages are printed correctly for priority
    mock_print.assert_has_calls(
        [
            call("Task updated successfully:"),
            call(f"  Old Priority: {old_priority.value}"),
            call(f"  New Priority: {new_priority.value}"),
        ]
    )
    # Ensure description messages were not printed
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert not any("Description:" in msg for msg in print_calls)


def test_handle_edit_success_both(mocker: Any) -> None:
    """Test handle_edit successfully updates both description and priority."""
    # Setup task with old values
    old_description = "Original Desc"
    old_priority = Priority.MEDIUM
    new_description = "New Desc"
    new_priority = Priority.DEFCON_ONE
    mock_task = Task(
        description=old_description, id="edit-both-456", priority=old_priority
    )

    # Setup mocks
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with new description and priority
    args = create_mock_args(
        id="edit-both",
        description=new_description,
        priority=new_priority.value,
        verbose=True,
    )

    # Call the function being tested
    cli_main.handle_edit(args, mock_manager, mock_user)

    # Verify function behavior
    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Assert that both task attributes were updated
    assert mock_task.description == new_description
    assert mock_task.priority == new_priority

    # Verify all success messages are printed
    mock_print.assert_has_calls(
        [
            call("Task updated successfully:"),
            call(f"  Old Description: {old_description}"),
            call(f"  New Description: {new_description}"),
            call(f"  Old Priority: {old_priority.value}"),
            call(f"  New Priority: {new_priority.value}"),
        ],
        any_order=False,  # Check order matters for grouped output
    )

    # Verify verbose message
    mock_print.assert_any_call(f"Editing task with ID prefix: '{args.id}'...")


def test_handle_edit_success_both_not_verbose(mocker: Any) -> None:
    """Test handle_edit updates both description and priority (non-verbose)."""
    old_description = "Old Desc NV"
    old_priority = Priority.TRIVIAL
    new_description = "New Desc NV"
    new_priority = Priority.HIGH
    mock_task = Task(
        description=old_description, id="edit-both-nv-789", priority=old_priority
    )

    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with verbose=False
    args = create_mock_args(
        id="edit-both-nv",
        description=new_description,
        priority=new_priority.value,
        verbose=False,
    )

    cli_main.handle_edit(args, mock_manager, mock_user)

    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)
    assert mock_task.description == new_description
    assert mock_task.priority == new_priority

    # Verify standard success messages
    mock_print.assert_has_calls(
        [
            call("Task updated successfully:"),
            call(f"  Old Description: {old_description}"),
            call(f"  New Description: {new_description}"),
            call(f"  Old Priority: {old_priority.value}"),
            call(f"  New Priority: {new_priority.value}"),
        ],
        any_order=False,
    )

    # Ensure verbose message was NOT printed
    verbose_message = f"Editing task with ID prefix: '{args.id}'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_edit_invalid_priority(mocker: Any) -> None:
    """Test handle_edit exits if an invalid priority is provided."""
    mock_print = mocker.patch("builtins.print")
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Task doesn't strictly need to be mocked deeply, find just needs to return it
    mock_task = Task(description="Existing task", id="edit-fail-789")
    mock_user.find_task_by_id.return_value = mock_task

    args = create_mock_args(
        id="edit-fail", priority="DefinitelyNotAPriority", verbose=False
    )

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)

    # Assert the correct error message was printed
    expected_error_msg_start = "Error: Invalid priority 'DefinitelyNotAPriority'."
    valid_values_str = ", ".join([p.value for p in Priority])
    expected_error_msg = (
        f"{expected_error_msg_start} Valid values are: {valid_values_str}"
    )
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(expected_error_msg in call_args for call_args in print_calls)

    # Ensure save was not called
    mock_manager.save_user.assert_not_called()


def test_handle_edit_task_not_found(mocker: Any) -> None:
    """Test handle_edit exits when the task ID is not found."""
    mock_print = mocker.patch("builtins.print")
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Simulate find_task_by_id returning None
    mock_user.find_task_by_id.return_value = None

    args = create_mock_args(id="not-found", description="New Desc", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)
    mock_user.find_task_by_id.assert_called_once_with("not-found")

    # Check error message was printed
    expected_error_msg = "Error: Task with ID prefix 'not-found' not found."
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(expected_error_msg in call_args for call_args in print_calls)

    # Ensure save was not called
    mock_manager.save_user.assert_not_called()


def test_handle_edit_ambiguous_id(mocker: Any) -> None:
    """Test handle_edit exits when the task ID prefix is ambiguous."""
    mock_print = mocker.patch("builtins.print")
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Simulate find_task_by_id raising ValueError for ambiguity
    error_message = "Ambiguous ID prefix 'amb'. Matches: abc, abd"
    mock_user.find_task_by_id.side_effect = ValueError(error_message)

    args = create_mock_args(id="amb", description="New Desc", verbose=False)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)
    mock_user.find_task_by_id.assert_called_once_with("amb")

    # Check error message was printed
    expected_error_msg = f"Error: {error_message}"
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(expected_error_msg in call_args for call_args in print_calls)

    # Ensure save was not called
    mock_manager.save_user.assert_not_called()


def test_handle_edit_no_changes(mocker: Any) -> None:
    """Test handle_edit exits gracefully if no changes are specified."""
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Task needs to be found for this path
    mock_task = Task(description="Existing task", id="edit-nochange-123")
    mock_user.find_task_by_id.return_value = mock_task

    # Args with ID but no description or priority
    args = create_mock_args(id="edit-nochange", verbose=False)

    # Call the handler - it should print and return normally, not exit
    cli_main.handle_edit(args, mock_manager, mock_user)

    # Ensure find_task_by_id was NOT called because the function returns early
    mock_user.find_task_by_id.assert_not_called()

    # Check the informational message was printed
    mock_print.assert_any_call("No changes specified. Nothing to update.")

    # Ensure save was not called
    mock_manager.save_user.assert_not_called()


def test_handle_edit_save_error(mocker: Any) -> None:
    """Test handle_edit handles exceptions during manager.save_user."""
    mock_print = mocker.patch("builtins.print")
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = Task(description="Task to edit", id="edit-savefail-456")
    mock_user.find_task_by_id.return_value = mock_task
    error_message = "Disk full"
    mock_manager.save_user.side_effect = IOError(error_message)

    args = create_mock_args(
        id="edit-savefail", description="New Description", verbose=True
    )

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager, mock_user)

    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)
    mock_user.find_task_by_id.assert_called_once_with("edit-savefail")
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Check error message was printed
    expected_error_msg = f"Error saving task update: {error_message}"
    mock_print.assert_any_call(expected_error_msg)


def test_handle_create_invalid_priority(mocker: Any) -> None:
    """Test handle_create with an invalid priority value."""
    mock_print = mocker.patch("builtins.print")
    # Mock sys.exit to also raise SystemExit to halt execution
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))

    # Do NOT mock the Priority enum itself, let the real one raise ValueError
    # mock_priority = mocker.patch("motido.cli.main.Priority")
    # mock_priority.side_effect = ValueError("Invalid enum value")
    # Keep access to real values if needed (e.g., for the error message)
    # mock_priority.LOW = Priority.LOW

    # Create arguments with invalid priority
    args = create_mock_args(
        description="New task", priority="InvalidPriority", verbose=True
    )

    # Create mock manager and user
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)  # Could be None as well, check impl

    # Call the handler and expect SystemExit
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager, mock_user)

    # Assert exit code is 1
    assert excinfo.value.code == 1

    # Assert sys.exit was called (redundant with raises check, but explicit)
    mock_exit.assert_called_once_with(1)

    # Assert the correct error message was printed
    expected_error_msg_start = "Error: Invalid priority 'InvalidPriority'."
    # Get the list of priority values for the full message check
    valid_values_str = ", ".join([p.value for p in Priority])
    expected_error_msg = (
        f"{expected_error_msg_start} Valid values are: {valid_values_str}"
    )

    # Check if the expected error message was printed
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    # The verbose print "Creating task..." might also be called before the error
    assert any(expected_error_msg in call_args for call_args in print_calls)

    # Ensure save was not called
    mock_manager.save_user.assert_not_called()


def test_handle_list_sort_by_priority(mocker: Any) -> None:
    """Test handle_list sorts tasks by priority."""
    # Mock rich components
    mock_console = mocker.MagicMock()
    mocker.patch("motido.cli.main.Console", return_value=mock_console)
    mock_table = mocker.MagicMock()
    mocker.patch("motido.cli.main.Table", return_value=mock_table)
    mock_print = mocker.patch("builtins.print")

    # Create a user with tasks of different priorities
    user = User(username="test_user")

    # Add tasks with different priorities (not in priority order)
    task_high = Task(
        description="High priority task", id="uuid-high", priority=Priority.HIGH
    )
    task_low = Task(
        description="Low priority task", id="uuid-low", priority=Priority.LOW
    )
    task_medium = Task(
        description="Medium priority task", id="uuid-medium", priority=Priority.MEDIUM
    )

    user.add_task(task_high)  # Add high first
    user.add_task(task_low)  # Then low
    user.add_task(task_medium)  # Then medium

    # Create args for sorting by priority in ascending order
    args = create_mock_args(sort_by="priority", sort_order="asc", verbose=True)

    # Call the handler
    cli_main.handle_list(args, mocker.MagicMock(), user)

    # Expected order after sorting: low, medium, high
    assert user.tasks[0].priority == Priority.LOW
    assert user.tasks[1].priority == Priority.MEDIUM
    assert user.tasks[2].priority == Priority.HIGH

    # Create args for sorting by priority in descending order
    args = create_mock_args(sort_by="priority", sort_order="desc", verbose=True)

    # Call the handler (now sorting by priority desc)
    cli_main.handle_list(args, mocker.MagicMock(), user)

    # Expected order after sorting: high, medium, low
    assert user.tasks[0].priority == Priority.HIGH
    assert user.tasks[1].priority == Priority.MEDIUM
    assert user.tasks[2].priority == Priority.LOW

    # Verify basic output
    mock_console.print.assert_called()
    mock_print.assert_any_call("Total tasks: 3")


def test_handle_view_not_found(mocker: Any) -> None:
    """Test handle_view exits when task is not found."""
    mock_print = mocker.patch("builtins.print")
    # Mock sys.exit to raise SystemExit
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Simulate task not found
    mock_user.find_task_by_id.return_value = None

    args = create_mock_args(id="nonexistent", verbose=True)

    # Expect SystemExit to be raised
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    # Check exit code
    assert excinfo.value.code == 1

    # Check sys.exit was called
    mock_exit.assert_called_once_with(1)

    # Check the error message was printed
    expected_error_msg = "Error: Task with ID prefix 'nonexistent' not found."
    # Check print calls (verbose message might also be printed first)
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(expected_error_msg in call_args for call_args in print_calls)

    # Check find_task_by_id was called
    mock_user.find_task_by_id.assert_called_once_with("nonexistent")


def test_handle_view_ambiguous_id(mocker: Any) -> None:
    """Test handle_view exits with ValueError for ambiguous ID."""
    # Mock sys.exit to raise SystemExit
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Simulate find_task_by_id raising ValueError
    error_message = "Ambiguous ID prefix 'amb'. Multiple tasks found."
    mock_user.find_task_by_id.side_effect = ValueError(error_message)

    args = create_mock_args(id="amb", verbose=False)

    # Expect SystemExit
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    # Check exit code
    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)

    # Check error message printed
    # Check print calls (verbose message should not be printed first)
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(f"Error: {error_message}" in call_args for call_args in print_calls)

    # Check find_task_by_id was called
    mock_user.find_task_by_id.assert_called_once_with("amb")


def test_handle_view_unexpected_exception(mocker: Any) -> None:
    """Test handle_view catches unexpected exceptions."""
    # Mock sys.exit to raise SystemExit
    mock_exit = mocker.patch("sys.exit", side_effect=SystemExit(1))
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    # Simulate find_task_by_id raising an unexpected error
    error_message = "Something weird happened"
    mock_user.find_task_by_id.side_effect = TypeError(error_message)

    args = create_mock_args(id="abc", verbose=False)

    # Expect SystemExit
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager, mock_user)

    # Check exit code
    assert excinfo.value.code == 1
    mock_exit.assert_called_once_with(1)

    # Check error message printed
    # Check print calls (verbose message should not be printed first)
    print_calls = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert any(
        f"An unexpected error occurred: {error_message}" in call_args
        for call_args in print_calls
    )

    # Check find_task_by_id was called
    mock_user.find_task_by_id.assert_called_once_with("abc")


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


def test_main_dispatch_create_with_priority(mocker: Any) -> None:
    """Test main() parses 'create' command with priority
    param and calls handle_create."""
    mocker.patch("sys.argv", ["main.py", "create", "-d", "New task", "-p", "High"])
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
    assert args_passed.priority == "High"
    assert hasattr(args_passed, "verbose")
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_get_manager.assert_called_once()
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_main_dispatch_edit_with_priority(mocker: Any) -> None:
    """Test main() parses 'edit' command with priority and calls handle_edit."""
    mocker.patch("sys.argv", ["main.py", "edit", "--id", "abc", "-p", "Medium"])
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
    assert not hasattr(args_passed, "description") or args_passed.description is None
    assert args_passed.priority == "Medium"
    assert hasattr(args_passed, "verbose")
    assert manager_passed == mock_manager_instance
    assert user_passed == mock_user
    mock_get_manager.assert_called_once()
    mock_manager_instance.load_user.assert_called_once_with(DEFAULT_USERNAME)


def test_handle_edit_success_description_not_verbose(mocker: Any) -> None:
    """Test handle_edit updates description successfully (non-verbose)."""
    old_description = "Old desc non-verbose"
    new_description = "New desc non-verbose"
    mock_task = Task(description=old_description, id="edit-desc-nv-456")

    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = mock_task

    # Create args with verbose=False
    args = create_mock_args(
        id="edit-desc-nv", description=new_description, verbose=False
    )

    cli_main.handle_edit(args, mock_manager, mock_user)

    mock_user.find_task_by_id.assert_called_once_with(args.id)
    mock_manager.save_user.assert_called_once_with(mock_user)
    assert mock_task.description == new_description

    # Verify standard success messages
    mock_print.assert_has_calls(
        [
            call("Task updated successfully:"),
            call(f"  Old Description: {old_description}"),
            call(f"  New Description: {new_description}"),
        ]
    )

    # Ensure verbose message was NOT printed
    verbose_message = f"Editing task with ID prefix: '{args.id}'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages
