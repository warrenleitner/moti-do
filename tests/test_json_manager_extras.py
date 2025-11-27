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


def test_load_user_with_xp_transactions(
    manager: JsonDataManager,
    mocker: Any,
) -> None:
    """Test loading a user with XP transactions."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 150,
            "tasks": [],
            "xp_transactions": [
                {
                    "id": "trans-1",
                    "amount": 100,
                    "source": "task_completion",
                    "timestamp": "2025-01-01 10:00:00",
                    "task_id": "task-123",
                    "description": "Completed: Big Task",
                },
                {
                    "id": "trans-2",
                    "amount": -20,
                    "source": "penalty",
                    "timestamp": "2025-01-02 08:00:00",
                    "description": "Overdue penalty",
                },
            ],
        }
    }
    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    assert user is not None
    assert len(user.xp_transactions) == 2
    assert user.xp_transactions[0].amount == 100
    assert user.xp_transactions[0].source == "task_completion"
    assert user.xp_transactions[0].task_id == "task-123"
    assert user.xp_transactions[0].description == "Completed: Big Task"
    assert user.xp_transactions[1].amount == -20
    assert user.xp_transactions[1].source == "penalty"


def test_load_user_with_badges(
    manager: JsonDataManager,
    mocker: Any,
) -> None:
    """Test loading a user with badges."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 100,
            "tasks": [],
            "xp_transactions": [],
            "badges": [
                {
                    "id": "badge-1",
                    "name": "First Task",
                    "description": "Complete your first task",
                    "glyph": "🌟",
                    "earned_date": "2025-01-01 10:00:00",
                },
                {
                    "id": "badge-2",
                    "name": "Streak Master",
                    "description": "7-day streak",
                    "glyph": "🔥",
                    "earned_date": None,  # Not yet earned
                },
            ],
        }
    }
    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    assert user is not None
    assert len(user.badges) == 2
    assert user.badges[0].name == "First Task"
    assert user.badges[0].glyph == "🌟"
    assert user.badges[0].earned_date is not None
    assert user.badges[0].is_earned()
    assert user.badges[1].name == "Streak Master"
    assert user.badges[1].earned_date is None
    assert not user.badges[1].is_earned()


def test_deserialize_xp_transaction_with_defaults(
    manager: JsonDataManager,
    mocker: Any,
) -> None:
    """Test deserializing XP transaction with minimal data uses defaults."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 50,
            "tasks": [],
            "xp_transactions": [
                {
                    # Minimal data - only amount
                    "amount": 50,
                }
            ],
        }
    }
    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    assert user is not None
    assert len(user.xp_transactions) == 1
    trans = user.xp_transactions[0]
    assert trans.amount == 50
    # Check defaults are applied
    assert trans.source == "task_completion"
    assert trans.description == ""
    assert trans.task_id is None
    assert trans.id is not None  # UUID generated
    assert trans.timestamp is not None  # Now() used as default


def test_deserialize_badge_with_defaults(
    manager: JsonDataManager,
    mocker: Any,
) -> None:
    """Test deserializing badge with minimal data uses defaults."""
    user_data = {
        "default_user": {
            "username": "default_user",
            "total_xp": 0,
            "tasks": [],
            "xp_transactions": [],
            "badges": [
                {
                    # Minimal data
                }
            ],
        }
    }
    mocker.patch.object(manager, "_read_data", return_value=user_data)

    user = manager.load_user("default_user")

    assert user is not None
    assert len(user.badges) == 1
    badge = user.badges[0]
    # Check defaults are applied
    assert badge.name == "Unknown"
    assert badge.description == ""
    assert badge.glyph == "🏆"
    assert badge.earned_date is None
    assert badge.id is not None  # UUID generated
