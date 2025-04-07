"""Tests for the update functionality of JsonDataManager."""

import os
from typing import Any, Dict, Tuple

import pytest

from motido.core.models import Task, User
from motido.data.json_manager import (
    DATA_DIR,
    DEFAULT_USERNAME,
    USERS_FILE,
    JsonDataManager,
)

# mypy: disable-error-code="assignment"
# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_config_path(mocker: Any) -> Tuple[str, str, str]:
    """Mocks get_config_path to return a predictable directory."""
    mock_path = "/fake/config/dir/config.json"
    mocker.patch("motido.data.json_manager.get_config_path", return_value=mock_path)
    # Expected data directory based on the mocked config path
    expected_data_dir = "/fake/config/dir/" + DATA_DIR
    expected_data_file = os.path.join(expected_data_dir, USERS_FILE)
    return mock_path, expected_data_dir, expected_data_file


@pytest.fixture
def manager() -> JsonDataManager:
    """Provides a JsonDataManager instance with mocked config path."""
    # Initialization uses the mocked get_config_path via mock_config_path fixture
    return JsonDataManager()


@pytest.fixture
def sample_user() -> User:
    """Provides a sample User object."""
    user = User(username=DEFAULT_USERNAME)
    user.add_task(Task(description="Task A", id="uuid-a"))
    user.add_task(Task(description="Task B", id="uuid-b"))
    return user


@pytest.fixture
def sample_user_data(sample_user: User) -> Dict[str, Dict[str, Any]]:
    """Provides the dictionary representation of sample_user."""
    return {
        sample_user.username: {
            "username": sample_user.username,
            "tasks": [
                {"id": "uuid-a", "description": "Task A"},
                {"id": "uuid-b", "description": "Task B"},
            ],
        }
    }


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
    updated_user.tasks = sample_user.tasks + [Task(description="Task C", id="uuid-c")]

    mock_read = mocker.patch.object(manager, "_read_data", return_value=initial_data)
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.save_user(updated_user)

    mock_read.assert_called_once()

    # Expected data after saving the updated user
    task_a = {"id": "uuid-a", "description": "Task A"}
    task_b = {"id": "uuid-b", "description": "Task B"}
    task_c = {"id": "uuid-c", "description": "Task C"}
    expected_tasks_data = [task_a, task_b, task_c]

    expected_user_data = {
        "username": updated_user.username,
        "tasks": expected_tasks_data,
    }
    expected_final_data = {  # type: ignore[assignment]
        updated_user.username: expected_user_data
    }

    mock_write.assert_called_once_with(expected_final_data)
