"""Tests for the subtask CLI command."""

# pylint: disable=redefined-outer-name

import argparse
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_subtask
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    return argparse.Namespace(**kwargs)


@pytest.fixture
def user_with_task() -> User:
    """Create a user with a task for subtask testing."""
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-aaaa-1111",
            priority=Priority.MEDIUM,
            subtasks=[],
        )
    )
    return user


@pytest.fixture
def user_with_task_and_subtasks() -> User:
    """Create a user with a task that has subtasks."""
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-aaaa-1111",
            priority=Priority.MEDIUM,
            subtasks=[
                {"text": "Subtask 1", "complete": False},
                {"text": "Subtask 2", "complete": False},
                {"text": "Subtask 3", "complete": True},
            ],
        )
    )
    return user


# --- Test Add Subtask ---


def test_add_subtask_success(user_with_task: User, capsys: Any) -> None:
    """Test successfully adding a subtask."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text="New subtask", index=None
    )

    handle_subtask(args, manager, user_with_task)

    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    assert len(task.subtasks) == 1
    assert task.subtasks[0]["text"] == "New subtask"
    assert task.subtasks[0]["complete"] is False
    manager.save_user.assert_called_once_with(user_with_task)

    captured = capsys.readouterr()
    assert "Added subtask #1" in captured.out
    assert "New subtask" in captured.out


def test_add_subtask_no_text(user_with_task: User, capsys: Any) -> None:
    """Test adding a subtask without text."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text=None, index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Subtask text is required" in captured.out


def test_add_subtask_task_not_found(user_with_task: User, capsys: Any) -> None:
    """Test adding subtask when task not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="nonexistent", subtask_command="add", text="Subtask", index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_add_subtask_user_not_found(capsys: Any) -> None:
    """Test adding subtask when user is None."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text="Subtask", index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, None)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "User not found" in captured.out


def test_add_multiple_subtasks(user_with_task: User, capsys: Any) -> None:
    """Test adding multiple subtasks."""
    manager = MagicMock(spec=DataManager)

    # Add first subtask
    args1 = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text="First", index=None
    )
    handle_subtask(args1, manager, user_with_task)

    # Add second subtask
    args2 = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text="Second", index=None
    )
    handle_subtask(args2, manager, user_with_task)

    task = user_with_task.find_task_by_id("uuid-aaaa")
    assert task is not None
    assert len(task.subtasks) == 2
    assert task.subtasks[0]["text"] == "First"
    assert task.subtasks[1]["text"] == "Second"

    captured = capsys.readouterr()
    assert "Added subtask #1" in captured.out
    assert "Added subtask #2" in captured.out


# --- Test Complete Subtask ---


def test_complete_subtask_success(
    user_with_task_and_subtasks: User, mocker: Any, capsys: Any
) -> None:
    """Test successfully completing a subtask."""
    manager = MagicMock(spec=DataManager)
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value={"base_score": 100}
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=90)
    mock_add_xp = mocker.patch("motido.cli.main.add_xp")

    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="1"
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    task = user_with_task_and_subtasks.find_task_by_id("uuid-aaaa")
    assert task is not None
    assert task.subtasks[0]["complete"] is True
    manager.save_user.assert_called()
    # XP = 90 // 3 = 30
    mock_add_xp.assert_called_once()

    captured = capsys.readouterr()
    assert "Completed subtask #1" in captured.out
    assert "30 XP" in captured.out


def test_complete_subtask_already_complete(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test completing a subtask that's already complete."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="3"
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    captured = capsys.readouterr()
    assert "already complete" in captured.out
    manager.save_user.assert_not_called()


def test_complete_subtask_no_index(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test completing a subtask without an index."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task_and_subtasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Subtask index is required" in captured.out


def test_complete_subtask_index_out_of_range(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test completing a subtask with an out of range index."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="10"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task_and_subtasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "out of range" in captured.out


def test_complete_subtask_index_zero(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test completing a subtask with index 0 (invalid)."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="0"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task_and_subtasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "out of range" in captured.out


def test_complete_subtask_no_xp_on_zero_score(
    user_with_task_and_subtasks: User, mocker: Any, capsys: Any
) -> None:
    """Test completing a subtask with zero calculated score."""
    manager = MagicMock(spec=DataManager)
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value={"base_score": 100}
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=0)
    mock_add_xp = mocker.patch("motido.cli.main.add_xp")

    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="1"
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    mock_add_xp.assert_not_called()
    captured = capsys.readouterr()
    assert "Completed subtask #1" in captured.out
    assert "XP" not in captured.out


def test_complete_subtask_scoring_error(
    user_with_task_and_subtasks: User, mocker: Any, capsys: Any
) -> None:
    """Test completing a subtask when scoring fails."""
    manager = MagicMock(spec=DataManager)
    mocker.patch(
        "motido.cli.main.load_scoring_config",
        side_effect=ValueError("Config error"),
    )

    args = create_mock_args(
        id="uuid-aaaa", subtask_command="complete", text=None, index="1"
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    captured = capsys.readouterr()
    assert "Warning" in captured.out
    assert "Completed subtask" in captured.out


# --- Test Remove Subtask ---


def test_remove_subtask_success(user_with_task_and_subtasks: User, capsys: Any) -> None:
    """Test successfully removing a subtask."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="remove", text=None, index="2"
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    task = user_with_task_and_subtasks.find_task_by_id("uuid-aaaa")
    assert task is not None
    assert len(task.subtasks) == 2
    assert task.subtasks[0]["text"] == "Subtask 1"
    assert task.subtasks[1]["text"] == "Subtask 3"  # Subtask 2 was removed
    manager.save_user.assert_called_once()

    captured = capsys.readouterr()
    assert "Removed subtask #2" in captured.out


def test_remove_subtask_no_index(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test removing a subtask without an index."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="remove", text=None, index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task_and_subtasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Subtask index is required" in captured.out


def test_remove_subtask_index_out_of_range(
    user_with_task_and_subtasks: User, capsys: Any
) -> None:
    """Test removing a subtask with an out of range index."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="remove", text=None, index="10"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task_and_subtasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "out of range" in captured.out


# --- Test List Subtasks ---


def test_list_subtasks_success(user_with_task_and_subtasks: User, capsys: Any) -> None:
    """Test listing subtasks."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="list", text=None, index=None
    )

    handle_subtask(args, manager, user_with_task_and_subtasks)

    captured = capsys.readouterr()
    assert "Subtasks for" in captured.out
    assert "Subtask 1" in captured.out
    assert "Subtask 2" in captured.out
    assert "Subtask 3" in captured.out


def test_list_subtasks_empty(user_with_task: User, capsys: Any) -> None:
    """Test listing subtasks when task has no subtasks."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="list", text=None, index=None
    )

    handle_subtask(args, manager, user_with_task)

    captured = capsys.readouterr()
    assert "has no subtasks" in captured.out


# --- Test Error Handling ---


def test_subtask_ambiguous_task_id(user_with_task: User, capsys: Any) -> None:
    """Test error when task ID is ambiguous."""
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
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="list", text=None, index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error" in captured.out


def test_subtask_io_error_on_save(user_with_task: User, capsys: Any) -> None:
    """Test IO error when saving subtask changes."""
    manager = MagicMock(spec=DataManager)
    manager.save_user.side_effect = IOError("Disk full")
    args = create_mock_args(
        id="uuid-aaaa", subtask_command="add", text="New subtask", index=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_subtask(args, manager, user_with_task)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error saving task" in captured.out
