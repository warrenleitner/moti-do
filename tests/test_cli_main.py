"""Tests for the main CLI module and command handlers."""

# pylint: disable=too-many-lines

import argparse
from typing import Any
from unittest.mock import call

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
    """Test main() parses 'create' command and calls handle_create via lambda."""
    mocker.patch("sys.argv", ["main.py", "create", "-d", "New task"])
    mock_handle_create = mocker.patch("motido.cli.main.handle_create")
    mock_get_manager = mocker.patch(
        "motido.cli.main.get_data_manager"
    )  # Should be called for create
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance

    cli_main.main()

    # The handler is called via lambda set_defaults, so we check its call args
    mock_handle_create.assert_called_once()
    args_passed, manager_passed = mock_handle_create.call_args[0]
    assert args_passed.command == "create"
    assert args_passed.description == "New task"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    mock_get_manager.assert_called_once()  # Ensure manager was fetched


def test_main_dispatch_list(mocker: Any) -> None:
    """Test main() parses 'list' command and calls handle_list."""
    mocker.patch("sys.argv", ["main.py", "list"])
    mock_handle_list = mocker.patch("motido.cli.main.handle_list")
    mock_get_manager = mocker.patch(
        "motido.cli.main.get_data_manager"
    )  # Should be called for list
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    # No need to mock manager methods like load_user here

    cli_main.main()  # Execute the main function to test dispatch

    # Verify the correct functions were called
    mock_get_manager.assert_called_once()
    mock_handle_list.assert_called_once()

    # Check the arguments passed to handle_list
    # It should be called with args and manager instance
    args_passed, manager_passed = mock_handle_list.call_args[0]
    assert args_passed.command == "list"
    assert hasattr(args_passed, "verbose")  # Just check that verbose flag exists
    assert manager_passed == mock_manager_instance


def test_main_dispatch_view(mocker: Any) -> None:
    """Test main() parses 'view' command and calls handle_view."""
    mocker.patch("sys.argv", ["main.py", "view", "--id", "abc"])
    mock_handle_view = mocker.patch("motido.cli.main.handle_view")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_manager_instance.load_user.return_value = mock_manager_instance
    cli_main.main()
    mock_handle_view.assert_called_once()
    args_passed, manager_passed = mock_handle_view.call_args[0]
    assert args_passed.command == "view"
    assert args_passed.id == "abc"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    mock_get_manager.assert_called_once()


def test_main_dispatch_edit(mocker: Any) -> None:
    """Test main() parses 'edit' command and calls handle_edit."""
    mocker.patch("sys.argv", ["main.py", "edit", "--id", "abc", "-d", "Updated"])
    mock_handle_edit = mocker.patch("motido.cli.main.handle_edit")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    mock_manager_instance.load_user.return_value = mock_manager_instance
    cli_main.main()
    mock_handle_edit.assert_called_once()
    args_passed, manager_passed = mock_handle_edit.call_args[0]
    assert args_passed.command == "edit"
    assert args_passed.id == "abc"
    assert args_passed.description == "Updated"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance
    mock_get_manager.assert_called_once()


def test_main_dispatch_delete(mocker: Any) -> None:
    """Test main() parses 'delete' command and calls handle_delete."""
    mocker.patch("sys.argv", ["main.py", "delete", "--id", "xyz"])
    mock_handle_delete = mocker.patch("motido.cli.main.handle_delete")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance
    # No need to mock manager methods like load_user here

    cli_main.main()  # Execute the main function to test dispatch

    # Verify the correct functions were called
    mock_get_manager.assert_called_once()
    mock_handle_delete.assert_called_once()

    # Check the arguments passed to handle_delete
    args_passed, manager_passed = mock_handle_delete.call_args[0]
    assert args_passed.command == "delete"
    assert args_passed.id == "xyz"
    assert hasattr(args_passed, "verbose")  # Check verbose flag exists
    assert manager_passed == mock_manager_instance


def test_main_dispatch_verbose_flag(mocker: Any) -> None:
    """Test main() parses commands with the verbose flag."""
    # Example using 'list' command - verbose flag BEFORE command
    mocker.patch("sys.argv", ["main.py", "-v", "list"])  # Fixed order: -v before list
    mock_handle_list = mocker.patch("motido.cli.main.handle_list")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance

    cli_main.main()

    mock_get_manager.assert_called_once()
    mock_handle_list.assert_called_once()

    # Check the args passed to handle_list
    args_passed, manager_passed = mock_handle_list.call_args[0]
    assert args_passed.command == "list"
    assert args_passed.verbose is True  # Check verbose flag is set
    assert manager_passed == mock_manager_instance


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
    mock_user_class = mocker.patch("motido.cli.main.User")
    mock_task_class = mocker.patch("motido.cli.main.Task")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "task123abc"
    mock_task_class.return_value = mock_task
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(description="My new task", verbose=True)  # Verbose enabled

    cli_main.handle_create(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user_class.assert_not_called()
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

    cli_main.handle_create(args, mock_manager)

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
    mock_manager.load_user.return_value = None
    args = create_mock_args(description="First task", verbose=True)  # Verbose enabled

    cli_main.handle_create(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
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
    mock_manager.load_user.return_value = None
    args = create_mock_args(description="First task", verbose=False)  # Verbose disabled

    cli_main.handle_create(args, mock_manager)

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
        cli_main.handle_create(args, mock_manager)

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
    mock_manager.load_user.return_value = mock_user
    error_message = "Failed to write file"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(
        description="Task to fail save", verbose=True
    )  # Verbose enabled

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
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
    mock_manager.load_user.return_value = mock_user
    mock_user_class.return_value = mock_user
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "mock-task-id"
    mock_task_class.return_value = mock_task
    error_message = "Unexpected database error"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(description="Test task", verbose=False)  # Non-verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_create(args, mock_manager)

    # Check error message was printed (verbose should not be, as verbose=False)
    mock_print.assert_called_once_with(f"Error saving task: {error_message}")
    # Double check verbose wasn't printed
    verbose_message = "Creating task: 'Test task'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_list_success(mocker: Any) -> None:
    """Test handle_list prints tasks correctly (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    task1 = Task(description="Task One", id="abc12345-...")
    task2 = Task(description="Task Two", id="def67890-...")
    mock_user.tasks = [task1, task2]
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)  # Verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose call and non-verbose table output calls
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task1.id[:8]:12} | {task1.description}"),
        call(f"{task2.id[:8]:12} | {task2.description}"),
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_list_success_not_verbose(mocker: Any) -> None:
    """Test handle_list prints tasks correctly (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    task1 = Task(description="Task One", id="abc12345-...")
    task2 = Task(description="Task Two", id="def67890-...")
    mock_user.tasks = [task1, task2]
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(
        sort_by=None, sort_order="asc", verbose=False
    )  # Non-verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check non-verbose table output calls (verbose message should NOT be present)
    expected_calls = [
        # NO call("Listing all tasks..."),
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task1.id[:8]:12} | {task1.description}"),
        call(f"{task2.id[:8]:12} | {task2.description}"),
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)
    # Double check verbose wasn't printed
    verbose_message = "Listing all tasks..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_list_success_no_tasks(mocker: Any) -> None:
    """Test handle_list handles user with no tasks (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.tasks = []
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)  # Verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose and standard message
    mock_print.assert_has_calls(
        [call("Listing all tasks..."), call("No tasks found.")]  # Verbose  # Standard
    )


def test_handle_list_success_no_tasks_not_verbose(mocker: Any) -> None:
    """Test handle_list handles user with no tasks (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.tasks = []
    mock_manager.load_user.return_value = mock_user
    args = create_mock_args(
        sort_by=None, sort_order="asc", verbose=False
    )  # Non-verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check standard message is printed, verbose is not
    mock_print.assert_called_once_with("No tasks found.")
    verbose_message = "Listing all tasks..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_list_user_not_found(mocker: Any) -> None:
    """Test handle_list handles case where user is not found (verbose)."""
    # Error/Hint messages are always printed
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_manager.load_user.return_value = None
    args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)  # Verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose and standard messages
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call(f"User '{DEFAULT_USERNAME}' not found or no data available."),
        call("Hint: Run 'motido init' first if you haven't already."),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_list_user_not_found_not_verbose(mocker: Any) -> None:
    """Test handle_list handles case where user is not found (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_manager.load_user.return_value = None
    args = create_mock_args(
        sort_by=None, sort_order="asc", verbose=False
    )  # Non-verbose

    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check standard messages are printed, verbose is not
    expected_calls = [
        # NO call("Listing all tasks..."),
        call(f"User '{DEFAULT_USERNAME}' not found or no data available."),
        call("Hint: Run 'motido init' first if you haven't already."),
    ]
    mock_print.assert_has_calls(expected_calls)
    verbose_message = "Listing all tasks..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_view_success(mocker: Any) -> None:
    """Test handle_view successfully finds and prints a task (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "abc-123"
    mock_task.description = "View this task"
    mock_manager.load_user.return_value = mock_user
    mock_user.find_task_by_id.return_value = mock_task
    args = create_mock_args(id="abc", verbose=True)  # Verbose

    cli_main.handle_view(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with("abc")
    # Check the verbose and non-verbose task details printing
    calls_to_check = [
        call("Viewing task with ID prefix: 'abc'..."),  # Verbose
        call("-" * 30),
        call(f"ID:          {mock_task.id}"),
        call(f"Description: {mock_task.description}"),
        call("-" * 30),
    ]
    mock_print.assert_has_calls(calls_to_check)


def test_handle_view_success_not_verbose(mocker: Any) -> None:
    """Test handle_view successfully finds and prints a task (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_task = mocker.MagicMock(spec=Task)
    mock_task.id = "abc-123"
    mock_task.description = "View this task"
    mock_manager.load_user.return_value = mock_user
    mock_user.find_task_by_id.return_value = mock_task
    args = create_mock_args(id="abc", verbose=False)  # Non-verbose

    cli_main.handle_view(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with("abc")
    # Check the non-verbose task details printing (verbose should not be present)
    calls_to_check = [
        # NO call("Viewing task with ID prefix: 'abc'..."),
        call("-" * 30),
        call(f"ID:          {mock_task.id}"),
        call(f"Description: {mock_task.description}"),
        call("-" * 30),
    ]
    mock_print.assert_has_calls(calls_to_check)
    verbose_message = "Viewing task with ID prefix: 'abc'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_view_task_not_found(mocker: Any) -> None:
    """Test handle_view handles task not found by ID (verbose)."""
    # Error messages are always printed
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = None
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "nonexistent"
    args = create_mock_args(id=task_id_prefix, verbose=True)  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    # Check verbose message was printed (since verbose=True)
    # Check error message was printed (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Viewing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"Error: Task with ID prefix '{task_id_prefix}' not found."),  # Error
        ]
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_view_user_not_found(mocker: Any) -> None:
    """Test handle_view handles user not found (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_manager.load_user.return_value = None
    task_id_prefix = "any_id"
    args = create_mock_args(id=task_id_prefix, verbose=True)  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose message and error message (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Viewing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"User '{DEFAULT_USERNAME}' not found or no data available."),  # Error
        ]
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_view_ambiguous_id(mocker: Any) -> None:
    """Test handle_view handles ambiguous ID prefix (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    error_message = "Ambiguous ID prefix 'abc'"
    mock_user.find_task_by_id.side_effect = ValueError(error_message)
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "abc"
    args = create_mock_args(id=task_id_prefix, verbose=True)  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    # Check verbose message and error message (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Viewing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"Error: {error_message}"),  # Error
        ]
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_view_no_id_arg(mocker: Any) -> None:
    """Test handle_view exits if --id argument is missing (simulated)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    # Simulate args missing the 'id' attribute, verbose doesn't matter here
    args = create_mock_args(command="view", verbose=False)
    args.id = None

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    expected_error_message = "Error: Please provide a task ID prefix using --id."
    mock_print.assert_called_once_with(expected_error_message)
    # Verbose should not have been printed
    assert not any(
        "Viewing task" in c.args[0] for c in mock_print.call_args_list if c.args
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_success(mocker: Any) -> None:
    """Test handle_edit successfully edits a task description (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    original_description = "Old Description"
    task_to_edit = Task(description=original_description, id="edit12345-...")
    mock_user.find_task_by_id.return_value = task_to_edit
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "edit123"
    new_description = "Updated Description"
    args = create_mock_args(
        id=task_id_prefix, description=new_description, verbose=True
    )  # Verbose

    cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    assert task_to_edit.description == new_description
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check verbose message and non-verbose success messages
    expected_calls = [
        call(f"Editing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
        call("Task updated successfully:"),
        call(f"  Old Description: {original_description}"),
        call(f"  New Description: {new_description}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_edit_success_not_verbose(mocker: Any) -> None:
    """Test handle_edit successfully edits a task description (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    original_description = "Old Description"
    task_to_edit = Task(description=original_description, id="edit12345-...")
    mock_user.find_task_by_id.return_value = task_to_edit
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "edit123"
    new_description = "Updated Description"
    args = create_mock_args(
        id=task_id_prefix, description=new_description, verbose=False
    )  # Non-verbose

    cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    assert task_to_edit.description == new_description
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check non-verbose success messages (verbose should not be present)
    expected_calls = [
        # NO call(f"Editing task with ID prefix: '{task_id_prefix}'..."),
        call("Task updated successfully:"),
        call(f"  Old Description: {original_description}"),
        call(f"  New Description: {new_description}"),
    ]
    mock_print.assert_has_calls(expected_calls)
    verbose_message = f"Editing task with ID prefix: '{task_id_prefix}'..."
    printed_messages = [c.args[0] for c in mock_print.call_args_list if c.args]
    assert verbose_message not in printed_messages


def test_handle_edit_task_not_found(mocker: Any) -> None:
    """Test handle_edit handles task not found by ID (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.find_task_by_id.return_value = None
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "nonexistent"
    args = create_mock_args(
        id=task_id_prefix, description="Doesn't matter", verbose=True
    )  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    mock_manager.save_user.assert_not_called()
    # Check verbose message and error message (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Editing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"Error: Task with ID prefix '{task_id_prefix}' not found."),  # Error
        ]
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_user_not_found(mocker: Any) -> None:
    """Test handle_edit handles user not found (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_manager.load_user.return_value = None
    task_id_prefix = "any_id"
    args = create_mock_args(
        id=task_id_prefix, description="Doesn't matter", verbose=True
    )  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose message and error message (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Editing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"User '{DEFAULT_USERNAME}' not found or no data available."),  # Error
        ]
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_missing_description(mocker: Any) -> None:
    """Test handle_edit exits if --description is missing (simulated)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    args = create_mock_args(id="task123", description=None, verbose=False)
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_called_once_with(
        "Error: Both --id and --description are required for editing."
    )
    # Verbose should not have been printed
    assert not any(
        "Editing task" in c.args[0] for c in mock_print.call_args_list if c.args
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_missing_id(mocker: Any) -> None:
    """Test handle_edit exits if --id is missing (simulated)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    args = create_mock_args(id=None, description="New Desc", verbose=False)
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_called_once_with(
        "Error: Both --id and --description are required for editing."
    )
    # Verbose should not have been printed
    assert not any(
        "Editing task" in c.args[0] for c in mock_print.call_args_list if c.args
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_missing_both(mocker: Any) -> None:
    """Test handle_edit exits if both --id and --description are missing (simulated)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    args = create_mock_args(id=None, description=None, verbose=False)
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_print.assert_called_once_with(
        "Error: Both --id and --description are required for editing."
    )
    # Verbose should not have been printed
    assert not any(
        "Editing task" in c.args[0] for c in mock_print.call_args_list if c.args
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_ambiguous_id(mocker: Any) -> None:
    """Test handle_edit handles ambiguous ID prefix (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    error_message = "Ambiguous ID prefix 'ambig'"
    mock_user.find_task_by_id.side_effect = ValueError(error_message)
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "ambig"
    args = create_mock_args(
        id=task_id_prefix, description="New Desc", verbose=True
    )  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    mock_manager.save_user.assert_not_called()
    # Check verbose message and error message (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Editing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"Error: {error_message}"),  # Error
        ]
    )
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_save_error(mocker: Any) -> None:
    """Test handle_edit handles errors during saving (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    task_to_edit = Task(description="Old", id="savefail-...")
    mock_user.find_task_by_id.return_value = task_to_edit
    mock_manager.load_user.return_value = mock_user
    error_message = "Database locked"
    mock_manager.save_user.side_effect = Exception(error_message)
    task_id_prefix = "savefail"
    new_description = "New Desc"
    args = create_mock_args(
        id=task_id_prefix, description=new_description, verbose=True
    )  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.find_task_by_id.assert_called_once_with(task_id_prefix)
    assert task_to_edit.description == new_description
    mock_manager.save_user.assert_called_once_with(mock_user)
    # Check verbose message was called (since verbose=True)
    # Check error message was printed (non-verbose)
    mock_print.assert_has_calls(
        [
            call(f"Editing task with ID prefix: '{task_id_prefix}'..."),  # Verbose
            call(f"Error saving updated task: {error_message}"),  # Error
        ]
    )

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_success(mocker: Any) -> None:
    """Test handle_delete successfully removes a task (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "del123"
    args = create_mock_args(id=task_id_prefix, verbose=True)  # Verbose

    if hasattr(cli_main, "handle_delete"):
        cli_main.handle_delete(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.remove_task.assert_called_once_with(task_id_prefix)
        mock_manager.save_user.assert_called_once_with(mock_user)
        # Check verbose message and success message (non-verbose)
        mock_print.assert_has_calls(
            [
                call(f"Deleting task with ID prefix: '{task_id_prefix}'..."),  # Verbose
                call(f"Task '{task_id_prefix}' deleted successfully."),  # Non-verbose
            ]
        )
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found in cli_main")


def test_handle_delete_success_not_verbose(mocker: Any) -> None:
    """Test handle_delete successfully removes a task (non-verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_user.remove_task.return_value = True
    mock_manager.load_user.return_value = mock_user
    task_id_prefix = "del123"
    args = create_mock_args(id=task_id_prefix, verbose=False)

    if hasattr(cli_main, "handle_delete"):
        cli_main.handle_delete(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.remove_task.assert_called_once_with(task_id_prefix)
        mock_manager.save_user.assert_called_once_with(mock_user)
        # Check success message (non-verbose) is printed, verbose is not
        mock_print.assert_called_once_with(
            f"Task '{task_id_prefix}' deleted successfully."
        )
    else:  # pragma: no cover
        pytest.skip("handle_delete function not found in cli_main")


def test_handle_delete_task_exists(mocker: Any) -> None:
    """Test handle_delete does the deletion when task exists."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)

    # Set up the user to return a task when find_task_by_id is called
    test_task = Task(description="Test task", id="task123-...")
    mock_user.remove_task.return_value = True  # Task was successfully removed
    mock_manager.load_user.return_value = mock_user

    task_id_prefix = test_task.id[:7]
    args = create_mock_args(id=task_id_prefix, verbose=False)

    # Call the function
    cli_main.handle_delete(args, mock_manager)

    # Verify interactions
    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.remove_task.assert_called_once_with(task_id_prefix)
    mock_manager.save_user.assert_called_once_with(mock_user)
    mock_print.assert_called_with(f"Task '{task_id_prefix}' deleted successfully.")


def test_handle_delete_task_not_exists(mocker: Any) -> None:
    """Test handle_delete handles when task doesn't exist."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)

    # Set up the user to return False when remove_task is called (task not found)
    mock_user.remove_task.return_value = False
    mock_manager.load_user.return_value = mock_user

    task_id_prefix = "nonexistent"
    args = create_mock_args(id=task_id_prefix, verbose=False)

    # Call the function with sys.exit captured
    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    # Verify interactions
    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    mock_user.remove_task.assert_called_once_with(task_id_prefix)
    mock_manager.save_user.assert_not_called()  # Should not try to save
    mock_print.assert_called_with(
        f"Error: Task with ID prefix '{task_id_prefix}' not found."
    )
    assert excinfo.value.code == 1  # Should exit with error code


def test_handle_view_generic_exception(mocker: Any) -> None:
    """Test handle_view catches generic Exception (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up unexpected exception
    error_message = "Unexpected error"
    mock_user.find_task_by_id.side_effect = Exception(error_message)

    args = create_mock_args(id="task-id", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_view(args, mock_manager)

    # Check that both the verbose message and error message were printed
    mock_print.assert_has_calls(
        [
            call("Viewing task with ID prefix: 'task-id'..."),  # Verbose message
            call(f"An unexpected error occurred: {error_message}"),  # Error message
        ]
    )
    assert mock_print.call_count == 2  # Ensure exactly two calls were made
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_edit_generic_exception(mocker: Any) -> None:
    """Test handle_edit catches generic Exception (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up unexpected exception
    error_message = "Unexpected error"
    mock_user.find_task_by_id.side_effect = Exception(error_message)

    args = create_mock_args(
        id="task-id", description="Updated description", verbose=True
    )

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_edit(args, mock_manager)

    # Check that both the verbose message and error message were printed
    mock_print.assert_has_calls(
        [
            call("Editing task with ID prefix: 'task-id'..."),  # Verbose message
            call(f"Error saving updated task: {error_message}"),  # Error message
        ]
    )
    assert mock_print.call_count == 2  # Ensure exactly two calls were made
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_generic_exception_during_remove(mocker: Any) -> None:
    """Test handle_delete catches generic Exception during task removal (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Set up unexpected exception
    error_message = "Unexpected error during removal"
    mock_user.remove_task.side_effect = Exception(error_message)

    args = create_mock_args(id="task-id", verbose=True)

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    # Check that both the verbose message and error message were printed
    mock_print.assert_has_calls(
        [
            call("Deleting task with ID prefix: 'task-id'..."),  # Verbose message
            call(
                f"An unexpected error occurred during deletion: {error_message}"
            ),  # Error message
        ]
    )
    assert mock_print.call_count == 2  # Ensure exactly two calls were made
    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_delete_generic_exception_during_save(mocker: Any) -> None:
    """Test handle_delete catches generic Exception during save after deletion
    (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user
    mock_user.remove_task.return_value = True  # Removal succeeds
    error_message = "Unexpected error during save"
    mock_manager.save_user.side_effect = Exception(error_message)
    args = create_mock_args(id="task-id", verbose=True)  # Verbose

    with pytest.raises(SystemExit) as excinfo:
        cli_main.handle_delete(args, mock_manager)

    # Check verbose message and error message
    mock_print.assert_has_calls(
        [
            call("Deleting task with ID prefix: 'task-id'..."),  # Verbose
            call(f"Error saving after deleting task: {error_message}"),  # Error
        ]
    )
    # Cleaned up potential linter issue spot

    assert excinfo.type == SystemExit
    assert excinfo.value.code == 1


def test_handle_list_sort_by_id_asc(mocker: Any) -> None:
    """Test handle_list sorts tasks by ID in ascending order (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Create tasks with IDs in non-sorted order
    task1 = Task(description="Task B", id="bbb12345-...")
    task2 = Task(description="Task A", id="aaa67890-...")

    # Set up tasks in random order
    mock_user.tasks = [task1, task2]
    # Note: list.sort is in-place, so we need to mock user.tasks *before*
    # calling handle_list
    mock_manager.load_user.return_value = mock_user

    # Sort by ID in ascending order, enable verbose
    args = create_mock_args(sort_by="id", sort_order="asc", verbose=True)
    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose call and non-verbose table output
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task2.id[:8]:12} | {task2.description}"),  # aaa should be first
        call(f"{task1.id[:8]:12} | {task1.description}"),  # bbb should be second
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_list_sort_by_id_desc(mocker: Any) -> None:
    """Test handle_list sorts tasks by ID in descending order (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Create tasks with IDs in non-sorted order
    task1 = Task(description="Task B", id="bbb12345-...")
    task2 = Task(description="Task A", id="aaa67890-...")

    # Set up tasks in random order
    mock_user.tasks = [task1, task2]
    mock_manager.load_user.return_value = mock_user

    # Sort by ID in descending order, enable verbose
    args = create_mock_args(sort_by="id", sort_order="desc", verbose=True)
    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose call and non-verbose table output
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task1.id[:8]:12} | {task1.description}"),  # bbb should be first
        call(f"{task2.id[:8]:12} | {task2.description}"),  # aaa should be second
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_list_sort_by_description_asc(mocker: Any) -> None:
    """Test handle_list sorts tasks by description in ascending order (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Create tasks with descriptions in non-sorted order
    task1 = Task(description="Zebra task", id="111-...")
    task2 = Task(description="Apple task", id="222-...")

    # Set up tasks in random order
    mock_user.tasks = [task1, task2]
    mock_manager.load_user.return_value = mock_user

    # Sort by description in ascending order, enable verbose
    args = create_mock_args(sort_by="description", sort_order="asc", verbose=True)
    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose call and non-verbose table output
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task2.id[:8]:12} | {task2.description}"),  # Apple should be first
        call(f"{task1.id[:8]:12} | {task1.description}"),  # Zebra should be second
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_handle_list_sort_by_description_desc(mocker: Any) -> None:
    """Test handle_list sorts tasks by description in descending order (verbose)."""
    # Mock only builtins.print
    mock_print = mocker.patch("builtins.print")
    mock_manager = mocker.MagicMock(spec=DataManager)
    mock_user = mocker.MagicMock(spec=User)
    mock_manager.load_user.return_value = mock_user

    # Create tasks with descriptions in non-sorted order
    task1 = Task(description="Zebra task", id="111-...")
    task2 = Task(description="Apple task", id="222-...")

    # Set up tasks in random order
    mock_user.tasks = [task1, task2]
    mock_manager.load_user.return_value = mock_user

    # Sort by description in descending order, enable verbose
    args = create_mock_args(sort_by="description", sort_order="desc", verbose=True)
    cli_main.handle_list(args, mock_manager)

    mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
    # Check verbose call and non-verbose table output
    expected_calls = [
        call("Listing all tasks..."),  # Verbose
        call("-" * 50),
        call(f"{'ID':12} | {'DESCRIPTION'}"),
        call("-" * 50),
        call(f"{task1.id[:8]:12} | {task1.description}"),  # Zebra should be first
        call(f"{task2.id[:8]:12} | {task2.description}"),  # Apple should be second
        call("-" * 50),
        call(f"Total tasks: {len(mock_user.tasks)}"),
    ]
    mock_print.assert_has_calls(expected_calls)


def test_main_dispatch_list_with_sort_options(mocker: Any) -> None:
    """Test main() parses 'list' command with sorting options."""
    mocker.patch(
        "sys.argv",
        ["main.py", "list", "--sort-by", "description", "--sort-order", "desc"],
    )
    mock_handle_list = mocker.patch("motido.cli.main.handle_list")
    mock_get_manager = mocker.patch("motido.cli.main.get_data_manager")
    mock_manager_instance = mocker.MagicMock(spec=DataManager)
    mock_get_manager.return_value = mock_manager_instance

    cli_main.main()  # Execute the main function to test dispatch

    # Verify the correct functions were called
    mock_get_manager.assert_called_once()
    mock_handle_list.assert_called_once()

    # Check that sort options were correctly passed to handle_list
    args_passed, manager_passed = mock_handle_list.call_args[0]
    assert args_passed.command == "list"
    assert args_passed.sort_by == "description"
    assert args_passed.sort_order == "desc"
    assert hasattr(args_passed, "verbose")  # Reverted assertion - check presence
    assert manager_passed == mock_manager_instance
