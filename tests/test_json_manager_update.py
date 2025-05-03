"""Tests for the update functionality of JsonDataManager."""

from datetime import datetime
from typing import Any, Dict

from motido.core.models import Priority, Task, User
from motido.data.json_manager import JsonDataManager

# mypy: disable-error-code="assignment"
# pylint: disable=redefined-outer-name,too-many-locals

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
        Task(
            description="Task C",
            creation_date=datetime.now(),
            id="uuid-c",
            priority=Priority.LOW,
        )
    ]

    mock_read = mocker.patch.object(manager, "_read_data", return_value=initial_data)
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.save_user(updated_user)

    mock_read.assert_called_once()

    # Expected data after saving the updated user
    # Mock the creation_date string format for comparison
    creation_date_a = (
        sample_user.tasks[0].creation_date.strftime("%Y-%m-%d %H:%M:%S")
        if sample_user.tasks[0].creation_date
        else None
    )
    creation_date_b = (
        sample_user.tasks[1].creation_date.strftime("%Y-%m-%d %H:%M:%S")
        if sample_user.tasks[1].creation_date
        else None
    )
    creation_date_c = (
        updated_user.tasks[2].creation_date.strftime("%Y-%m-%d %H:%M:%S")
        if updated_user.tasks[2].creation_date
        else None
    )

    task_a = {
        "id": "uuid-a",
        "description": "Task A",
        "priority": "Low",
        "is_complete": False,
        "creation_date": creation_date_a,
    }
    task_b = {
        "id": "uuid-b",
        "description": "Task B",
        "priority": "Medium",
        "is_complete": False,
        "creation_date": creation_date_b,
    }
    task_c = {
        "id": "uuid-c",
        "description": "Task C",
        "priority": "Low",
        "is_complete": False,
        "creation_date": creation_date_c,
    }
    expected_tasks_data = [task_a, task_b, task_c]

    expected_user_data = {
        "username": updated_user.username,
        "tasks": expected_tasks_data,
    }
    expected_final_data = {  # type: ignore[assignment]
        updated_user.username: expected_user_data
    }

    mock_write.assert_called_once_with(expected_final_data)
