"""Additional tests for DatabaseDataManager to improve code coverage."""

import json
import sqlite3
from typing import Generator
from unittest.mock import MagicMock, patch

import pytest

from motido.data.database_manager import DB_NAME, DatabaseDataManager

# pylint: disable=protected-access,redefined-outer-name


@pytest.fixture
def mock_db_path() -> str:
    """Returns a mock database path."""
    return "/fake/data/dir/" + DB_NAME


@pytest.fixture
def manager(mock_db_path: str) -> Generator[DatabaseDataManager, None, None]:
    """Creates a DatabaseDataManager instance with mocked connection attributes."""
    # Patch _get_db_path to return our mock path
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=mock_db_path):
        db_manager = DatabaseDataManager()
        # Manually initialize connection attributes to non-None values
        db_manager.conn = MagicMock(spec=sqlite3.Connection)
        db_manager.cursor = MagicMock(spec=sqlite3.Cursor)
        yield db_manager


def test_connection_attributes_init(mock_db_path: str) -> None:
    """Test that connection attributes are properly initialized in __init__."""
    # Patch _get_db_path to return our mock path
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=mock_db_path):
        db_manager = DatabaseDataManager()
        # Verify that connection attributes are initialized to None
        assert db_manager.conn is None
        assert db_manager.cursor is None


def test_get_db_path() -> None:
    """Test that _get_db_path returns the correct database path."""
    # Create a fresh instance
    manager = DatabaseDataManager()

    # Call the actual method
    db_path = manager._get_db_path()

    # Verify that the path has the right structure:
    # 1. It should end with the DB_NAME constant
    assert db_path.endswith(
        f"/{DB_NAME}"
    ), f"Path does not end with expected DB_NAME: {db_path}"

    # 2. It should contain a 'data' directory in the path
    path_components = db_path.split("/")
    assert (
        "data" in path_components
    ), f"Path does not contain a 'data' directory: {db_path}"

    # 3. The path should be an absolute path (starting with /)
    assert db_path.startswith("/"), f"Path is not absolute: {db_path}"

    # 4. The path should be realistic and follow the expected structure
    # We can't check if it exists in a unit test, but the structure should be valid
    assert (
        "motido" in db_path or "data" in db_path
    ), f"Path structure is unexpected: {db_path}"


def test_load_user_invalid_due_date_format(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid due_date format gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid due_date
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                "invalid-date-format",  # Invalid due_date format
                None,  # start_date
                None,  # icon
                json.dumps([]),  # tags
                None,  # project
                json.dumps([]),  # subtasks
                json.dumps([]),  # dependencies
                json.dumps([]),  # history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert user.tasks[0].due_date is None  # Should be None due to invalid format

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid due_date format" in captured.out


def test_load_user_invalid_start_date_format(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid start_date format gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid start_date
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                    id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                None,  # due_date
                "invalid-date-format",  # Invalid start_date format
                None,  # icon
                json.dumps([]),  # tags
                None,
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),  # history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert user.tasks[0].start_date is None  # Should be None due to invalid format

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid start_date format" in captured.out


def test_load_user_invalid_tags_json(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid tags JSON gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid tags JSON
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                    id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                None,  # due_date
                None,  # start_date
                None,  # icon
                "invalid-json",  # Invalid tags  # Invalid JSON
                None,
                json.dumps([]),
                json.dumps([]),
                json.dumps([]),  # history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert user.tasks[0].tags == []  # Should be empty list due to invalid JSON

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid JSON in tags" in captured.out


def test_load_user_invalid_subtasks_json(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid subtasks JSON gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid subtasks JSON
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                    id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                None,  # due_date
                None,  # start_date
                None,  # icon
                json.dumps([]),  # tags
                None,  # project
                "invalid-json",  # Invalid subtasks  # Invalid JSON
                json.dumps([]),  # dependencies
                json.dumps([]),  # history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert user.tasks[0].subtasks == []  # Should be empty list due to invalid JSON

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid JSON in subtasks" in captured.out


def test_load_user_invalid_dependencies_json(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid dependencies JSON gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid dependencies JSON
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                    id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                None,  # due_date
                None,  # start_date
                None,  # icon
                json.dumps([]),  # tags
                None,  # project
                json.dumps([]),  # subtasks
                "invalid-json",  # Invalid dependencies  # Invalid JSON
                json.dumps([]),  # history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert (
            user.tasks[0].dependencies == []
        )  # Should be empty list due to invalid JSON

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid JSON in dependencies" in captured.out


def test_load_user_invalid_history_json(tmp_path, capsys):  # type: ignore
    """Test that load_user handles invalid history JSON gracefully."""
    db_path = tmp_path / "test.db"

    # Patch _get_db_path to use our temp database
    with patch.object(DatabaseDataManager, "_get_db_path", return_value=str(db_path)):
        manager = DatabaseDataManager()

        # Initialize the database schema
        manager.initialize()

        # Now insert a task directly with invalid history JSON
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()

        # Insert user first
        cursor.execute(
            "INSERT INTO users (username, total_xp) VALUES (?, ?)",
            ("test_user", 0),
        )

        cursor.execute(
            """INSERT INTO tasks (
                    id, user_username, title, text_description, priority, difficulty, duration,
                is_complete, creation_date, due_date, start_date, icon,
                tags, project, subtasks, dependencies, history
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                "test-id",
                "test_user",
                "Test Task",
                None,  # text_description
                "Low",
                "Trivial",
                "Miniscule",
                0,
                "2023-01-01 12:00:00",
                None,  # due_date
                None,  # start_date
                None,  # icon
                json.dumps([]),  # tags
                None,  # project
                json.dumps([]),  # subtasks
                json.dumps([]),  # dependencies
                "invalid-json",  # Invalid history
            ),
        )

        conn.commit()
        conn.close()

        user = manager.load_user("test_user")

        # User should still load successfully
        assert user is not None
        assert len(user.tasks) == 1
        assert user.tasks[0].history == []  # Should be empty list due to invalid JSON

        # Check that warning was printed
        captured = capsys.readouterr()
        assert "Warning: Invalid JSON in history" in captured.out
