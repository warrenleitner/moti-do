"""Tests for the core application models (Task and User)."""

import uuid
from datetime import date, datetime
from typing import List

import pytest

from motido.core.models import (  # Added Duration
    Difficulty,
    Duration,
    Priority,
    Project,
    RecurrenceType,
    Tag,
    Task,
    User,
)

# pylint: disable=redefined-outer-name
# This disables warnings for pytest fixtures used as function parameters

# --- Task Tests ---


def test_task_initialization() -> None:
    """Test that a Task object is initialized correctly."""
    desc = "Test task description"
    task = Task(title=desc, creation_date=datetime.now())
    assert task.title == desc
    assert isinstance(task.id, str)
    # Check if the ID looks like a UUID (basic check)
    assert len(task.id) == 36  # Standard UUID length
    try:
        uuid.UUID(task.id)  # Validate it's a proper UUID
    except ValueError:
        pytest.fail(f"Task ID '{task.id}' is not a valid UUID.")
    # Check default priority
    assert task.priority == Priority.LOW
    # Check default difficulty
    assert task.difficulty == Difficulty.TRIVIAL
    # Check default duration
    assert task.duration == Duration.MINUSCULE
    # Check default is_complete status
    assert task.is_complete is False


def test_task_initialization_with_priority() -> None:
    """Test that a Task object is initialized correctly with a specified priority."""
    desc = "Task with custom priority"
    priority = Priority.HIGH
    task = Task(title=desc, priority=priority, creation_date=datetime.now())
    assert task.title == desc
    assert task.priority == Priority.HIGH
    # Ensure default difficulty is still set
    assert task.difficulty == Difficulty.TRIVIAL
    # Ensure default duration is still set
    assert task.duration == Duration.MINUSCULE


def test_task_initialization_with_difficulty() -> None:
    """Test that a Task object is initialized correctly with a specified difficulty."""
    desc = "Task with custom difficulty"
    difficulty = Difficulty.HIGH
    task = Task(title=desc, difficulty=difficulty, creation_date=datetime.now())
    assert task.title == desc
    assert task.difficulty == Difficulty.HIGH
    # Ensure default priority is still set
    assert task.priority == Priority.LOW
    # Ensure default duration is still set
    assert task.duration == Duration.MINUSCULE


def test_task_initialization_with_priority_and_difficulty() -> None:
    """Test Task initialization with both priority and difficulty specified."""
    desc = "Task with custom priority and difficulty"
    priority = Priority.MEDIUM
    difficulty = Difficulty.LOW
    task = Task(
        title=desc,
        priority=priority,
        difficulty=difficulty,
        creation_date=datetime.now(),
    )
    assert task.title == desc
    assert task.priority == priority
    assert task.difficulty == difficulty
    # Ensure default duration is still set
    assert task.duration == Duration.MINUSCULE


def test_task_initialization_with_duration() -> None:
    """Test that a Task object is initialized correctly with a specified duration."""
    desc = "Task with custom duration"
    duration = Duration.LONG
    task = Task(title=desc, duration=duration, creation_date=datetime.now())
    assert task.title == desc
    assert task.duration == Duration.LONG
    # Ensure default priority is still set
    assert task.priority == Priority.LOW
    # Ensure default difficulty is still set
    assert task.difficulty == Difficulty.TRIVIAL


def test_task_initialization_with_all_fields() -> None:
    """Test Task initialization with priority, difficulty, and duration specified."""
    desc = "Task with all fields custom"
    priority = Priority.HIGH
    difficulty = Difficulty.MEDIUM
    duration = Duration.SHORT
    task = Task(
        title=desc,
        priority=priority,
        difficulty=difficulty,
        duration=duration,
        creation_date=datetime.now(),
    )
    assert task.title == desc
    assert task.priority == priority
    assert task.difficulty == difficulty
    assert task.duration == duration


def test_task_str_representation() -> None:
    """Test the string representation of a Task."""
    desc = "Another task"
    task = Task(title=desc, creation_date=datetime.now())
    # Format creation_date as YYYY-MM-DD HH:MM:SS
    formatted_date = task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
    expected_str = (
        f"[ ] ID: {task.id[:8]} | Priority: {task.priority.emoji()} "
        f"{task.priority.value} | Duration: {task.duration.emoji()} "
        f"{task.duration.value} | Created: {formatted_date} | Title: {desc}"
    )
    assert str(task) == expected_str


def test_task_str_representation_completed() -> None:
    """Test the string representation of a completed Task."""
    desc = "Completed task"
    task = Task(title=desc, creation_date=datetime.now(), is_complete=True)
    # Format creation_date as YYYY-MM-DD HH:MM:SS
    formatted_date = task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
    expected_str = (
        f"[✓] ID: {task.id[:8]} | Priority: {task.priority.emoji()} "
        f"{task.priority.value} | Duration: {task.duration.emoji()} "
        f"{task.duration.value} | Created: {formatted_date} | Title: {desc}"
    )
    assert str(task) == expected_str


def test_task_initialization_with_is_complete() -> None:
    """Test that a Task object is initialized correctly with is_complete set."""
    desc = "Task with is_complete=True"
    task = Task(title=desc, creation_date=datetime.now(), is_complete=True)
    assert task.title == desc
    assert task.is_complete is True
    # Ensure other defaults are still set
    assert task.priority == Priority.LOW
    assert task.difficulty == Difficulty.TRIVIAL
    assert task.duration == Duration.MINUSCULE


def test_priority_emoji() -> None:
    """Test that each priority level returns the correct emoji."""
    assert Priority.TRIVIAL.emoji() == "🔹"  # Blue diamond
    assert Priority.LOW.emoji() == "🟢"  # Green circle
    assert Priority.MEDIUM.emoji() == "🟡"  # Yellow circle
    assert Priority.HIGH.emoji() == "🟠"  # Orange circle
    assert Priority.DEFCON_ONE.emoji() == "🔴"  # Red circle


def test_priority_display_style() -> None:
    """Test that each priority level returns the correct display style for rich."""
    assert Priority.TRIVIAL.display_style() == "teal"  # Changed from no color to teal
    assert Priority.LOW.display_style() == "green"
    assert Priority.MEDIUM.display_style() == "yellow"
    assert Priority.HIGH.display_style() == "orange1"
    assert Priority.DEFCON_ONE.display_style() == "red"


def test_difficulty_enum_values() -> None:
    """Test the string values of the Difficulty enum."""
    assert Difficulty.TRIVIAL.value == "Trivial"
    assert Difficulty.LOW.value == "Low"
    assert Difficulty.MEDIUM.value == "Medium"
    assert Difficulty.HIGH.value == "High"
    assert Difficulty.HERCULEAN.value == "Herculean"


def test_difficulty_emoji() -> None:
    """Test that each difficulty level returns the correct emoji."""
    assert Difficulty.TRIVIAL.emoji() == "🍭"  # Lollipop
    assert Difficulty.LOW.emoji() == "🪶"  # Feather
    assert Difficulty.MEDIUM.emoji() == "🧱"  # Brick
    assert Difficulty.HIGH.emoji() == "🧗"  # Person climbing
    assert Difficulty.HERCULEAN.emoji() == "🦾"  # Mechanical arm


def test_difficulty_display_style() -> None:
    """Test that each difficulty level returns the correct display style for rich."""
    assert Difficulty.TRIVIAL.display_style() == "teal"
    assert Difficulty.LOW.display_style() == "green"
    assert Difficulty.MEDIUM.display_style() == "yellow"
    assert Difficulty.HIGH.display_style() == "orange1"
    assert Difficulty.HERCULEAN.display_style() == "red"


def test_duration_enum_values() -> None:
    """Test the string values of the Duration enum."""
    assert Duration.MINUSCULE.value == "Minuscule"
    assert Duration.SHORT.value == "Short"
    assert Duration.MEDIUM.value == "Medium"
    assert Duration.LONG.value == "Long"
    assert Duration.ODYSSEYAN.value == "Odysseyan"


def test_duration_emoji() -> None:
    """Test that each duration level returns the correct emoji."""
    assert Duration.MINUSCULE.emoji() == "💨"  # Wind blowing
    assert Duration.SHORT.emoji() == "⏳"  # Hourglass not done
    assert Duration.MEDIUM.emoji() == "🕰️"  # Mantelpiece clock
    assert Duration.LONG.emoji() == "⏱️"  # Stopwatch
    assert Duration.ODYSSEYAN.emoji() == "♾️"  # Infinity


def test_duration_display_style() -> None:
    """Test that each duration level returns the correct display style for rich."""
    assert Duration.MINUSCULE.display_style() == "teal"
    assert Duration.SHORT.display_style() == "green"
    assert Duration.MEDIUM.display_style() == "yellow"
    assert Duration.LONG.display_style() == "orange1"
    assert Duration.ODYSSEYAN.display_style() == "red"


def test_priority_display_style_updated() -> None:
    """Test that Priority.TRIVIAL now returns 'teal' for display style."""
    assert Priority.TRIVIAL.display_style() == "teal"


# --- User Fixtures ---


@pytest.fixture
def sample_tasks() -> List[Task]:
    """Provides a list of sample tasks for testing."""
    return [
        Task(
            title="Task 1",
            creation_date=datetime.now(),
            id="abc12345-mock-uuid-1",
            priority=Priority.LOW,
            difficulty=Difficulty.TRIVIAL,
            duration=Duration.MINUSCULE,
            is_complete=False,
        ),
        Task(
            title="Task 2",
            creation_date=datetime.now(),
            id="def67890-mock-uuid-2",
            priority=Priority.MEDIUM,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.SHORT,
            is_complete=True,  # One completed task for testing
        ),
        Task(
            title="Task 3",
            creation_date=datetime.now(),
            id="abc54321-mock-uuid-3",
            priority=Priority.HIGH,
            difficulty=Difficulty.TRIVIAL,
            duration=Duration.MEDIUM,
            is_complete=False,
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
    # Verify last_processed_date defaults to today
    assert user.last_processed_date == date.today()


def test_user_initialization_with_last_processed_date() -> None:
    """Test that a User can be initialized with a specific last_processed_date."""
    username = "tester"
    test_date = date(2025, 1, 15)
    user = User(username=username, last_processed_date=test_date)
    assert user.username == username
    assert user.last_processed_date == test_date


def test_user_add_task(empty_user: User) -> None:
    """Test adding a task to a user."""
    task = Task(title="New task", creation_date=datetime.now())
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
    task = Task(title="Only task", creation_date=datetime.now(), id="single123")
    user.add_task(task)
    found_task = user.find_task_by_id("")
    assert found_task == task


def test_user_find_task_by_empty_string_no_tasks(empty_user: User) -> None:
    """Test finding a task with an empty string when no tasks exist."""
    found_task = empty_user.find_task_by_id("")
    assert found_task is None


def test_task_initialization_as_habit() -> None:
    """Test that a Task object can be initialized as a habit."""
    desc = "Habit task"
    task = Task(
        title=desc,
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
    )
    assert task.is_habit is True
    assert task.recurrence_rule == "daily"
    assert task.recurrence_type == RecurrenceType.STRICT
    assert task.streak_current == 0
    assert task.streak_best == 0


# --- Tag Tests ---


def test_tag_initialization() -> None:
    """Test that a Tag object is initialized correctly."""
    tag = Tag(name="urgent")
    assert tag.name == "urgent"
    assert tag.color == "#808080"  # Default gray
    assert len(tag.id) == 36  # UUID length


def test_tag_with_custom_color() -> None:
    """Test Tag with custom color."""
    tag = Tag(name="important", color="#FF0000")
    assert tag.name == "important"
    assert tag.color == "#FF0000"


# --- Project Tests ---


def test_project_initialization() -> None:
    """Test that a Project object is initialized correctly."""
    project = Project(name="Work")
    assert project.name == "Work"
    assert project.color == "#4A90D9"  # Default blue
    assert len(project.id) == 36  # UUID length


def test_project_with_custom_color() -> None:
    """Test Project with custom color."""
    project = Project(name="Personal", color="#00FF00")
    assert project.name == "Personal"
    assert project.color == "#00FF00"


# --- User Tag/Project Registry Tests ---


def test_user_find_tag_by_name(empty_user: User) -> None:
    """Test finding a tag by name."""
    tag = Tag(name="urgent", color="#FF0000")
    empty_user.defined_tags.append(tag)

    found = empty_user.find_tag_by_name("urgent")
    assert found is not None
    assert found.name == "urgent"
    assert found.color == "#FF0000"


def test_user_find_tag_by_name_case_insensitive(empty_user: User) -> None:
    """Test finding a tag by name is case-insensitive."""
    tag = Tag(name="URGENT", color="#FF0000")
    empty_user.defined_tags.append(tag)

    found = empty_user.find_tag_by_name("urgent")
    assert found is not None
    assert found.name == "URGENT"


def test_user_find_tag_by_name_not_found(empty_user: User) -> None:
    """Test finding a tag that doesn't exist returns None."""
    found = empty_user.find_tag_by_name("nonexistent")
    assert found is None


def test_user_find_project_by_name(empty_user: User) -> None:
    """Test finding a project by name."""
    project = Project(name="Work", color="#0000FF")
    empty_user.defined_projects.append(project)

    found = empty_user.find_project_by_name("Work")
    assert found is not None
    assert found.name == "Work"
    assert found.color == "#0000FF"


def test_user_find_project_by_name_case_insensitive(empty_user: User) -> None:
    """Test finding a project by name is case-insensitive."""
    project = Project(name="PERSONAL", color="#00FF00")
    empty_user.defined_projects.append(project)

    found = empty_user.find_project_by_name("personal")
    assert found is not None
    assert found.name == "PERSONAL"


def test_user_find_project_by_name_not_found(empty_user: User) -> None:
    """Test finding a project that doesn't exist returns None."""
    found = empty_user.find_project_by_name("nonexistent")
    assert found is None


def test_user_get_or_create_tag_new(empty_user: User) -> None:
    """Test get_or_create_tag creates a new tag with auto-assigned color."""
    tag = empty_user.get_or_create_tag("urgent")
    assert tag.name == "urgent"
    assert tag.color == "#FF6B6B"  # First default color
    assert len(empty_user.defined_tags) == 1


def test_user_get_or_create_tag_existing(empty_user: User) -> None:
    """Test get_or_create_tag returns existing tag."""
    existing = Tag(name="urgent", color="#CUSTOM")
    empty_user.defined_tags.append(existing)

    tag = empty_user.get_or_create_tag("urgent")
    assert tag.color == "#CUSTOM"  # Keeps original color
    assert len(empty_user.defined_tags) == 1  # No new tag added


def test_user_get_or_create_project_new(empty_user: User) -> None:
    """Test get_or_create_project creates a new project with auto-assigned color."""
    project = empty_user.get_or_create_project("Work")
    assert project.name == "Work"
    assert project.color == "#6C5CE7"  # First default color
    assert len(empty_user.defined_projects) == 1


def test_user_get_or_create_project_existing(empty_user: User) -> None:
    """Test get_or_create_project returns existing project."""
    existing = Project(name="Work", color="#CUSTOM")
    empty_user.defined_projects.append(existing)

    project = empty_user.get_or_create_project("Work")
    assert project.color == "#CUSTOM"  # Keeps original color
    assert len(empty_user.defined_projects) == 1  # No new project added
