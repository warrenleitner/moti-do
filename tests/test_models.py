import pytest
import uuid
from motido.core.models import Task, User

# --- Task Tests ---

def test_task_initialization():
    """Test that a Task object is initialized correctly."""
    desc = "Test task description"
    task = Task(description=desc)
    assert task.description == desc
    assert isinstance(task.id, str)
    # Check if the ID looks like a UUID (basic check)
    assert len(task.id) == 36 # Standard UUID length
    try:
        uuid.UUID(task.id) # Validate it's a proper UUID
    except ValueError:
        pytest.fail(f"Task ID '{task.id}' is not a valid UUID.")

def test_task_str_representation():
    """Test the string representation of a Task."""
    desc = "Another task"
    task = Task(description=desc)
    expected_str = f"ID: {task.id[:8]} | Description: {desc}"
    assert str(task) == expected_str

# --- User Fixtures ---

@pytest.fixture
def sample_tasks():
    """Provides a list of sample tasks for testing."""
    return [
        Task(description="Task 1", id="abc12345-mock-uuid-1"),
        Task(description="Task 2", id="def67890-mock-uuid-2"),
        Task(description="Task 3", id="abc54321-mock-uuid-3"), # Shares prefix with Task 1
    ]

@pytest.fixture
def user_with_tasks(sample_tasks):
    """Provides a User instance populated with sample tasks."""
    user = User(username="testuser")
    for task in sample_tasks:
        user.add_task(task)
    return user

@pytest.fixture
def empty_user():
    """Provides an empty User instance."""
    return User(username="emptyuser")

# --- User Tests ---

def test_user_initialization():
    """Test that a User object is initialized correctly."""
    username = "tester"
    user = User(username=username)
    assert user.username == username
    assert user.tasks == []

def test_user_add_task(empty_user):
    """Test adding a task to a user."""
    task = Task(description="New task")
    empty_user.add_task(task)
    assert len(empty_user.tasks) == 1
    assert empty_user.tasks[0] == task

def test_user_remove_task_existing(user_with_tasks, sample_tasks):
    """Test removing an existing task by its full ID."""
    task_to_remove_id = sample_tasks[1].id # Task 2 ID
    assert len(user_with_tasks.tasks) == 3
    removed = user_with_tasks.remove_task(task_to_remove_id)
    assert removed is True
    assert len(user_with_tasks.tasks) == 2
    assert task_to_remove_id not in [t.id for t in user_with_tasks.tasks]
    # Check that the other tasks remain
    assert sample_tasks[0] in user_with_tasks.tasks
    assert sample_tasks[2] in user_with_tasks.tasks

def test_user_remove_task_non_existing(user_with_tasks):
    """Test removing a task that doesn't exist."""
    non_existent_id = str(uuid.uuid4())
    initial_task_count = len(user_with_tasks.tasks)
    removed = user_with_tasks.remove_task(non_existent_id)
    assert removed is False
    assert len(user_with_tasks.tasks) == initial_task_count # No change

def test_user_find_task_by_full_id(user_with_tasks, sample_tasks):
    """Test finding a task by its full ID."""
    task_to_find = sample_tasks[0]
    found_task = user_with_tasks.find_task_by_id(task_to_find.id)
    assert found_task == task_to_find

def test_user_find_task_by_unique_partial_id(user_with_tasks, sample_tasks):
    """Test finding a task by a unique partial ID prefix."""
    task_to_find = sample_tasks[1] # Task 2
    partial_id = task_to_find.id[:5] # Use first 5 chars: "def67"
    found_task = user_with_tasks.find_task_by_id(partial_id)
    assert found_task == task_to_find

def test_user_find_task_by_ambiguous_partial_id(user_with_tasks):
    """Test finding a task by an ambiguous partial ID prefix raises ValueError."""
    partial_id = "abc" # Matches Task 1 and Task 3
    with pytest.raises(ValueError) as excinfo:
        user_with_tasks.find_task_by_id(partial_id)
    assert f"Ambiguous ID prefix '{partial_id}'" in str(excinfo.value)

def test_user_find_task_by_non_existent_id(user_with_tasks):
    """Test finding a task by an ID prefix that doesn't match any task."""
    non_existent_prefix = "xyz"
    found_task = user_with_tasks.find_task_by_id(non_existent_prefix)
    assert found_task is None

def test_user_find_task_in_empty_list(empty_user):
    """Test finding a task when the user has no tasks."""
    found_task = empty_user.find_task_by_id("any_id")
    assert found_task is None

def test_user_find_task_by_empty_string(user_with_tasks):
    """Test finding a task with an empty string (should be ambiguous if >1 task)."""
    with pytest.raises(ValueError) as excinfo:
        user_with_tasks.find_task_by_id("")
    assert f"Ambiguous ID prefix ''" in str(excinfo.value)

def test_user_find_task_by_empty_string_single_task():
    """Test finding a task with an empty string when only one task exists."""
    user = User(username="single_task_user")
    task = Task(description="Only task", id="single123")
    user.add_task(task)
    found_task = user.find_task_by_id("")
    assert found_task == task

def test_user_find_task_by_empty_string_no_tasks(empty_user):
    """Test finding a task with an empty string when no tasks exist."""
    found_task = empty_user.find_task_by_id("")
    assert found_task is None 