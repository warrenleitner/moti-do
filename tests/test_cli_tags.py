"""
Tests for CLI tag commands (tag add, tag remove, tag list).
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods

import argparse
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_tag
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
            tags=["existing-tag"],
        ),
        Task(
            title="Task B",
            creation_date=datetime(2023, 1, 2, 12, 0, 0),
            id="uuid-b",
            tags=[],
        ),
    ]
    return user


# --- Tag Add Tests ---


@patch("builtins.print")
def test_handle_tag_add_new_tag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test adding a new tag to a task."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-b", tag="new-tag", verbose=False)

    handle_tag(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert "new-tag" in task.tags
    mock_print.assert_called_with("Added tag 'new-tag' to task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_tag_add_duplicate_tag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test adding a duplicate tag doesn't duplicate it."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-a", tag="existing-tag", verbose=False)

    handle_tag(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert task.tags.count("existing-tag") == 1
    mock_print.assert_called_with("Tag 'existing-tag' already exists on task 'Task A'.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_add_with_whitespace(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test adding a tag with whitespace gets stripped."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-b", tag="  spaced-tag  ", verbose=False)

    handle_tag(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-b")
    assert task is not None
    assert "spaced-tag" in task.tags
    assert "  spaced-tag  " not in task.tags
    mock_print.assert_called_with("Added tag 'spaced-tag' to task 'Task B'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


# --- Tag Remove Tests ---


@patch("builtins.print")
def test_handle_tag_remove_existing_tag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test removing an existing tag from a task."""
    mock_manager = MagicMock()
    args = MockArgs(
        tag_command="remove", id="uuid-a", tag="existing-tag", verbose=False
    )

    handle_tag(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert "existing-tag" not in task.tags
    mock_print.assert_called_with("Removed tag 'existing-tag' from task 'Task A'.")
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_tag_remove_nonexistent_tag(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test removing a tag that doesn't exist."""
    mock_manager = MagicMock()
    args = MockArgs(
        tag_command="remove", id="uuid-a", tag="nonexistent-tag", verbose=False
    )

    handle_tag(args, mock_manager, mock_user)

    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    assert "nonexistent-tag" not in task.tags
    mock_print.assert_called_with("Tag 'nonexistent-tag' not found on task 'Task A'.")
    mock_manager.save_user.assert_not_called()


# --- Tag List Tests ---


@patch("builtins.print")
def test_handle_tag_list_with_tags(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test listing tags when task has tags."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="list", id="uuid-a", tag=None, verbose=False)

    handle_tag(args, mock_manager, mock_user)

    mock_print.assert_called_with("Tags for task 'Task A': existing-tag")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_list_without_tags(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test listing tags when task has no tags."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="list", id="uuid-b", tag=None, verbose=False)

    handle_tag(args, mock_manager, mock_user)

    mock_print.assert_called_with("Task 'Task B' has no tags.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_list_with_multiple_tags(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test listing multiple tags."""
    # Add more tags to Task A
    task = mock_user.find_task_by_id("uuid-a")
    assert task is not None
    task.tags.extend(["tag2", "tag3"])

    mock_manager = MagicMock()
    args = MockArgs(tag_command="list", id="uuid-a", tag=None, verbose=False)

    handle_tag(args, mock_manager, mock_user)

    mock_print.assert_called_with("Tags for task 'Task A': existing-tag, tag2, tag3")
    mock_manager.save_user.assert_not_called()


# --- Error Handling Tests ---


@patch("builtins.print")
def test_handle_tag_task_not_found(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag command with non-existent task ID."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="nonexistent", tag="tag", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error: Task with ID prefix 'nonexistent' not found.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_no_user(  # type: ignore[misc]
    mock_print: MagicMock,
) -> None:
    """Test tag command with no user."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-a", tag="tag", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, None)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("User 'default_user' not found or no data available.")
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_ambiguous_id(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag command with ambiguous task ID prefix."""
    # Make both tasks have IDs starting with 'uuid-'
    mock_user.tasks[0].id = "uuid-abc"
    mock_user.tasks[1].id = "uuid-abd"

    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-a", tag="tag", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    assert "Error:" in mock_print.call_args[0][0]
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_add_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag add with save error."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = MockArgs(tag_command="add", id="uuid-b", tag="new-tag", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving task: Save failed")


@patch("builtins.print")
def test_handle_tag_remove_save_error(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag remove with save error."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = MockArgs(
        tag_command="remove", id="uuid-a", tag="existing-tag", verbose=False
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Error saving task: Save failed")


@patch("builtins.print")
def test_handle_tag_generic_exception(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag command with generic exception."""
    mock_manager = MagicMock()
    mock_manager.save_user.side_effect = RuntimeError("Unexpected error")
    args = MockArgs(tag_command="add", id="uuid-b", tag="new-tag", verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with("Unexpected error: Unexpected error")


@patch("builtins.print")
def test_handle_tag_verbose_mode(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag command in verbose mode."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-b", tag="new-tag", verbose=True)

    handle_tag(args, mock_manager, mock_user)

    # Verbose mode should print debug info
    assert mock_print.call_count >= 2
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("builtins.print")
def test_handle_tag_add_missing_tag_argument(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag add without providing tag argument."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="add", id="uuid-b", tag=None, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with(
        "Error: Tag argument is required for 'add' operation."
    )
    mock_manager.save_user.assert_not_called()


@patch("builtins.print")
def test_handle_tag_remove_missing_tag_argument(  # type: ignore[misc]
    mock_print: MagicMock, mock_user: User
) -> None:
    """Test tag remove without providing tag argument."""
    mock_manager = MagicMock()
    args = MockArgs(tag_command="remove", id="uuid-a", tag=None, verbose=False)

    with pytest.raises(SystemExit) as exc_info:
        handle_tag(args, mock_manager, mock_user)

    assert exc_info.value.code == 1
    mock_print.assert_called_with(
        "Error: Tag argument is required for 'remove' operation."
    )
    mock_manager.save_user.assert_not_called()
