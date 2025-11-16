"""Tests for the DatabaseDataManager class with creation_date handling."""

# pylint: disable=duplicate-code
from datetime import datetime
from typing import Any
from unittest.mock import MagicMock

from motido.core.models import Priority
from motido.data.abstraction import DEFAULT_USERNAME
from motido.data.database_manager import DatabaseDataManager


def test_load_user_invalid_creation_date_format(mocker: Any) -> None:
    """Test load_user handles invalid creation_date format."""
    # Mock the database connection and cursor
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.__exit__.return_value = None

    # Mock sqlite3.connect to return our mock connection
    mocker.patch("sqlite3.connect", return_value=mock_conn)

    # Set up the cursor to return a user
    mock_cursor.fetchone.return_value = {"username": DEFAULT_USERNAME}

    # Set up the cursor to return a task with invalid creation_date
    mock_cursor.execute.return_value = mock_cursor
    mock_cursor.fetchall.return_value = [
        {
            "id": "task-123",
            "title": "Task with invalid date",
            "priority": Priority.LOW.value,
            "creation_date": "not-a-valid-date-format",
        }
    ]

    # Mock print to verify warning message
    mock_print = mocker.patch("builtins.print")

    # Create the manager and load the user
    manager = DatabaseDataManager()
    loaded_user = manager.load_user(DEFAULT_USERNAME)

    # Verify the user was loaded
    assert loaded_user is not None
    assert loaded_user.username == DEFAULT_USERNAME
    assert len(loaded_user.tasks) == 1

    # Verify the task was created with a default creation_date
    task = loaded_user.tasks[0]
    assert task.id == "task-123"
    assert task.title == "Task with invalid date"
    assert task.priority == Priority.LOW
    assert isinstance(task.creation_date, datetime)

    # Verify the warning message was printed
    mock_print.assert_any_call(
        "Warning: Invalid creation_date format for task task-123, using current time."
    )
