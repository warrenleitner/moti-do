"""Tests for the depends CLI command."""

# pylint: disable=redefined-outer-name

import argparse
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_depends
from motido.core.models import Priority, Task, User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager


def create_mock_args(**kwargs: Any) -> argparse.Namespace:
    """Create a mock argparse Namespace."""
    return argparse.Namespace(**kwargs)


@pytest.fixture
def user_with_tasks() -> User:
    """Create a user with multiple tasks for dependency testing."""
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-aaaa-1111",
            priority=Priority.LOW,
        )
    )
    user.add_task(
        Task(
            title="Task B",
            creation_date=test_date,
            id="uuid-bbbb-2222",
            priority=Priority.MEDIUM,
        )
    )
    user.add_task(
        Task(
            title="Task C",
            creation_date=test_date,
            id="uuid-cccc-3333",
            priority=Priority.HIGH,
        )
    )
    return user


# --- Test Add Dependency ---


def test_add_dependency_success(user_with_tasks: User) -> None:
    """Test successfully adding a dependency."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="uuid-bbbb"
    )

    handle_depends(args, manager, user_with_tasks)

    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    assert task_a is not None
    assert "uuid-bbbb-2222" in task_a.dependencies
    manager.save_user.assert_called_once_with(user_with_tasks)


def test_add_dependency_task_not_found(user_with_tasks: User, capsys: Any) -> None:
    """Test adding dependency when main task not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="nonexistent", depends_command="add", dependency_id="uuid-bbbb"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_add_dependency_dep_task_not_found(user_with_tasks: User, capsys: Any) -> None:
    """Test adding dependency when dependency task not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="nonexistent"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Dependency task" in captured.out
    assert "not found" in captured.out


def test_add_self_dependency_fails(user_with_tasks: User, capsys: Any) -> None:
    """Test that a task cannot depend on itself."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="uuid-aaaa"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "cannot depend on itself" in captured.out


def test_add_duplicate_dependency(user_with_tasks: User, capsys: Any) -> None:
    """Test adding a dependency that already exists."""
    manager = MagicMock(spec=DataManager)

    # Add the dependency first
    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    assert task_a is not None
    task_a.dependencies.append("uuid-bbbb-2222")

    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="uuid-bbbb"
    )

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "already depends on" in captured.out
    manager.save_user.assert_not_called()


def test_add_circular_dependency_fails(user_with_tasks: User, capsys: Any) -> None:
    """Test that circular dependencies are detected and prevented."""
    manager = MagicMock(spec=DataManager)

    # First, make B depend on A
    task_b = user_with_tasks.find_task_by_id("uuid-bbbb")
    assert task_b is not None
    task_b.dependencies.append("uuid-aaaa-1111")

    # Now try to make A depend on B (would create a cycle)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="uuid-bbbb"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "circular dependency" in captured.out


def test_add_missing_dependency_id(user_with_tasks: User, capsys: Any) -> None:
    """Test add without providing dependency_id."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa", depends_command="add", dependency_id=None)

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Dependency ID is required" in captured.out


# --- Test Remove Dependency ---


def test_remove_dependency_success(user_with_tasks: User, capsys: Any) -> None:
    """Test successfully removing a dependency."""
    manager = MagicMock(spec=DataManager)

    # First add a dependency
    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    assert task_a is not None
    task_a.dependencies.append("uuid-bbbb-2222")

    args = create_mock_args(
        id="uuid-aaaa", depends_command="remove", dependency_id="uuid-bbbb"
    )

    handle_depends(args, manager, user_with_tasks)

    assert "uuid-bbbb-2222" not in task_a.dependencies
    manager.save_user.assert_called_once_with(user_with_tasks)
    captured = capsys.readouterr()
    assert "no longer depends on" in captured.out


def test_remove_nonexistent_dependency(user_with_tasks: User, capsys: Any) -> None:
    """Test removing a dependency that doesn't exist."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="remove", dependency_id="uuid-bbbb"
    )

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "does not depend on" in captured.out
    manager.save_user.assert_not_called()


def test_remove_missing_dependency_id(user_with_tasks: User, capsys: Any) -> None:
    """Test remove without providing dependency_id."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="remove", dependency_id=None
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Dependency ID is required" in captured.out


def test_remove_dep_task_not_found(user_with_tasks: User, capsys: Any) -> None:
    """Test remove when dependency task not found."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(
        id="uuid-aaaa", depends_command="remove", dependency_id="nonexistent"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Dependency task" in captured.out
    assert "not found" in captured.out


# --- Test List Dependencies ---


def test_list_dependencies_empty(user_with_tasks: User, capsys: Any) -> None:
    """Test listing dependencies when there are none."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="uuid-aaaa", depends_command="list", dependency_id=None)

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "has no dependencies" in captured.out


def test_list_dependencies_with_items(user_with_tasks: User, capsys: Any) -> None:
    """Test listing dependencies when there are some."""
    manager = MagicMock(spec=DataManager)

    # Add dependencies
    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    assert task_a is not None
    task_a.dependencies.append("uuid-bbbb-2222")
    task_a.dependencies.append("uuid-cccc-3333")

    args = create_mock_args(id="uuid-aaaa", depends_command="list", dependency_id=None)

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "Dependencies for" in captured.out


def test_list_with_completed_dependency(user_with_tasks: User, capsys: Any) -> None:
    """Test listing dependencies shows completion status."""
    manager = MagicMock(spec=DataManager)

    # Add dependency and mark it complete
    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    task_b = user_with_tasks.find_task_by_id("uuid-bbbb")
    assert task_a is not None
    assert task_b is not None
    task_a.dependencies.append("uuid-bbbb-2222")
    task_b.is_complete = True

    args = create_mock_args(id="uuid-aaaa", depends_command="list", dependency_id=None)

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "Dependencies for" in captured.out


def test_list_with_deleted_dependency(user_with_tasks: User, capsys: Any) -> None:
    """Test listing dependencies when one has been deleted."""
    manager = MagicMock(spec=DataManager)

    # Add a fake dependency ID that doesn't exist
    task_a = user_with_tasks.find_task_by_id("uuid-aaaa")
    assert task_a is not None
    task_a.dependencies.append("uuid-deleted-9999")

    args = create_mock_args(id="uuid-aaaa", depends_command="list", dependency_id=None)

    handle_depends(args, manager, user_with_tasks)

    captured = capsys.readouterr()
    assert "Dependencies for" in captured.out
    # The table will show "uuid-del" as the truncated ID prefix
    assert "uuid-del" in captured.out


# --- Test No User ---


def test_depends_no_user(capsys: Any) -> None:
    """Test depends command fails gracefully when no user."""
    manager = MagicMock(spec=DataManager)
    args = create_mock_args(id="test", depends_command="list", dependency_id=None)

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, None)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "User not found" in captured.out


# --- Test IO Error ---


def test_add_dependency_io_error(user_with_tasks: User, capsys: Any) -> None:
    """Test handling IO error when saving."""
    manager = MagicMock(spec=DataManager)
    manager.save_user.side_effect = IOError("Disk full")

    args = create_mock_args(
        id="uuid-aaaa", depends_command="add", dependency_id="uuid-bbbb"
    )

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user_with_tasks)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error saving task" in captured.out


# --- Test ValueError (Ambiguous ID) ---


def test_ambiguous_task_id(capsys: Any) -> None:
    """Test handling ambiguous task ID prefix."""
    manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    # Add tasks with similar prefixes
    user.add_task(Task(title="Task 1", creation_date=test_date, id="uuid-same-1111"))
    user.add_task(Task(title="Task 2", creation_date=test_date, id="uuid-same-2222"))

    args = create_mock_args(id="uuid-same", depends_command="list", dependency_id=None)

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Error" in captured.out


# --- Test Transitive Circular Dependency ---


def test_add_transitive_circular_dependency_fails(capsys: Any) -> None:
    """Test that transitive circular dependencies are detected (A->B->C, then C->A)."""
    manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    # Create A->B->C chain
    user.add_task(Task(title="Task A", creation_date=test_date, id="uuid-a"))
    user.add_task(
        Task(
            title="Task B",
            creation_date=test_date,
            id="uuid-b",
            dependencies=["uuid-a"],
        )
    )
    user.add_task(
        Task(
            title="Task C",
            creation_date=test_date,
            id="uuid-c",
            dependencies=["uuid-b"],
        )
    )

    # Try to make A depend on C (would create A->C->B->A cycle)
    args = create_mock_args(id="uuid-a", depends_command="add", dependency_id="uuid-c")

    with pytest.raises(SystemExit) as exc_info:
        handle_depends(args, manager, user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "circular dependency" in captured.out


def test_cycle_detection_diamond_pattern_no_cycle(capsys: Any) -> None:
    """Test diamond dependency pattern where same node is visited via multiple paths.

    This tests the 'continue' branch in _would_create_cycle when a node is revisited.

    Structure: A→B→D, A→C→D (diamond with D at the bottom)
    Adding E→A should succeed (no cycle) but must traverse through D twice.
    """
    manager = MagicMock(spec=DataManager)
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)

    # D is the bottom of the diamond - no dependencies
    user.add_task(
        Task(title="Task D", creation_date=test_date, id="uuid-d", dependencies=[])
    )
    # B depends on D
    user.add_task(
        Task(
            title="Task B",
            creation_date=test_date,
            id="uuid-b",
            dependencies=["uuid-d"],
        )
    )
    # C depends on D
    user.add_task(
        Task(
            title="Task C",
            creation_date=test_date,
            id="uuid-c",
            dependencies=["uuid-d"],
        )
    )
    # A depends on both B and C (top of diamond)
    user.add_task(
        Task(
            title="Task A",
            creation_date=test_date,
            id="uuid-a",
            dependencies=["uuid-b", "uuid-c"],
        )
    )
    # E is a new task with no dependencies
    user.add_task(
        Task(title="Task E", creation_date=test_date, id="uuid-e", dependencies=[])
    )

    # Make E depend on A - no cycle, but cycle check will visit D via both B and C
    args = create_mock_args(id="uuid-e", depends_command="add", dependency_id="uuid-a")

    handle_depends(args, manager, user)

    # Dependency should be added successfully
    task_e = user.find_task_by_id("uuid-e")
    assert task_e is not None
    assert "uuid-a" in task_e.dependencies
    manager.save_user.assert_called_once()
    captured = capsys.readouterr()
    assert "now depends on" in captured.out
