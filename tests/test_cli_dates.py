"""
Tests for CLI date commands (set-due, set-start).
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods

import argparse
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_set_due, handle_set_start
from motido.core.models import Task, User


class MockArgs(argparse.Namespace):
    """Mock CLI arguments - inherits from Namespace for type safety."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__()
        self.__dict__.update(kwargs)


@pytest.fixture
def mock_user() -> User:
    """Create a mock user with test tasks."""
    user = User(username="test_user")
    user.tasks = [
        Task(
            title="Task A",
            creation_date=datetime(2023, 1, 1, 12, 0, 0),
            id="uuid-a",
        ),
        Task(
            title="Task B",
            creation_date=datetime(2023, 1, 2, 12, 0, 0),
            id="uuid-b",
        ),
    ]
    return user


@patch("builtins.print")
def test_handle_set_due_with_iso_date(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with ISO format date."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-12-31", clear=False, verbose=False)

    handle_set_due(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.due_date == datetime(2025, 12, 31, 0, 0, 0)
    mock_print.assert_called_with("Set due date to 2025-12-31 for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_due_with_tomorrow(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with 'tomorrow'."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="tomorrow", clear=False, verbose=False)

    handle_set_due(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.due_date is not None
    assert isinstance(task.due_date, datetime)
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_due_with_next_friday(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with 'next friday'."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="next friday", clear=False, verbose=False)

    handle_set_due(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.due_date is not None
    assert isinstance(task.due_date, datetime)
    assert task.due_date.weekday() == 4  # Friday is 4
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_due_with_in_3_days(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with 'in 3 days'."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="in 3 days", clear=False, verbose=False)

    handle_set_due(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.due_date is not None
    assert isinstance(task.due_date, datetime)
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_due_clear_flag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test clearing due date with --clear flag."""
    mock_manager = MagicMock()
    # First set a due date
    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    task.due_date = datetime(2025, 12, 31, 0, 0, 0)

    args = MockArgs(id="uuid-a", date=None, clear=True, verbose=False)

    handle_set_due(args, mock_manager, mock_user)

    assert task.due_date is None
    mock_print.assert_called_with("Cleared due date for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_due_invalid_date(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with invalid date format."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="invalid-date", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    assert any("Error parsing date" in str(call) for call in mock_print.call_args_list)


@patch("builtins.print")
def test_handle_set_due_task_not_found(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date for non-existent task."""
    mock_manager = MagicMock()
    args = MockArgs(id="nonexistent", date="2025-12-31", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    mock_print.assert_called_with("Error: Task with ID prefix 'nonexistent' not found.")


@patch("builtins.print")
def test_handle_set_due_no_user(mock_print: MagicMock) -> None:  # type: ignore[misc]
    """Test setting due date when user is None."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-12-31", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, None)

    mock_print.assert_called_with("User 'default_user' not found or no data available.")


@patch("builtins.print")
def test_handle_set_due_ambiguous_id(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting due date with ambiguous task ID."""
    mock_manager = MagicMock()
    # Both tasks have IDs starting with "uuid-"
    args = MockArgs(id="uuid", date="2025-12-31", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    assert any("Error:" in str(call) for call in mock_print.call_args_list)


@patch("builtins.print")
def test_handle_set_due_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test handling IOError during save."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-12-31", clear=False, verbose=False)
    mock_manager.save_user.side_effect = IOError("Disk full")

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    mock_print.assert_called_with("Error saving task: Disk full")


@patch("builtins.print")
def test_handle_set_due_generic_exception(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test handling generic exception."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-12-31", clear=False, verbose=False)
    mock_manager.save_user.side_effect = RuntimeError("Unexpected error")

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    mock_print.assert_called_with("Unexpected error: Unexpected error")


@patch("builtins.print")
def test_handle_set_due_verbose_mode(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test verbose output for set-due command."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-12-31", clear=False, verbose=True)

    handle_set_due(args, mock_manager, mock_user)

    assert any(
        "Setting due date for task" in str(call) for call in mock_print.call_args_list
    )


@patch("builtins.print")
def test_handle_set_due_no_date_no_clear(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test error when neither date nor --clear is provided."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date=None, clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_due(args, mock_manager, mock_user)

    mock_print.assert_called_with(
        "Error: Please provide a date or use --clear to remove the due date."
    )


# --- Set Start Date Tests ---


@patch("builtins.print")
def test_handle_set_start_with_iso_date(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting start date with ISO format date."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-01-15", clear=False, verbose=False)

    handle_set_start(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.start_date == datetime(2025, 1, 15, 0, 0, 0)
    mock_print.assert_called_with("Set start date to 2025-01-15 for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_start_with_today(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting start date with 'today'."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="today", clear=False, verbose=False)

    handle_set_start(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.start_date is not None
    assert isinstance(task.start_date, datetime)
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_start_clear_flag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test clearing start date with --clear flag."""
    mock_manager = MagicMock()
    # First set a start date
    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    task.start_date = datetime(2025, 1, 15, 0, 0, 0)

    args = MockArgs(id="uuid-a", date=None, clear=True, verbose=False)

    handle_set_start(args, mock_manager, mock_user)

    assert task.start_date is None
    mock_print.assert_called_with("Cleared start date for task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_set_start_invalid_date(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting start date with invalid date format."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="bad-date", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    assert any("Error parsing date" in str(call) for call in mock_print.call_args_list)


@patch("builtins.print")
def test_handle_set_start_task_not_found(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting start date for non-existent task."""
    mock_manager = MagicMock()
    args = MockArgs(id="xyz999", date="2025-01-15", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    mock_print.assert_called_with("Error: Task with ID prefix 'xyz999' not found.")


@patch("builtins.print")
def test_handle_set_start_no_user(mock_print: MagicMock) -> None:  # type: ignore[misc]
    """Test setting start date when user is None."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-01-15", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, None)

    mock_print.assert_called_with("User 'default_user' not found or no data available.")


@patch("builtins.print")
def test_handle_set_start_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test handling IOError during save for set-start."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-01-15", clear=False, verbose=False)
    mock_manager.save_user.side_effect = IOError("Write failed")

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    mock_print.assert_called_with("Error saving task: Write failed")


@patch("builtins.print")
def test_handle_set_start_generic_exception(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test handling generic exception for set-start."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-01-15", clear=False, verbose=False)
    mock_manager.save_user.side_effect = RuntimeError("System error")

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    mock_print.assert_called_with("Unexpected error: System error")


@patch("builtins.print")
def test_handle_set_start_verbose_mode(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test verbose output for set-start command."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date="2025-01-15", clear=False, verbose=True)

    handle_set_start(args, mock_manager, mock_user)

    assert any(
        "Setting start date for task" in str(call) for call in mock_print.call_args_list
    )


@patch("builtins.print")
def test_handle_set_start_no_date_no_clear(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test error when neither date nor --clear is provided."""
    mock_manager = MagicMock()
    args = MockArgs(id="uuid-a", date=None, clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    mock_print.assert_called_with(
        "Error: Please provide a date or use --clear to remove the start date."
    )


@patch("builtins.print")
def test_handle_set_start_ambiguous_id(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test setting start date with ambiguous task ID."""
    mock_manager = MagicMock()
    # Both tasks have IDs starting with "uuid-"
    args = MockArgs(id="uuid", date="2025-01-15", clear=False, verbose=False)

    with pytest.raises(SystemExit):
        handle_set_start(args, mock_manager, mock_user)

    assert any("Error:" in str(call) for call in mock_print.call_args_list)
