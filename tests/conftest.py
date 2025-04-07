"""Common fixtures for testing."""

import os
from typing import Any, Dict, Tuple

import pytest

# Import models from core.models
from motido.core.models import Task, User

# Import DEFAULT_USERNAME from abstraction layer
from motido.data.abstraction import DEFAULT_USERNAME

# Import constants from json_manager where they are defined
from motido.data.json_manager import DATA_DIR, USERS_FILE, JsonDataManager


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
def manager(
    mock_config_path: Tuple[str, str, str],  # pylint: disable=redefined-outer-name, unused-argument
) -> JsonDataManager:
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
def sample_user_data(
    sample_user: User,  # pylint: disable=redefined-outer-name
) -> Dict[str, Dict[str, Any]]:
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
