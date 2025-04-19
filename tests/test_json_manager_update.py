"""Tests for the update functionality of JsonDataManager."""

from typing import Any, Dict

from motido.core.models import Priority, Task, User
from motido.data.json_manager import JsonDataManager

# mypy: disable-error-code="assignment"
# pylint: disable=redefined-outer-name

# All fixtures are now imported from conftest.py:
# - mock_config_path
# - manager
# - sample_user
# - sample_user_data


def test_save_user_update_existing(
    manager: JsonDataManager,
    mocker: Any,
    sample_user: User,
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test saving a user that already exists, overwriting their data."""
    # Simulate existing data that will be overwritten
    initial_data = sample_user_data.copy()
    # Modify the user before saving (e.g., add a task)
    updated_user = User(username=sample_user.username)
    updated_user.tasks = sample_user.tasks + [
        Task(description="Task C", id="uuid-c", priority=Priority.LOW)
    ]

    mock_read = mocker.patch.object(manager, "_read_data", return_value=initial_data)
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.save_user(updated_user)

    mock_read.assert_called_once()

    # Expected data after saving the updated user
    task_a = {"id": "uuid-a", "description": "Task A", "priority": "Low"}
    task_b = {"id": "uuid-b", "description": "Task B", "priority": "Medium"}
    task_c = {"id": "uuid-c", "description": "Task C", "priority": "Low"}
    expected_tasks_data = [task_a, task_b, task_c]

    expected_user_data = {
        "username": updated_user.username,
        "tasks": expected_tasks_data,
    }
    expected_final_data = {  # type: ignore[assignment]
        updated_user.username: expected_user_data
    }

    mock_write.assert_called_once_with(expected_final_data)
