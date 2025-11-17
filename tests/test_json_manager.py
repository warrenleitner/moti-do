"""Tests for the JsonDataManager class."""

# pylint: disable=redefined-outer-name, protected-access

import json
from datetime import date
from typing import Any, Dict, Tuple
from unittest.mock import mock_open

import pytest

from motido.core.models import Priority, User
from motido.data.json_manager import (
    DEFAULT_USERNAME,
    JsonDataManager,
)

# --- Fixtures ---
# All fixtures are now imported from conftest.py:
# - mock_config_path
# - manager
# - sample_user
# - sample_user_data

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


def test_read_data_not_exists(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test _read_data returns {} if the file doesn't exist."""
    # pylint: disable=unused-argument
    mocker.patch("os.path.exists", return_value=False)

    data = manager._read_data()

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
    mock_file_content = json.dumps(sample_user_data)
    m_open = mock_open(read_data=mock_file_content)
    mocker.patch("builtins.open", m_open)

    data = manager._read_data()

    assert data == sample_user_data
    m_open.assert_called_once_with(expected_data_file, "r", encoding="utf-8")


def test_read_data_empty_file(
    manager: JsonDataManager, mocker: Any, mock_config_path: Tuple[str, str, str]
) -> None:
    """Test _read_data returns {} for an empty file."""
    _, _, expected_data_file = mock_config_path
    mocker.patch("os.path.exists", return_value=True)
    m_open = mock_open(read_data="")  # Empty content
    mocker.patch("builtins.open", m_open)

    data = manager._read_data()

    assert data == {}
    m_open.assert_called_once_with(expected_data_file, "r", encoding="utf-8")


def test_read_data_json_decode_error(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    capsys: Any,
) -> None:
    """Test _read_data handles JSONDecodeError gracefully."""
    # pylint: disable=unused-argument
    mocker.patch("os.path.exists", return_value=True)
    mocker.patch("builtins.open", mock_open(read_data="{invalid json"))
    # Mock json.loads directly to raise the error
    mocker.patch(
        "json.loads",
        side_effect=json.JSONDecodeError("Expecting value", "{invalid json", 0),
    )

    data = manager._read_data()

    assert data == {}
    captured = capsys.readouterr()
    assert "Error decoding JSON data" in captured.out


def test_read_data_io_error(
    manager: JsonDataManager,
    mocker: Any,
    mock_config_path: Tuple[str, str, str],
    capsys: Any,
) -> None:
    """Test _read_data handles IOError gracefully."""
    # pylint: disable=unused-argument
    mocker.patch("os.path.exists", return_value=True)
    error_message = "Permission denied"

    # Patch json.load to raise IOError
    mocker.patch("builtins.open", mock_open())  # Keep open working
    mock_json_load = mocker.patch("json.load")
    mock_json_load.side_effect = IOError(error_message)

    data = manager._read_data()

    assert data == {}
    captured = capsys.readouterr()
    assert f"Error reading data file: {error_message}" in captured.out


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
        sample_user_data, mock_open_instance(), indent=2
    )


def test_write_data_io_error(
    manager: JsonDataManager,
    mocker: Any,
    sample_user_data: Dict[str, Dict[str, Any]],
    capsys: Any,
) -> None:
    """Test _write_data handles IOError during write."""
    mock_ensure_dir = mocker.patch.object(manager, "_ensure_data_dir_exists")
    m_open = mock_open()
    m_open.side_effect = IOError("Disk full")
    mocker.patch("builtins.open", m_open)
    mock_json_dump = mocker.patch("json.dump")  # To check it's not called

    # The IOError should be re-raised by _write_data
    with pytest.raises(IOError) as excinfo:
        manager._write_data(sample_user_data)

    assert "Disk full" in str(excinfo.value)

    mock_ensure_dir.assert_called_once()
    mock_json_dump.assert_not_called()

    # Check error was logged
    captured = capsys.readouterr()
    assert "Error writing to data file: Disk full" in captured.out


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

    # Check that tasks are loaded with correct properties
    for i, task in enumerate(loaded_user.tasks):
        assert task.id == sample_user.tasks[i].id
        assert task.title == sample_user.tasks[i].title
        assert task.priority == sample_user.tasks[i].priority


def test_load_user_without_last_processed_date(
    manager: JsonDataManager, mocker: Any
) -> None:
    """Test loading a user without last_processed_date defaults to today."""
    # User data without last_processed_date (backwards compatibility)
    user_data_without_date = {
        "testuser": {
            "username": "testuser",
            "total_xp": 100,
            "tasks": [],
            # No last_processed_date field
        }
    }
    mock_read = mocker.patch.object(
        manager, "_read_data", return_value=user_data_without_date
    )

    loaded_user = manager.load_user("testuser")

    mock_read.assert_called_once()
    assert loaded_user is not None
    assert loaded_user.username == "testuser"
    assert loaded_user.total_xp == 100
    assert loaded_user.last_processed_date == date.today()


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
                {"title": "Task with missing ID"},  # Missing 'id'
                {"title": "Task Good", "id": "uuid-good-2"},
            ],
        }
    }
    mock_read = mocker.patch.object(manager, "_read_data", return_value=corrupted_data)

    # Use try/except to handle the KeyError
    try:
        manager.load_user(DEFAULT_USERNAME)
        assert False, "Expected KeyError was not raised"
    except KeyError:
        # Expected behavior - KeyError for missing 'id'
        pass

    mock_read.assert_called_once()

    # Check output message
    captured = capsys.readouterr()
    assert "Loading user 'default_user' from JSON..." in captured.out


def test_load_user_default_username(
    manager: JsonDataManager,
    mocker: Any,
    # pylint: disable=unused-argument
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
    initial_data: Dict[str, Dict[str, Any]] = {
        "other_user": {"username": "other_user", "tasks": []}
    }
    mock_read = mocker.patch.object(manager, "_read_data", return_value=initial_data)
    mock_write = mocker.patch.object(manager, "_write_data")

    manager.save_user(sample_user)

    mock_read.assert_called_once()

    # Expected data after saving
    expected_tasks_data = [
        {
            "id": task.id,
            "title": task.title,
            "priority": task.priority.value,
        }
        for task in sample_user.tasks
    ]
    expected_user_data = {
        "username": sample_user.username,
        "tasks": expected_tasks_data,
    }
    expected_final_data = initial_data.copy()
    # Add the new user data to the expected final data
    expected_final_data[sample_user.username] = expected_user_data

    # Verify _write_data was called with the expected data
    mock_write.assert_called_once()
    write_data = mock_write.call_args[0][0]

    # Verify the task data contains all expected fields including priority
    assert sample_user.username in write_data
    saved_tasks = write_data[sample_user.username]["tasks"]
    assert len(saved_tasks) == len(sample_user.tasks)

    for i, task in enumerate(sample_user.tasks):
        assert saved_tasks[i]["id"] == task.id
        assert saved_tasks[i]["title"] == task.title
        assert saved_tasks[i]["priority"] == task.priority.value


def test_backend_type(manager: JsonDataManager) -> None:
    """Test the backend_type method returns 'json'."""
    assert manager.backend_type() == "json"


def test_load_user_invalid_priority(
    manager: JsonDataManager,
    mocker: Any,
    sample_user_data: Dict[str, Dict[str, Any]],
    capsys: Any,
) -> None:
    """Test loading a user with an invalid priority value in a task."""
    # Modify sample data to have an invalid priority
    modified_data = {k: v.copy() for k, v in sample_user_data.items()}
    modified_data[DEFAULT_USERNAME]["tasks"][0]["priority"] = "InvalidPriority"

    mock_read = mocker.patch.object(manager, "_read_data", return_value=modified_data)

    loaded_user = manager.load_user(DEFAULT_USERNAME)

    mock_read.assert_called_once()
    assert loaded_user is not None
    assert len(loaded_user.tasks) == 2
    # Should default to LOW priority for the invalid task
    assert loaded_user.tasks[0].priority == Priority.LOW
    # The other task should have its correct priority
    assert loaded_user.tasks[1].priority == Priority.MEDIUM

    # Check warning was printed
    captured = capsys.readouterr()
    assert "Warning: Invalid priority 'InvalidPriority'" in captured.out


def test_load_user_missing_priority(
    manager: JsonDataManager,
    mocker: Any,
    sample_user_data: Dict[str, Dict[str, Any]],
) -> None:
    """Test loading a user with a task missing the priority field."""
    # Modify sample data to remove priority field from a task
    modified_data = {k: v.copy() for k, v in sample_user_data.items()}
    # Make a deep copy of tasks since we're modifying it
    modified_data[DEFAULT_USERNAME]["tasks"] = modified_data[DEFAULT_USERNAME][
        "tasks"
    ].copy()
    task_without_priority = {
        k: v
        for k, v in modified_data[DEFAULT_USERNAME]["tasks"][0].items()
        if k != "priority"
    }
    modified_data[DEFAULT_USERNAME]["tasks"][0] = task_without_priority

    mock_read = mocker.patch.object(manager, "_read_data", return_value=modified_data)

    loaded_user = manager.load_user(DEFAULT_USERNAME)

    mock_read.assert_called_once()
    assert loaded_user is not None
    assert len(loaded_user.tasks) == 2
    # Should default to LOW priority for task missing priority
    assert loaded_user.tasks[0].priority == Priority.LOW
    # The other task should have its correct priority
    assert loaded_user.tasks[1].priority == Priority.MEDIUM


def test_save_user_io_error(
    manager: JsonDataManager, mocker: Any, sample_user: User, capsys: Any
) -> None:
    """Test save_user handles IOError."""
    mock_read_data = mocker.patch.object(
        manager, "_read_data", return_value={"default_user": {}}
    )
    mock_write_data = mocker.patch.object(manager, "_write_data")
    mock_write_data.side_effect = IOError("Disk full")

    # The IOError should be re-raised by save_user
    with pytest.raises(IOError) as excinfo:
        manager.save_user(sample_user)

    assert "Disk full" in str(excinfo.value)

    mock_read_data.assert_called_once()
    mock_write_data.assert_called_once()

    # Check messages
    captured = capsys.readouterr()
    assert "Saving user 'default_user' to JSON..." in captured.out


def test_load_user_io_error_on_read(mocker: Any) -> None:
    """Test load_user handles generic IOError during file read."""
    manager = JsonDataManager()
    mock_print = mocker.patch("builtins.print")
    mocker.patch("os.path.exists", return_value=True)  # Simulate file exists

    # Mock open to raise IOError specifically on read
    error_message = "Disk read error"
    mock_open = mocker.patch("builtins.open")
    mock_open.side_effect = IOError(error_message)

    # Expect load_user to return None as _read_data returns {} on IOError
    user = manager.load_user("testuser")
    assert user is None

    # Check that the specific IOError print from _read_data was called
    mock_print.assert_any_call(f"Error reading data file: {error_message}")
    # Check that the "user not found" message is also
    # printed because _read_data returned {}
    mock_print.assert_any_call("User 'testuser' not found in JSON data.")
