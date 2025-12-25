"""Tests for the PostgreSQL data manager.

This module contains comprehensive tests for PostgresDataManager,
which handles data persistence using PostgreSQL database.
Tests use mocks to avoid requiring an actual database connection.
"""

# pylint: disable=import-outside-toplevel,protected-access,unused-argument

from datetime import datetime
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from motido.core.models import (
    Difficulty,
    Duration,
    Priority,
    Project,
    RecurrenceType,
    SubtaskRecurrenceMode,
    Tag,
    User,
)


# Test that module handles missing psycopg2 gracefully
def test_postgres_manager_import_without_psycopg2() -> None:
    """Test that PostgresDataManager raises ImportError when psycopg2 is not available."""
    with patch.dict("sys.modules", {"psycopg2": None}):
        # Force reimport with psycopg2 unavailable
        import motido.data.postgres_manager

        # Temporarily set POSTGRES_AVAILABLE to False
        with patch.object(motido.data.postgres_manager, "POSTGRES_AVAILABLE", False):
            from motido.data.postgres_manager import PostgresDataManager

            with pytest.raises(ImportError) as exc_info:
                PostgresDataManager("postgresql://test")

            assert "psycopg2 is not installed" in str(exc_info.value)


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.os.getenv")
def test_postgres_manager_init_with_url(mock_getenv: Any) -> None:
    """Test PostgresDataManager initialization with provided database URL."""
    from motido.data.postgres_manager import PostgresDataManager

    database_url = "postgresql://user:pass@localhost/testdb"

    manager = PostgresDataManager(database_url)

    assert manager._database_url == database_url
    mock_getenv.assert_not_called()


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.os.getenv")
def test_postgres_manager_init_with_env_var(mock_getenv: Any) -> None:
    """Test PostgresDataManager initialization using DATABASE_URL from environment."""
    from motido.data.postgres_manager import PostgresDataManager

    database_url = "postgresql://user:pass@localhost/testdb"
    mock_getenv.return_value = database_url

    manager = PostgresDataManager()

    assert manager._database_url == database_url
    mock_getenv.assert_called_once_with("DATABASE_URL")


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.os.getenv")
def test_postgres_manager_init_no_url_raises_error(mock_getenv: Any) -> None:
    """Test PostgresDataManager raises ValueError when no DATABASE_URL is provided."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_getenv.return_value = None

    with pytest.raises(ValueError) as exc_info:
        PostgresDataManager()

    assert "DATABASE_URL environment variable is required" in str(exc_info.value)


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
def test_get_connection_success(mock_psycopg2: Any) -> None:
    """Test successful database connection."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_psycopg2.connect.return_value = mock_conn

    manager = PostgresDataManager("postgresql://test")
    conn = manager._get_connection()

    assert conn == mock_conn
    mock_psycopg2.connect.assert_called_once()


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_get_connection_error(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test database connection error handling."""
    from motido.data.postgres_manager import PostgresDataManager

    # Create a mock error class
    mock_error = type("Error", (Exception,), {})
    mock_psycopg2.Error = mock_error
    mock_psycopg2.connect.side_effect = mock_error("Connection failed")

    manager = PostgresDataManager("postgresql://test")

    with pytest.raises(Exception):
        manager._get_connection()

    # Should print error message
    assert any("Error connecting" in str(call) for call in mock_print.call_args_list)


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_create_tables_success(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test successful table creation."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

    manager = PostgresDataManager("postgresql://test")
    manager._create_tables(mock_conn)

    # Verify tables were created
    assert mock_cursor.execute.call_count >= 3  # users table, tasks table, index
    mock_conn.commit.assert_called_once()
    mock_print.assert_called_with("PostgreSQL tables checked/created successfully.")


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_create_tables_error(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test table creation error handling."""
    from motido.data.postgres_manager import PostgresDataManager

    # Create a mock error class
    mock_error = type("Error", (Exception,), {})
    mock_psycopg2.Error = mock_error

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_cursor.execute.side_effect = mock_error("Table creation failed")

    manager = PostgresDataManager("postgresql://test")

    with pytest.raises(Exception):
        manager._create_tables(mock_conn)

    mock_conn.rollback.assert_called_once()


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_initialize_success(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test successful database initialization."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_psycopg2.connect.return_value.__enter__.return_value = mock_conn

    manager = PostgresDataManager("postgresql://test")
    manager.initialize()

    mock_print.assert_any_call("Initializing PostgreSQL database...")


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_initialize_error(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test database initialization error handling - should raise exception."""
    from motido.data.postgres_manager import PostgresDataManager

    # Create a mock error class
    mock_error = type("Error", (Exception,), {})
    mock_psycopg2.Error = mock_error
    mock_psycopg2.connect.side_effect = mock_error("Init failed")

    manager = PostgresDataManager("postgresql://test")
    # Should raise exception to fail fast if database can't be initialized
    with pytest.raises(Exception, match="Init failed"):
        manager.initialize()

    mock_print.assert_any_call("Initializing PostgreSQL database...")


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_load_user_success(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test successful user loading."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_psycopg2.connect.return_value.__enter__.return_value = mock_conn

    # Mock user data
    user_row = {
        "username": "testuser",
        "total_xp": 100,
        "last_processed_date": "2025-01-01",
        "vacation_mode": False,
        "defined_tags": [{"id": "1", "name": "work", "color": "#ff0000"}],
        "defined_projects": [{"id": "1", "name": "Project1", "color": "#00ff00"}],
    }

    # Mock task data
    task_row = {
        "id": "task1",
        "title": "Test Task",
        "text_description": "Description",
        "priority": "high",
        "difficulty": "medium",
        "duration": "short",
        "is_complete": False,
        "creation_date": datetime.now(),
        "due_date": None,
        "start_date": None,
        "icon": None,
        "tags": ["tag1"],
        "project": "Project1",
        "subtasks": [],
        "dependencies": [],
        "history": [],
        "is_habit": False,
        "recurrence_rule": None,
        "recurrence_type": None,
        "streak_current": 0,
        "streak_best": 0,
        "parent_habit_id": None,
        "habit_start_delta": None,
    }

    mock_cursor.fetchone.return_value = user_row
    mock_cursor.fetchall.return_value = [task_row]

    manager = PostgresDataManager("postgresql://test")
    user = manager.load_user("testuser")

    assert user is not None
    assert user.username == "testuser"
    assert user.total_xp == 100
    assert len(user.tasks) == 1
    assert len(user.defined_tags) == 1
    assert len(user.defined_projects) == 1


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_load_user_not_found(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test loading non-existent user returns None."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_psycopg2.connect.return_value.__enter__.return_value = mock_conn

    mock_cursor.fetchone.return_value = None

    manager = PostgresDataManager("postgresql://test")
    user = manager.load_user("nonexistent")

    assert user is None
    mock_print.assert_any_call("User 'nonexistent' not found in PostgreSQL.")


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_load_user_error(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test user loading error handling."""
    from motido.data.postgres_manager import PostgresDataManager

    # Create a mock error class
    mock_error = type("Error", (Exception,), {})
    mock_psycopg2.Error = mock_error
    mock_psycopg2.connect.side_effect = mock_error("Load failed")

    manager = PostgresDataManager("postgresql://test")
    user = manager.load_user("testuser")

    assert user is None
    # Should print error message
    assert any("Error loading user" in str(call) for call in mock_print.call_args_list)


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_save_user_success(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test successful user saving."""
    from motido.data.postgres_manager import PostgresDataManager

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_psycopg2.connect.return_value.__enter__.return_value = mock_conn

    # Create test user without tasks (simpler for this test)
    user = User(
        username="testuser",
        total_xp=100,
        tasks=[],
        defined_tags=[Tag(id="1", name="work", color="#ff0000")],
        defined_projects=[Project(id="1", name="Project1", color="#00ff00")],
    )

    manager = PostgresDataManager("postgresql://test")
    manager.save_user(user)

    # Verify user was inserted and tasks were deleted
    assert mock_cursor.execute.call_count >= 2  # User insert, task delete
    mock_conn.commit.assert_called_once()


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
@patch("motido.data.postgres_manager.psycopg2")
@patch("motido.data.postgres_manager.print")
def test_save_user_error(mock_print: Any, mock_psycopg2: Any) -> None:
    """Test user saving error handling."""
    from motido.data.postgres_manager import PostgresDataManager

    # Create a mock error class
    mock_error = type("Error", (Exception,), {})
    mock_psycopg2.Error = mock_error

    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    mock_psycopg2.connect.return_value.__enter__.return_value = mock_conn
    mock_cursor.execute.side_effect = mock_error("Save failed")

    user = User(username="testuser")

    manager = PostgresDataManager("postgresql://test")

    with pytest.raises(Exception):
        manager.save_user(user)

    # Should print error message
    assert any("Error saving user" in str(call) for call in mock_print.call_args_list)


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_backend_type() -> None:
    """Test backend_type returns 'postgres'."""
    from motido.data.postgres_manager import PostgresDataManager

    manager = PostgresDataManager("postgresql://test")
    assert manager.backend_type() == "postgres"


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_row_to_task_with_string_dates() -> None:
    """Test _row_to_task with string date fields."""
    from motido.data.postgres_manager import PostgresDataManager

    row = {
        "id": "task1",
        "title": "Test Task",
        "text_description": "Description",
        "priority": "High",
        "difficulty": "Medium",
        "duration": "Short",
        "is_complete": False,
        "creation_date": "2025-01-01T12:00:00",
        "due_date": "2025-01-02T12:00:00",
        "start_date": "2025-01-01T08:00:00",
        "icon": "📝",
        "tags": '["tag1", "tag2"]',
        "project": "Project1",
        "subtasks": '[{"text": "Sub1", "complete": false}]',
        "dependencies": '["dep1"]',
        "history": '[{"date": "2025-01-01"}]',
        "is_habit": True,
        "recurrence_rule": "daily",
        "recurrence_type": "Strict",
        "streak_current": 5,
        "streak_best": 10,
        "parent_habit_id": "parent1",
        "habit_start_delta": 1,
    }

    manager = PostgresDataManager("postgresql://test")
    task = manager._row_to_task(row)

    assert task.id == "task1"
    assert task.title == "Test Task"
    assert task.priority == Priority.HIGH
    assert task.difficulty == Difficulty.MEDIUM
    assert task.duration == Duration.SHORT
    assert len(task.tags) == 2
    assert task.is_habit is True
    assert task.recurrence_type == RecurrenceType.STRICT
    assert task.streak_current == 5


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_row_to_task_with_null_fields() -> None:
    """Test _row_to_task with null/missing fields."""
    from motido.data.postgres_manager import PostgresDataManager

    row = {
        "id": "task1",
        "title": "Minimal Task",
        "priority": "Low",
        "difficulty": "Trivial",
        "duration": "Minuscule",
        "is_complete": False,
        "creation_date": datetime.now(),
        "due_date": None,
        "start_date": None,
        "icon": None,
        "tags": None,
        "project": None,
        "subtasks": None,
        "dependencies": None,
        "history": None,
        "is_habit": False,
        "recurrence_rule": None,
        "recurrence_type": None,
        "streak_current": 0,
        "streak_best": 0,
        "parent_habit_id": None,
        "habit_start_delta": None,
    }

    manager = PostgresDataManager("postgresql://test")
    task = manager._row_to_task(row)

    assert task.id == "task1"
    assert task.tags == []
    assert task.subtasks == []
    assert task.dependencies == []
    assert task.history == []
    assert task.recurrence_type is None


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_parse_subtask_recurrence_mode_valid() -> None:
    """Test _parse_subtask_recurrence_mode with valid values."""
    from motido.data.postgres_manager import PostgresDataManager

    manager = PostgresDataManager("postgresql://test")

    assert (
        manager._parse_subtask_recurrence_mode("default")
        == SubtaskRecurrenceMode.DEFAULT
    )
    assert (
        manager._parse_subtask_recurrence_mode("always") == SubtaskRecurrenceMode.ALWAYS
    )
    assert (
        manager._parse_subtask_recurrence_mode("partial")
        == SubtaskRecurrenceMode.PARTIAL
    )


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_parse_subtask_recurrence_mode_invalid() -> None:
    """Test _parse_subtask_recurrence_mode with invalid values returns DEFAULT."""
    from motido.data.postgres_manager import PostgresDataManager

    manager = PostgresDataManager("postgresql://test")

    assert manager._parse_subtask_recurrence_mode(None) == SubtaskRecurrenceMode.DEFAULT
    assert manager._parse_subtask_recurrence_mode("") == SubtaskRecurrenceMode.DEFAULT
    assert (
        manager._parse_subtask_recurrence_mode("invalid")
        == SubtaskRecurrenceMode.DEFAULT
    )
    assert (
        manager._parse_subtask_recurrence_mode("ALWAYS")  # Case sensitive
        == SubtaskRecurrenceMode.DEFAULT
    )


@patch("motido.data.postgres_manager.POSTGRES_AVAILABLE", True)
def test_row_to_task_with_subtask_recurrence_mode() -> None:
    """Test _row_to_task with subtask_recurrence_mode field."""
    from motido.data.postgres_manager import PostgresDataManager

    row = {
        "id": "task1",
        "title": "Habit Task",
        "priority": "Low",
        "difficulty": "Trivial",
        "duration": "Minuscule",
        "is_complete": False,
        "creation_date": datetime.now(),
        "due_date": None,
        "start_date": None,
        "icon": None,
        "tags": None,
        "project": None,
        "subtasks": None,
        "dependencies": None,
        "history": None,
        "is_habit": True,
        "recurrence_rule": "daily",
        "recurrence_type": None,
        "streak_current": 0,
        "streak_best": 0,
        "parent_habit_id": None,
        "habit_start_delta": None,
        "subtask_recurrence_mode": "always",
    }

    manager = PostgresDataManager("postgresql://test")
    task = manager._row_to_task(row)

    assert task.subtask_recurrence_mode == SubtaskRecurrenceMode.ALWAYS
