"""Tests for the JsonDataManager class with creation_date handling."""

# pylint: disable=duplicate-code

from datetime import datetime
from typing import Any

from motido.core.models import Priority
from motido.data.json_manager import (
    DEFAULT_USERNAME,
    JsonDataManager,
)


def test_load_user_invalid_creation_date_format(
    manager: JsonDataManager, mocker: Any
) -> None:
    """Test load_user handles invalid creation_date format."""
    # Create data with an invalid creation_date format
    data_with_invalid_date = {
        DEFAULT_USERNAME: {
            "username": DEFAULT_USERNAME,
            "tasks": [
                {
                    "id": "task-123",
                    "description": "Task with invalid date",
                    "priority": Priority.LOW.value,
                    "creation_date": "not-a-valid-date-format",
                },
            ],
        }
    }
    mock_read = mocker.patch.object(
        manager, "_read_data", return_value=data_with_invalid_date
    )
    mock_print = mocker.patch("builtins.print")

    # Load the user
    loaded_user = manager.load_user(DEFAULT_USERNAME)

    # Verify the user was loaded
    mock_read.assert_called_once()
    assert loaded_user is not None
    assert loaded_user.username == DEFAULT_USERNAME
    assert len(loaded_user.tasks) == 1

    # Verify the task was created with a default creation_date
    task = loaded_user.tasks[0]
    assert task.id == "task-123"
    assert task.description == "Task with invalid date"
    assert task.priority == Priority.LOW
    assert isinstance(task.creation_date, datetime)

    # Verify the warning message was printed
    mock_print.assert_any_call(
        "Warning: Invalid creation_date format for task task-123, using current time."
    )
