import json
import os
from typing import Any, Dict, Tuple
from unittest.mock import mock_open

import pytest

from motido.core.models import Task, User
from motido.data.json_manager import (
    DATA_DIR,
    DEFAULT_USERNAME,
    USERS_FILE,
    JsonDataManager,
)

# --- Fixtures ---


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
def manager(mock_config_path: Tuple[str, str, str]) -> JsonDataManager:
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


# --- Tests ---


def test_init_sets_data_path(
    manager: JsonDataManager, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test that __init__ correctly sets the _data_path attribute."""
    _, _, expected_data_file = mock_config_path
    assert manager._data_path == expected_data_file


def test_get_data_path_construction(
    manager: JsonDataManager, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test the internal _get_data_path constructs the path correctly."""
    # This is implicitly tested by test_init_sets_data_path,
    # but we can add an explicit check if needed, though it might be redundant.
    _, _, expected_data_file = mock_config_path
    assert manager._get_data_path() == expected_data_file


def test_ensure_data_dir_exists(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test that _ensure_data_dir_exists calls os.makedirs correctly."""
    mock_makedirs = mocker.patch("os.makedirs")
    _, expected_data_dir, _ = mock_config_path

    manager._ensure_data_dir_exists()

    mock_makedirs.assert_called_once_with(expected_data_dir, exist_ok=True)


def test_initialize_creates_file_if_not_exists(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test initialize creates and writes an empty JSON object if the file is new."""
    _, _, expected_data_file = mock_config_path
    mock_exists = mocker.patch("os.path.exists", return_value=False)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.initialize()

    mock_ensure_dir.assert_called_once()
    mock_exists.assert_called_once_with(expected_data_file)
    mock_write.assert_called_once_with({})  # Should write an empty dict


def test_initialize_does_nothing_if_exists(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test initialize does not write if the data file already exists."""
    _, _, expected_data_file = mock_config_path
    mock_exists = mocker.patch("os.path.exists", return_value=True)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.initialize()

    mock_ensure_dir.assert_called_once()
    mock_exists.assert_called_once_with(expected_data_file)
    mock_write.assert_not_called()


def test_read_data_file_not_exists(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test _read_data returns {} if the file doesn't exist."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=False)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")

    data = manager._read_data()

    mock_ensure_dir.assert_called_once()
    assert data == {}


def test_read_data_success(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test _read_data successfully reads and parses JSON data."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=True)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    mock_file_content = json.dumps(sample_user_data)
    m_open = mock_open(read_data=mock_file_content)
    mocker.patch("builtins.open", m_open)

    data = manager._read_data()

    mock_ensure_dir.assert_called_once()
    assert data == sample_user_data
    m_open.assert_called_once_with(expected_data_file, "r", encoding="utf-8")


def test_read_data_empty_file(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test _read_data returns {} for an empty file."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=True)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    m_open = mock_open(read_data="")  # Empty content
    mocker.patch("builtins.open", m_open)

    data = manager._read_data()

    mock_ensure_dir.assert_called_once()
    assert data == {}
    m_open.assert_called_once_with(expected_data_file, "r", encoding="utf-8")


def test_read_data_json_decode_error(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    capsys: Any,
) -> None:
    """Test _read_data handles JSONDecodeError gracefully."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=True)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    mocker.patch("builtins.open", mock_open(read_data="{invalid json"))
    # Mock json.loads directly to raise the error
    mocker.patch(
        "json.loads",
        side_effect=json.JSONDecodeError("Expecting value", "{invalid json", 0),
    )

    data = manager._read_data()

    mock_ensure_dir.assert_called_once()
    assert data == {}
    captured = capsys.readouterr()
    assert "Error reading data file" in captured.out
    assert "Expecting value" in captured.out


def test_read_data_io_error(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    capsys: Any,
) -> None:
    """Test _read_data handles IOError gracefully."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=True)
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    m_open = mock_open()
    m_open.side_effect = IOError("Permission denied")
    mocker.patch("builtins.open", m_open)

    data = manager._read_data()

    mock_ensure_dir.assert_called_once()
    assert data == {}
    captured = capsys.readouterr()
    assert "Error reading data file" in captured.out
    assert "Permission denied" in captured.out


def test_write_data_success(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test _write_data successfully opens file and dumps JSON."""
    _, _, expected_data_file = mock_config_path
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    mock_open_instance = mock_open()
    mocker.patch("builtins.open", mock_open_instance)
    mock_json_dump = mocker.patch("json.dump")

    manager._write_data(sample_user_data)

    mock_ensure_dir.assert_called_once()
    mock_open_instance.assert_called_once_with(
        expected_data_file, "w", encoding="utf-8"
    )
    mock_json_dump.assert_called_once_with(
        sample_user_data, mock_open_instance(), indent=4
    )


def test_write_data_io_error(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    sample_user_data: Dict[str, Dict[str, Any]],
    capsys: Any,
) -> None:
    """Test _write_data handles IOError during write."""
    _, _, expected_data_file = mock_config_path
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    m_open = mock_open()
    m_open.side_effect = IOError("Disk full")
    mocker.patch("builtins.open", m_open)
    mock_json_dump = mocker.patch("json.dump")  # To check it's not called

    manager._write_data(sample_user_data)

    mock_ensure_dir.assert_called_once()
    m_open.assert_called_once_with(expected_data_file, "w", encoding="utf-8")
    mock_json_dump.assert_not_called()  # Should fail before dumping
    captured = capsys.readouterr()
    assert "Error writing data file" in captured.out
    assert "Disk full" in captured.out


def test_load_user_success(
    manager: JsonDataManager,
    mocker: Any,
    sample_user: User,
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test loading an existing user successfully."""
    mock_read = mocker.patch.object(
        manager, "_read_data", return_value=sample_user_data
    )

    loaded_user = manager.load_user(sample_user.username)

    mock_read.assert_called_once()
    assert loaded_user is not None
    assert loaded_user.username == sample_user.username
    assert len(loaded_user.tasks) == len(sample_user.tasks)
    # Simple check: compare descriptions and IDs
    loaded_task_ids = {t.id for t in loaded_user.tasks}
    sample_task_ids = {t.id for t in sample_user.tasks}
    assert loaded_task_ids == sample_task_ids


def test_load_user_not_found(manager: JsonDataManager, mocker: Any) -> None:
    """Test loading a user that does not exist in the data."""
    mock_read = mocker.patch.object(
        manager, "_read_data", return_value={"other_user": {}}
    )  # Empty data or data for other users

    loaded_user = manager.load_user("non_existent_user")

    mock_read.assert_called_once()
    assert loaded_user is None


def test_load_user_deserialization_error(
    manager: JsonDataManager, mocker: Any, capsys: Any
) -> None:
    """Test load_user handles errors during Task deserialization."""
    corrupted_data = {
        DEFAULT_USERNAME: {
            "username": DEFAULT_USERNAME,
            "tasks": [
                {"id": "uuid-good"},  # Missing 'description'
                {"description": "Task Good", "id": "uuid-good-2"},
            ],
        }
    }
    mock_read = mocker.patch.object(manager, "_read_data", return_value=corrupted_data)

    loaded_user = manager.load_user(DEFAULT_USERNAME)

    mock_read.assert_called_once()
    assert loaded_user is None  # Should fail gracefully
    captured = capsys.readouterr()
    assert "Error deserializing user data" in captured.out
    # Check for TypeError message part related to missing args
    assert (
        "__init__() missing 1 required positional argument: 'description'"
        in captured.out
    )


def test_load_user_default_username(
    manager: JsonDataManager,
    mocker: Any,
    sample_user: User,
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test load_user uses DEFAULT_USERNAME when none is provided."""
    mock_read = mocker.patch.object(
        manager, "_read_data", return_value=sample_user_data
    )

    # Call load_user without username argument
    loaded_user = manager.load_user()

    mock_read.assert_called_once()
    assert loaded_user is not None
    assert loaded_user.username == DEFAULT_USERNAME  # Checks default was used


def test_save_user_new_user(
    manager: JsonDataManager, mocker: Any, sample_user: User
) -> None:
    """Test saving a user when the file initially has no data for them."""
    initial_data = {"other_user": {"username": "other_user", "tasks": []}}
    mock_read = mocker.patch.object(manager, "_read_data", return_value=initial_data)
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.save_user(sample_user)

    mock_read.assert_called_once()

    # Expected data after saving
    expected_tasks_data = [
        {"id": task.id, "description": task.description} for task in sample_user.tasks
    ]
    expected_user_data = {
        "username": sample_user.username,
        "tasks": expected_tasks_data,
    }
    expected_final_data = initial_data.copy()
    expected_final_data[sample_user.username] = expected_user_data  # type: ignore[assignment]

    mock_write.assert_called_once_with(expected_final_data)


def test_backend_type(manager: JsonDataManager) -> None:
    """Test the backend_type method returns 'json'."""
    assert manager.backend_type() == "json"
