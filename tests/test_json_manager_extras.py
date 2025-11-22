"""Additional tests for JsonDataManager to improve code coverage."""

from typing import Any

from motido.data.json_manager import JsonDataManager

# pylint: disable=redefined-outer-name


def test_load_user_invalid_due_date_format(
    manager: JsonDataManager,
    mocker: Any,
    capsys: Any,
) -> None:
    """Test that load_user handles invalid due_date format gracefully."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 0,
            "tasks": [
                {
                    "id": "test-id",
                    "title": "Test Task",
                    "priority": "Low",
                    "difficulty": "Trivial",
                    "duration": "Miniscule",
                    "is_complete": False,
                    "creation_date": "2023-01-01 12:00:00",
                    "due_date": "invalid-date-format",  # Invalid format
                    "text_description": None,
                    "start_date": None,
                    "icon": None,
                    "tags": [],
                    "project": None,
                    "subtasks": [],
                    "dependencies": [],
                }
            ],
        }
    }

    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    # User should still load successfully
    assert user is not None
    assert len(user.tasks) == 1
    assert user.tasks[0].due_date is None  # Should be None due to invalid format

    # Check that warning was printed
    captured = capsys.readouterr()
    assert "Invalid due_date format" in captured.out


def test_load_user_invalid_start_date_format(
    manager: JsonDataManager,
    mocker: Any,
    capsys: Any,
) -> None:
    """Test that load_user handles invalid start_date format gracefully."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 0,
            "tasks": [
                {
                    "id": "test-id",
                    "title": "Test Task",
                    "priority": "Low",
                    "difficulty": "Trivial",
                    "duration": "Miniscule",
                    "is_complete": False,
                    "creation_date": "2023-01-01 12:00:00",
                    "due_date": None,
                    "start_date": "invalid-date-format",  # Invalid format
                    "text_description": None,
                    "icon": None,
                    "tags": [],
                    "project": None,
                    "subtasks": [],
                    "dependencies": [],
                }
            ],
        }
    }

    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    # User should still load successfully
    assert user is not None
    assert len(user.tasks) == 1
    assert user.tasks[0].start_date is None  # Should be None due to invalid format

    # Check that warning was printed
    captured = capsys.readouterr()
    assert "Invalid start_date format" in captured.out


def test_load_user_invalid_recurrence_type(
    manager: JsonDataManager, mocker: Any
) -> None:
    """Test loading a user with a task having an invalid recurrence type."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 0,
            "tasks": [
                {
                    "id": "test-id",
                    "title": "Test Task",
                    "priority": "Low",
                    "difficulty": "Trivial",
                    "duration": "Miniscule",
                    "is_complete": False,
                    "creation_date": "2023-01-01 12:00:00",
                    "recurrence_type": "InvalidType",  # Invalid
                }
            ],
        }
    }
    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    assert user is not None
    assert len(user.tasks) == 1
    assert user.tasks[0].recurrence_type is None
