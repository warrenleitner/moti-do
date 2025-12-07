"""Tests for the 'describe' command in the CLI."""

# pylint: disable=redefined-outer-name,unused-argument

import argparse
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from motido.cli import main as cli_main
from motido.core.models import Task, User

# pylint: disable=too-few-public-methods


class MockArgs(argparse.Namespace):
    """Mock Namespace for testing."""

    def __init__(self, **kwargs: object) -> None:
        """Initialize with keyword arguments."""
        super().__init__()
        self.__dict__.update(kwargs)
        if not hasattr(self, "verbose"):
            self.verbose = False


@pytest.fixture
def mock_user() -> User:
    """Create a mock user with test tasks."""
    user = User(username="test_user")
    user.tasks = [
        Task(
            title="Task 1",
            creation_date=datetime.now(),
            id="task1",
            text_description=None,
        ),
        Task(
            title="Task 2",
            creation_date=datetime.now(),
            id="task2",
            text_description="Existing description",
        ),
    ]
    return user


@patch("builtins.print")
def test_handle_describe_adds_description(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe adds description to a task without one."""
    mock_manager = MagicMock()
    args = MockArgs(id="task1", description="New task description", verbose=False)

    cli_main.handle_describe(args, mock_manager, mock_user)

    # Find the task
    task = next(task for task in mock_user.tasks if task.id == "task1")

    # Verify description was set
    assert task.text_description == "New task description"

    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Verify success message
    mock_print.assert_called_once_with(
        "Added description to task 'Task 1' (ID: task1)."
    )


@patch("builtins.print")
def test_handle_describe_updates_existing_description(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe updates an existing description."""
    mock_manager = MagicMock()
    args = MockArgs(id="task2", description="Updated task description", verbose=False)

    cli_main.handle_describe(args, mock_manager, mock_user)

    # Find the task
    task = next(task for task in mock_user.tasks if task.id == "task2")

    # Verify description was updated
    assert task.text_description == "Updated task description"

    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)

    # Verify success message
    mock_print.assert_called_once_with(
        "Updated description for task 'Task 2' (ID: task2)."
    )


@patch("builtins.print")
def test_handle_describe_multiline_text(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe supports multi-line descriptions."""
    mock_manager = MagicMock()
    multiline_desc = "Line 1\nLine 2\nLine 3"
    args = MockArgs(id="task1", description=multiline_desc, verbose=False)

    cli_main.handle_describe(args, mock_manager, mock_user)

    # Find the task
    task = next(task for task in mock_user.tasks if task.id == "task1")

    # Verify multi-line description was set
    assert task.text_description == multiline_desc

    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_describe_task_not_found(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe handles non-existent task ID."""
    mock_manager = MagicMock()
    args = MockArgs(id="nonexistent", description="Some description", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        cli_main.handle_describe(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error: Task with ID prefix 'nonexistent' not found.")


@patch("builtins.print")
def test_handle_describe_no_user(mock_print: MagicMock) -> None:
    """Test that handle_describe handles missing user."""
    mock_manager = MagicMock()
    args = MockArgs(id="task1", description="Some description", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        cli_main.handle_describe(args, mock_manager, None)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("User 'default_user' not found or no data available.")


@patch("builtins.print")
def test_handle_describe_ambiguous_id(mock_print: MagicMock, mock_user: User) -> None:  # type: ignore[misc]
    """Test that handle_describe handles ambiguous ID prefix."""
    # Add another task with similar ID
    mock_user.tasks.append(
        Task(
            title="Task 1 duplicate",
            creation_date=datetime.now(),
            id="task1-duplicate",
        )
    )

    mock_manager = MagicMock()
    args = MockArgs(id="task1", description="Some description", verbose=False)

    # Mock find_task_by_id to raise ValueError for ambiguous ID
    with patch.object(
        mock_user, "find_task_by_id", side_effect=ValueError("Ambiguous ID")
    ):
        with pytest.raises(SystemExit) as exc_info:
            cli_main.handle_describe(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error: Ambiguous ID")


@patch("builtins.print")
def test_handle_describe_save_error(mock_print: MagicMock, mock_user: User) -> None:  # type: ignore[misc]
    """Test that handle_describe handles save errors gracefully."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = MockArgs(id="task1", description="Some description", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        cli_main.handle_describe(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving task update: Save failed")


@patch("builtins.print")
def test_handle_describe_generic_exception(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe handles generic exceptions gracefully."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = RuntimeError("Unexpected error")
    args = MockArgs(id="task1", description="Some description", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        cli_main.handle_describe(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving updated task: Unexpected error")


@patch("builtins.print")
def test_handle_describe_verbose_mode(mock_print: MagicMock, mock_user: User) -> None:  # type: ignore[misc]
    """Test that handle_describe prints verbose messages when enabled."""
    mock_manager = MagicMock()
    args = MockArgs(id="task1", description="New description", verbose=True)

    cli_main.handle_describe(args, mock_manager, mock_user)

    # Verify verbose message was printed
    assert any(
        "Setting description for task with ID prefix: 'task1'" in str(call)
        for call in mock_print.call_args_list
    )


@patch("builtins.print")
def test_handle_describe_empty_description(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test that handle_describe allows empty description (to clear it)."""
    mock_manager = MagicMock()
    args = MockArgs(id="task2", description="", verbose=False)

    cli_main.handle_describe(args, mock_manager, mock_user)

    # Find the task
    task = next(task for task in mock_user.tasks if task.id == "task2")

    # Verify description was cleared
    assert task.text_description == ""

    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)
