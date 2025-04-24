"""Tests for the core application models (Task and User)."""

import uuid
from datetime import datetime
from typing import List

import pytest

from motido.core.models import Priority, Task, User

# pylint: disable=redefined-outer-name
# This disables warnings for pytest fixtures used as function parameters

# --- Task Tests ---


def test_task_initialization() -> None:
    """Test that a Task object is initialized correctly."""
    desc = "Test task description"
    task = Task(description=desc, creation_date=datetime.now())
    assert task.description == desc
    assert isinstance(task.id, str)
    # Check if the ID looks like a UUID (basic check)
    assert len(task.id) == 36  # Standard UUID length
    try:
        uuid.UUID(task.id)  # Validate it's a proper UUID
    except ValueError:
        pytest.fail(f"Task ID '{task.id}' is not a valid UUID.")
    # Check default priority
    assert task.priority == Priority.LOW


def test_task_initialization_with_priority() -> None:
    """Test that a Task object is initialized correctly with a specified priority."""
    desc = "Task with custom priority"
    priority = Priority.HIGH
    task = Task(description=desc, priority=priority, creation_date=datetime.now())
    assert task.description == desc
    assert task.priority == Priority.HIGH


def test_task_str_representation() -> None:
    """Test the string representation of a Task."""
    desc = "Another task"
    task = Task(description=desc, creation_date=datetime.now())
    # Format creation_date as YYYY-MM-DD HH:MM:SS
    formatted_date = task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
    expected_str = (
        f"ID: {task.id[:8]} | Priority: {task.priority.emoji()} "
        f"{task.priority.value} | Created: {formatted_date} | Description: {desc}"
    )
    assert str(task) == expected_str


def test_priority_emoji() -> None:
    """Test that each priority level returns the correct emoji."""
    assert Priority.TRIVIAL.emoji() == "🔹"  # Blue diamond
    assert Priority.LOW.emoji() == "🟢"  # Green circle
    assert Priority.MEDIUM.emoji() == "🟡"  # Yellow circle
    assert Priority.HIGH.emoji() == "🟠"  # Orange circle
    assert Priority.DEFCON_ONE.emoji() == "🔴"  # Red circle


def test_priority_display_style() -> None:
    """Test that each priority level returns the correct display style for rich."""
    assert Priority.TRIVIAL.display_style() == ""  # No color
    assert Priority.LOW.display_style() == "green"
    assert Priority.MEDIUM.display_style() == "yellow"
    assert Priority.HIGH.display_style() == "orange1"
    assert Priority.DEFCON_ONE.display_style() == "red"


# --- User Fixtures ---


@pytest.fixture
def sample_tasks() -> List[Task]:
    """Provides a list of sample tasks for testing."""
    return [
        Task(
            description="Task 1",
            creation_date=datetime.now(),
            id="abc12345-mock-uuid-1",
            priority=Priority.LOW,
        ),
        Task(
            description="Task 2",
            creation_date=datetime.now(),
            id="def67890-mock-uuid-2",
            priority=Priority.MEDIUM,
        ),
        Task(
            description="Task 3",
            creation_date=datetime.now(),
            id="abc54321-mock-uuid-3",
            priority=Priority.HIGH,
        ),  # Shares prefix with Task 1
    ]


@pytest.fixture
def empty_user() -> User:
    """Provides an empty User for testing."""
    return User(username="empty_user")


@pytest.fixture
def user_with_tasks(sample_tasks: List[Task]) -> User:
    """Provides a User with predefined tasks for testing."""
    user = User(username="test_user")
    for task in sample_tasks:
        user.add_task(task)
    return user


# --- User Tests ---


def test_user_initialization() -> None:
    """Test that a User object is initialized correctly."""
    username = "tester"
    user = User(username=username)
    assert user.username == username
    assert user.tasks == []


def test_user_add_task(empty_user: User) -> None:
    """Test adding a task to a user."""
    task = Task(description="New task", creation_date=datetime.now())
    empty_user.add_task(task)
    assert len(empty_user.tasks) == 1
    assert empty_user.tasks[0] == task


def test_user_remove_task_existing(
    user_with_tasks: User, sample_tasks: List[Task]
) -> None:
    """Test removing an existing task by its full ID."""
    task_to_remove_id = sample_tasks[1].id  # Task 2 ID
    assert len(user_with_tasks.tasks) == 3
    removed = user_with_tasks.remove_task(task_to_remove_id)
    assert removed is True
    assert len(user_with_tasks.tasks) == 2
    assert task_to_remove_id not in [t.id for t in user_with_tasks.tasks]
    # Check that the other tasks remain
    assert sample_tasks[0] in user_with_tasks.tasks
    assert sample_tasks[2] in user_with_tasks.tasks


def test_user_remove_task_non_existing(user_with_tasks: User) -> None:
    """Test removing a task that doesn't exist."""
    non_existent_id = str(uuid.uuid4())
    initial_task_count = len(user_with_tasks.tasks)
    removed = user_with_tasks.remove_task(non_existent_id)
    assert removed is False
    assert len(user_with_tasks.tasks) == initial_task_count  # No change


def test_user_find_task_by_id_exact(
    user_with_tasks: User, sample_tasks: List[Task]
) -> None:
    """Test finding a task by its exact ID."""
    task_id = sample_tasks[0].id
    found_task = user_with_tasks.find_task_by_id(task_id)
    assert found_task is not None
    assert found_task.id == task_id


def test_user_find_task_by_id_partial(
    user_with_tasks: User, sample_tasks: List[Task]
) -> None:
    """Test finding a task by a partial ID prefix."""
    # Using just the first few chars of the ID
    task_id_prefix = sample_tasks[0].id[:4]
    found_task = user_with_tasks.find_task_by_id(task_id_prefix)
    assert found_task is not None
    assert found_task.id == sample_tasks[0].id
    # Verify it has the correct priority
    assert found_task.priority == sample_tasks[0].priority


def test_user_find_task_by_id_non_existing(user_with_tasks: User) -> None:
    """Test finding a task with an ID that doesn't exist."""
    non_existent_prefix = "xyz"  # Assuming no task ID starts with this
    found_task = user_with_tasks.find_task_by_id(non_existent_prefix)
    assert found_task is None


def test_user_find_task_by_id_ambiguous(user_with_tasks: User) -> None:
    """Test finding a task with an ambiguous ID prefix (matches multiple tasks)."""
    # sample_tasks has two tasks with IDs starting with "abc"
    ambiguous_prefix = "abc"
    with pytest.raises(ValueError) as excinfo:
        user_with_tasks.find_task_by_id(ambiguous_prefix)
    assert "Multiple tasks found" in str(excinfo.value)


def test_user_find_task_by_empty_string_single_task() -> None:
    """Test finding a task with an empty string when only one task exists."""
    user = User(username="single_task_user")
    task = Task(description="Only task", creation_date=datetime.now(), id="single123")
    user.add_task(task)
    found_task = user.find_task_by_id("")
    assert found_task == task


def test_user_find_task_by_empty_string_no_tasks(empty_user: User) -> None:
    """Test finding a task with an empty string when no tasks exist."""
    found_task = empty_user.find_task_by_id("")
    assert found_task is None
