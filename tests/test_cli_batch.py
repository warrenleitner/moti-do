"""Tests for batch-edit and batch-complete CLI commands."""

from argparse import Namespace
from datetime import datetime, timedelta
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_batch_complete, handle_batch_edit
from motido.core.models import Difficulty, Priority, Task, User
from motido.data.abstraction import DataManager

# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_manager() -> MagicMock:
    """Provides a mocked DataManager."""
    return MagicMock(spec=DataManager)


@pytest.fixture
def user_with_tasks() -> User:
    """Provides a User with various tasks for testing batch operations."""
    user = User(username="testuser")
    now = datetime.now()

    # Active task - project Career
    task1 = Task(
        id="task-001",
        title="Complete report",
        creation_date=now - timedelta(days=5),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        project="Career",
        tags=["work"],
    )

    # Active task - project Career
    task2 = Task(
        id="task-002",
        title="Review PR",
        creation_date=now - timedelta(days=3),
        priority=Priority.LOW,
        difficulty=Difficulty.LOW,
        project="Career",
        tags=["work", "code"],
    )

    # Active task - project Fitness
    task3 = Task(
        id="task-003",
        title="Go to gym",
        creation_date=now - timedelta(days=2),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        project="Fitness",
        tags=["health"],
    )

    # Completed task
    task4 = Task(
        id="task-004",
        title="Already done",
        creation_date=now - timedelta(days=10),
        is_complete=True,
    )

    # Future task (start date in future)
    task5 = Task(
        id="task-005",
        title="Future task",
        creation_date=now,
        start_date=now + timedelta(days=7),
    )

    user.tasks = [task1, task2, task3, task4, task5]
    return user


# --- Batch Edit Tests ---


@patch("builtins.input", return_value="y")
def test_batch_edit_set_priority(
    _mock_input: MagicMock, mock_manager: MagicMock, user_with_tasks: User
) -> None:
    """Test batch edit to set priority on filtered tasks."""
    args = Namespace(
        status="active",
        project="Career",
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    # Check that Career tasks have High priority
    career_tasks = [t for t in user_with_tasks.tasks if t.project == "Career"]
    for task in career_tasks:
        assert task.priority == Priority.HIGH


@patch("builtins.input", return_value="y")
def test_batch_edit_set_difficulty(
    _mock_input: MagicMock, mock_manager: MagicMock, user_with_tasks: User
) -> None:
    """Test batch edit to set difficulty on filtered tasks."""
    args = Namespace(
        status="active",
        project=None,
        tag="work",
        set_priority=None,
        set_difficulty="Herculean",
        set_project=None,
        add_tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    # Check that work-tagged tasks have Herculean difficulty
    work_tasks = [t for t in user_with_tasks.tasks if "work" in t.tags]
    for task in work_tasks:
        assert task.difficulty == Difficulty.HERCULEAN


def test_batch_edit_with_yes_flag(
    mock_manager: MagicMock, user_with_tasks: User
) -> None:
    """Test batch edit with --yes flag skips confirmation."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        set_priority=None,
        set_difficulty=None,
        set_project="NewProject",
        add_tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    # Check that active tasks have new project
    active_tasks = [t for t in user_with_tasks.tasks if not t.is_complete]
    for task in active_tasks:
        if task.start_date is None or task.start_date <= datetime.now():
            assert task.project == "NewProject"


def test_batch_edit_add_tag(mock_manager: MagicMock, user_with_tasks: User) -> None:
    """Test batch edit to add a tag."""
    args = Namespace(
        status="active",
        project="Fitness",
        tag=None,
        set_priority=None,
        set_difficulty=None,
        set_project=None,
        add_tag="important",
        yes=True,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    fitness_tasks = [t for t in user_with_tasks.tasks if t.project == "Fitness"]
    for task in fitness_tasks:
        assert "important" in task.tags


def test_batch_edit_no_matching_tasks(
    mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch edit when no tasks match filter."""
    args = Namespace(
        status="active",
        project="NonexistentProject",
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "No tasks match" in captured.out


def test_batch_edit_no_operation(
    mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch edit without any edit operation specified."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        set_priority=None,
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=True,
        verbose=False,
    )

    with pytest.raises(SystemExit):
        handle_batch_edit(args, mock_manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "No edit operation specified" in captured.out


def test_batch_edit_no_user(mock_manager: MagicMock, capsys: Any) -> None:
    """Test batch edit with no user."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=True,
        verbose=False,
    )

    with pytest.raises(SystemExit):
        handle_batch_edit(args, mock_manager, None)

    captured = capsys.readouterr()
    assert "User not found" in captured.out


@patch("builtins.input", return_value="n")
def test_batch_edit_cancelled(
    _mock_input: MagicMock, mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch edit cancelled by user."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "cancelled" in captured.out


def test_batch_edit_ioerror(mock_manager: MagicMock, user_with_tasks: User) -> None:
    """Test batch edit with IOError during save."""
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=True,
        verbose=False,
    )

    with pytest.raises(SystemExit):
        handle_batch_edit(args, mock_manager, user_with_tasks)


# --- Batch Complete Tests ---


@patch("builtins.input", return_value="y")
def test_batch_complete_project_filter(
    _mock_input: MagicMock, mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch complete with project filter."""
    args = Namespace(
        status="active",
        project="Career",
        tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    # Check that Career tasks are completed
    career_tasks = [t for t in user_with_tasks.tasks if t.project == "Career"]
    for task in career_tasks:
        assert task.is_complete

    captured = capsys.readouterr()
    assert "Completed" in captured.out


def test_batch_complete_with_yes_flag(
    mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch complete with --yes flag."""
    args = Namespace(
        status="active",
        project="Fitness",
        tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "Completed" in captured.out


def test_batch_complete_no_incomplete_tasks(
    mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch complete when all matching tasks are already complete."""
    args = Namespace(
        status="completed",
        project=None,
        tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "No incomplete tasks" in captured.out


def test_batch_complete_no_user(mock_manager: MagicMock, capsys: Any) -> None:
    """Test batch complete with no user."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        yes=True,
        verbose=False,
    )

    with pytest.raises(SystemExit):
        handle_batch_complete(args, mock_manager, None)

    captured = capsys.readouterr()
    assert "User not found" in captured.out


@patch("builtins.input", return_value="n")
def test_batch_complete_cancelled(
    _mock_input: MagicMock,
    mock_manager: MagicMock,
    user_with_tasks: User,
    capsys: Any,
) -> None:
    """Test batch complete cancelled by user."""
    args = Namespace(
        status="active",
        project=None,
        tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "cancelled" in captured.out


def test_batch_complete_ioerror(mock_manager: MagicMock, user_with_tasks: User) -> None:
    """Test batch complete with IOError during save."""
    mock_manager.save_user.side_effect = IOError("Save failed")
    args = Namespace(
        status="active",
        project="Career",
        tag=None,
        yes=True,
        verbose=False,
    )

    with pytest.raises(SystemExit):
        handle_batch_complete(args, mock_manager, user_with_tasks)


def test_batch_complete_no_matching_tasks(
    mock_manager: MagicMock, user_with_tasks: User, capsys: Any
) -> None:
    """Test batch complete when no tasks match filter."""
    args = Namespace(
        status="active",
        project="NonexistentProject",
        tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_not_called()
    captured = capsys.readouterr()
    assert "No incomplete tasks" in captured.out


@patch("builtins.input", return_value="y")
def test_batch_edit_more_than_5_tasks(
    _mock_input: MagicMock, mock_manager: MagicMock, capsys: Any
) -> None:
    """Test batch edit shows '... and X more' for more than 5 tasks."""
    # Create user with 7 active tasks
    user = User(username="testuser")
    now = datetime.now()
    for i in range(7):
        task = Task(
            id=f"task-{i:03d}",
            title=f"Task number {i}",
            creation_date=now,
            project="TestProject",
        )
        user.tasks.append(task)

    args = Namespace(
        status="active",
        project="TestProject",
        tag=None,
        set_priority="High",
        set_difficulty=None,
        set_project=None,
        add_tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_edit(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "... and 2 more" in captured.out


@patch("builtins.input", return_value="y")
def test_batch_complete_more_than_5_tasks(
    _mock_input: MagicMock, mock_manager: MagicMock, capsys: Any
) -> None:
    """Test batch complete shows '... and X more' for more than 5 tasks."""
    # Create user with 7 active tasks
    user = User(username="testuser")
    now = datetime.now()
    for i in range(7):
        task = Task(
            id=f"task-{i:03d}",
            title=f"Task number {i}",
            creation_date=now,
            project="TestProject",
        )
        user.tasks.append(task)

    args = Namespace(
        status="active",
        project="TestProject",
        tag=None,
        yes=False,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "... and 2 more" in captured.out


@patch("motido.cli.main.load_scoring_config")
def test_batch_complete_without_scoring_config(
    mock_load_scoring: MagicMock,
    mock_manager: MagicMock,
    user_with_tasks: User,
    capsys: Any,
) -> None:
    """Test batch complete when scoring config fails to load."""
    mock_load_scoring.side_effect = ValueError("Config not found")
    args = Namespace(
        status="active",
        project="Career",
        tag=None,
        yes=True,
        verbose=False,
    )

    handle_batch_complete(args, mock_manager, user_with_tasks)

    mock_manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    # Should just show completed count without XP
    assert "Completed" in captured.out
    assert "task(s)" in captured.out
