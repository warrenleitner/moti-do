"""Tests for the history and undo CLI commands."""

# pylint: disable=redefined-outer-name

import argparse
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

# pylint: disable=protected-access
# pyright: reportPrivateUsage=false
from motido.cli.main import _record_history, handle_history, handle_undo
from motido.core.models import Difficulty, Duration, Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    return argparse.Namespace(**kwargs)


@pytest.fixture
def user_with_task() -> User:
    """Create a user with a task for history testing."""
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-aaaa-1111",
            priority=Priority.MEDIUM,
            history=[],
        )
    )
    return user


@pytest.fixture
def user_with_task_and_history() -> User:
    """Create a user with a task that has history entries."""
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-aaaa-1111",
            priority=Priority.HIGH,
            difficulty=Difficulty.HERCULEAN,
            duration=Duration.ODYSSEYAN,
            history=[
                {
                    "timestamp": "2023-01-01T12:30:00",
                    "field": "title",
                    "old_value": "Original Title",
                    "new_value": "Task A",
                },
                {
                    "timestamp": "2023-01-01T12:35:00",
                    "field": "priority",
                    "old_value": "Low",
                    "new_value": "High",
                },
            ],
        )
    )
    return user


# --- Test _record_history Helper ---


def test_record_history_string_value(user_with_task: User) -> None:
    """Test recording history with string values."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None

    entry = _record_history(task, "title", "Old Title", "New Title")

    assert len(task.history) == 1
    assert entry["field"] == "title"
    assert entry["old_value"] == "Old Title"
    assert entry["new_value"] == "New Title"
    assert "timestamp" in entry


def test_record_history_enum_value(user_with_task: User) -> None:
    """Test recording history with enum values (converts to string)."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None

    entry = _record_history(task, "priority", Priority.LOW, Priority.HIGH)

    assert len(task.history) == 1
    assert entry["field"] == "priority"
    assert entry["old_value"] == "Low"  # Enum value converted to string
    assert entry["new_value"] == "High"


def test_record_history_multiple_entries(user_with_task: User) -> None:
    """Test recording multiple history entries."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None

    _record_history(task, "title", "T1", "T2")
    _record_history(task, "priority", "Low", "High")
    _record_history(task, "difficulty", "Trivial", "Hard")

    assert len(task.history) == 3
    assert task.history[0]["field"] == "title"
    assert task.history[1]["field"] == "priority"
    assert task.history[2]["field"] == "difficulty"


# --- Test handle_history ---


def test_history_success(user_with_task_and_history: User, capsys: Any) -> None:
    """Test displaying task history."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_history(args, manager, user_with_task_and_history)

    captured = capsys.readouterr()
    assert "History for" in captured.out
    assert "title" in captured.out
    assert "priority" in captured.out
    assert "Original Title" in captured.out
    assert "Task A" in captured.out


def test_history_empty(user_with_task: User, capsys: Any) -> None:
    """Test displaying history when task has no history."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_history(args, manager, user_with_task)

    captured = capsys.readouterr()
    assert "has no history" in captured.out


def test_history_task_not_found(user_with_task: User, capsys: Any) -> None:
    """Test history when task is not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="nonexistent")

    with pytest.raises(SystemExit) as exc_info:
        handle_history(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_history_user_not_found(capsys: Any) -> None:
    """Test history when user is None."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_history(args, manager, None)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "User not found" in captured.out


def test_history_ambiguous_id(user_with_task: User, capsys: Any) -> None:
    """Test history when task ID is ambiguous."""
    # Add another task with similar ID
    user_with_task.add_task(
        Task(
            title="Task B",
            creation_date=datetime(2023, 1, 1),
            id="uuid-aaaa-2222",
            priority=Priority.MEDIUM,
        )
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_history(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error" in captured.out


def test_history_invalid_timestamp_format(user_with_task: User, capsys: Any) -> None:
    """Test history with invalid timestamp format in entry."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.history.append(
        {
            "timestamp": "invalid-date",
            "field": "title",
            "old_value": "A",
            "new_value": "B",
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_history(args, manager, user_with_task)

    captured = capsys.readouterr()
    assert "History for" in captured.out
    # Should display the invalid timestamp as-is
    assert "invalid-date" in captured.out


# --- Test handle_undo ---


def test_undo_title_success(user_with_task_and_history: User, capsys: Any) -> None:
    """Test undoing the last change (priority in this case)."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_undo(args, manager, user_with_task_and_history)

    task = user_with_task_and_history.find_task_by_id("uuid-aaaa")
    assert task is not None
    assert task.priority == Priority.LOW  # Reverted from High to Low
    assert len(task.history) == 1  # One entry removed
    manager.save_user.assert_called_once()

    captured = capsys.readouterr()
    assert "Undone" in captured.out
    assert "priority" in captured.out


def test_undo_empty_history(user_with_task: User, capsys: Any) -> None:
    """Test undo when task has no history."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_undo(args, manager, user_with_task)

    captured = capsys.readouterr()
    assert "has no history to undo" in captured.out
    manager.save_user.assert_not_called()


def test_undo_task_not_found(user_with_task: User, capsys: Any) -> None:
    """Test undo when task is not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="nonexistent")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_undo_user_not_found(capsys: Any) -> None:
    """Test undo when user is None."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, None)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "User not found" in captured.out


def test_undo_title_field(user_with_task: User) -> None:
    """Test undoing a title change."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.title = "New Title"
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "field": "title",
            "old_value": "Original Title",
            "new_value": "New Title",
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_undo(args, manager, user_with_task)

    assert task.title == "Original Title"


def test_undo_difficulty_field(user_with_task: User) -> None:
    """Test undoing a difficulty change."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.difficulty = Difficulty.HERCULEAN
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "field": "difficulty",
            "old_value": "Trivial",
            "new_value": "Herculean",
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_undo(args, manager, user_with_task)

    assert task.difficulty == Difficulty.TRIVIAL


def test_undo_duration_field(user_with_task: User) -> None:
    """Test undoing a duration change."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.duration = Duration.ODYSSEYAN
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "field": "duration",
            "old_value": "Short",
            "new_value": "Odysseyan",
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    handle_undo(args, manager, user_with_task)

    assert task.duration == Duration.SHORT


def test_undo_unknown_field(user_with_task: User, capsys: Any) -> None:
    """Test undo with unknown field in history."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "field": "unknown_field",
            "old_value": "old",
            "new_value": "new",
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Unknown field" in captured.out
    # Entry should be re-added since undo failed
    assert len(task.history) == 1


def test_undo_invalid_entry_no_field(user_with_task: User, capsys: Any) -> None:
    """Test undo with invalid history entry (missing field)."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "old_value": "old",
            "new_value": "new",
            # field is missing
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Invalid history entry" in captured.out


def test_undo_invalid_entry_no_old_value(user_with_task: User, capsys: Any) -> None:
    """Test undo with invalid history entry (missing old_value)."""
    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    task.history.append(
        {
            "timestamp": "2023-01-01T12:00:00",
            "field": "title",
            "new_value": "new",
            # old_value is missing
        }
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Invalid history entry" in captured.out


def test_undo_io_error_on_save(user_with_task_and_history: User, capsys: Any) -> None:
    """Test IO error when saving after undo."""
    manager = MagicMock(spec=DataManager)
    manager.save_user.side_effect = IOError("Disk full")
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task_and_history)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error saving task" in captured.out


def test_undo_ambiguous_id(user_with_task_and_history: User, capsys: Any) -> None:
    """Test undo when task ID is ambiguous."""
    # Add another task with similar ID
    user_with_task_and_history.add_task(
        Task(
            title="Task B",
            creation_date=datetime(2023, 1, 1),
            id="uuid-aaaa-2222",
            priority=Priority.MEDIUM,
        )
    )

    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa")

    with pytest.raises(SystemExit) as exc_info:
        handle_undo(args, manager, user_with_task_and_history)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error" in captured.out
