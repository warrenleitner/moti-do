# tests/test_database_manager.py

import os
import sqlite3
from typing import Any, Tuple
from unittest.mock import MagicMock, call, patch

import pytest

from motido.core.models import Task, User
from motido.data.database_manager import DB_NAME, DEFAULT_USERNAME, DatabaseDataManager

# --- Fixtures ---


@pytest.fixture
def mock_db_path(mocker: Any) -> Tuple[str, str]:
    """Mocks _get_db_path to return a predictable path."""
    mock_path = "/fake/data/dir/" + DB_NAME
    # Use autospec=True to ensure the mock has the same signature as the original
    mocker.patch.object(
        DatabaseDataManager, "_get_db_path", return_value=mock_path, autospec=True
    )
    # Return the mocked path and the directory part
    return mock_path, os.path.dirname(mock_path)


@pytest.fixture
def manager(mock_db_path: Tuple[str, str]) -> DatabaseDataManager:
    """Provides a DatabaseDataManager instance with mocked path."""
    # __init__ will use the mocked _get_db_path
    return DatabaseDataManager()


@pytest.fixture
def mock_conn_fixture(mocker: Any) -> Tuple[Any, Any, Any]:
    """Fixture to mock the entire _get_connection method for most tests."""
    mock_cursor = MagicMock(spec=sqlite3.Cursor)
    mock_cursor.fetchone.return_value = None  # Default: not found
    mock_cursor.fetchall.return_value = []  # Default: no tasks

    mock_connection = MagicMock(spec=sqlite3.Connection)
    mock_connection.cursor.return_value = mock_cursor
    mock_connection.__enter__.return_value = mock_connection
    mock_connection.__exit__.return_value = None

    # Patch _get_connection on the class to return our mock connection
    mock_get_conn = mocker.patch.object(
        DatabaseDataManager,
        "_get_connection",
        return_value=mock_connection,
        autospec=True,
    )

    # Return the patched method mock itself, plus the connection/cursor mocks
    return mock_get_conn, mock_connection, mock_cursor


@pytest.fixture
def sample_user_db() -> User:
    """Provides a sample User object for database tests."""
    user = User(username=DEFAULT_USERNAME)
    user.add_task(Task(description="DB Task 1", id="db-uuid-1"))
    user.add_task(Task(description="DB Task 2", id="db-uuid-2"))
    return user


# --- Tests ---


def test_init_sets_db_path(
    manager: DatabaseDataManager, mock_db_path: Tuple[str, str]
) -> None:
    """Test that __init__ sets the _db_path correctly using the mocked method."""
    expected_path, _ = mock_db_path
    assert manager._db_path == expected_path


# Skipping test for _get_db_path itself as we mock it for simplicity.


def test_ensure_data_dir_exists(
    manager: DatabaseDataManager, mocker: Any, mock_db_path: Tuple[str, str]
) -> None:
    """Test _ensure_data_dir_exists calls os.makedirs correctly."""
    mock_makedirs = mocker.patch("os.makedirs")
    _, expected_dir = mock_db_path

    # Call directly for testing its specific behavior
    manager._ensure_data_dir_exists()

    mock_makedirs.assert_called_once_with(expected_dir, exist_ok=True)


def test_get_connection_success(
    manager: DatabaseDataManager, mocker: Any, mock_db_path: Tuple[str, str]
) -> None:
    """Test _get_connection establishes connection and sets row factory."""
    expected_path, _ = mock_db_path  # Get path from other fixture
    # Mock dependencies needed ONLY for the real _get_connection
    mock_ensure_dir = mocker.patch.object(
        manager, "_ensure_data_dir_exists", autospec=True
    )
    mock_connect = mocker.patch("sqlite3.connect")
    mock_conn_instance = MagicMock(spec=sqlite3.Connection)
    mock_connect.return_value = mock_conn_instance

    # Call the *real* method
    conn = manager._get_connection()

    mock_ensure_dir.assert_called_once()
    mock_connect.assert_called_once_with(expected_path, isolation_level=None)
    assert conn == mock_conn_instance
    # Check that row_factory was set on the mocked instance
    assert mock_conn_instance.row_factory == sqlite3.Row


def test_get_connection_error(
    manager: DatabaseDataManager, mocker: Any, mock_db_path: Tuple[str, str]
) -> None:
    """Test _get_connection raises error on connection failure."""
    expected_path, _ = mock_db_path
    # Mock dependencies needed ONLY for the real _get_connection
    mocker.patch.object(manager, "_ensure_data_dir_exists", autospec=True)
    mocker.patch("sqlite3.connect", side_effect=sqlite3.Error("Connection failed"))

    # Call the *real* method and assert it raises
    with pytest.raises(sqlite3.Error, match="Connection failed"):
        manager._get_connection()


# Most tests below use the mock_conn_fixture to avoid hitting the real _get_connection


def test_create_tables(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test _create_tables executes correct SQL using mocked connection."""
    _, connection, cursor = mock_conn_fixture  # Get mocked connection/cursor

    manager._create_tables(connection)  # Call the method directly with mock connection

    expected_calls = [
        call(
            """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY
                )
            """
        ),
        call(
            """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
                    user_username TEXT NOT NULL,
                    FOREIGN KEY (user_username) REFERENCES users (username)
                        ON DELETE CASCADE ON UPDATE CASCADE
                )
            """
        ),
    ]
    cursor.execute.assert_has_calls(expected_calls)
    connection.commit.assert_called_once()


def test_create_tables_error(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any], capsys: Any
) -> None:
    """Test _create_tables handles sqlite3.Error using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    cursor.execute.side_effect = sqlite3.Error("Table creation failed")

    manager._create_tables(connection)

    connection.commit.assert_not_called()
    captured = capsys.readouterr()
    assert "Error creating database tables: Table creation failed" in captured.out


def test_initialize_success(
    manager: DatabaseDataManager, mocker: Any, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test initialize calls _get_connection (mocked) and _create_tables."""
    # mock_conn_fixture patches _get_connection globally for this test
    mock_get_connection, mock_conn_instance, _ = mock_conn_fixture
    mock_create_tables = mocker.patch.object(manager, "_create_tables", autospec=True)
    # Prevent the OSError by mocking makedirs, even though _get_connection is mocked.
    # This guards against potential unexpected calls to the real method somehow.
    mocker.patch("os.makedirs")

    manager.initialize()

    mock_get_connection.assert_called_once()  # Check the mocked _get_connection was called
    mock_create_tables.assert_called_once_with(mock_conn_instance)


def test_initialize_connection_error(
    manager: DatabaseDataManager, mocker: Any, capsys: Any
) -> None:
    """Test initialize handles errors when _get_connection (mocked) fails."""
    # Explicitly mock _get_connection *within this test* to raise error
    mocker.patch.object(
        DatabaseDataManager,
        "_get_connection",
        side_effect=sqlite3.Error("Initial connection failed"),
        autospec=True,
    )
    mock_create_tables = mocker.patch.object(manager, "_create_tables", autospec=True)

    manager.initialize()

    manager._get_connection.assert_called_once()  # type: ignore [attr-defined]
    mock_create_tables.assert_not_called()  # create_tables shouldn't be called if conn fails
    captured = capsys.readouterr()
    assert "Database initialization failed: Initial connection failed" in captured.out


def test_load_user_found(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
    sample_user_db: User,
) -> None:
    """Test loading a user who exists with tasks using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    username = sample_user_db.username

    cursor.fetchone.return_value = {"username": username}
    task_rows = [
        {"id": "db-uuid-1", "description": "DB Task 1"},
        {"id": "db-uuid-2", "description": "DB Task 2"},
    ]
    cursor.fetchall.return_value = task_rows

    loaded_user = manager.load_user(username)

    assert loaded_user is not None
    assert loaded_user.username == username
    assert len(loaded_user.tasks) == 2
    assert loaded_user.tasks[0].id == "db-uuid-1"
    assert loaded_user.tasks[1].description == "DB Task 2"

    expected_calls = [
        call("SELECT username FROM users WHERE username = ?", (username,)),
        call("SELECT id, description FROM tasks WHERE user_username = ?", (username,)),
    ]
    cursor.execute.assert_has_calls(expected_calls)


def test_load_user_not_found(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test loading a user who does not exist using mocked connection."""
    _, _, cursor = mock_conn_fixture
    username = "non_existent_user"

    # cursor.fetchone returns None by default in fixture

    loaded_user = manager.load_user(username)

    assert loaded_user is None
    cursor.execute.assert_called_once_with(
        "SELECT username FROM users WHERE username = ?", (username,)
    )
    cursor.fetchall.assert_not_called()


def test_load_user_no_tasks(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test loading a user who exists but has no tasks using mocked connection."""
    _, _, cursor = mock_conn_fixture
    username = DEFAULT_USERNAME

    cursor.fetchone.return_value = {"username": username}
    # cursor.fetchall returns [] by default in fixture

    loaded_user = manager.load_user(username)

    assert loaded_user is not None
    assert loaded_user.username == username
    assert loaded_user.tasks == []

    expected_calls = [
        call("SELECT username FROM users WHERE username = ?", (username,)),
        call("SELECT id, description FROM tasks WHERE user_username = ?", (username,)),
    ]
    cursor.execute.assert_has_calls(expected_calls)


def test_load_user_db_error(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any], capsys: Any
) -> None:
    """Test load_user handles database errors during query using mocked connection."""
    _, _, cursor = mock_conn_fixture
    username = DEFAULT_USERNAME
    cursor.execute.side_effect = sqlite3.Error("Query failed")

    loaded_user = manager.load_user(username)

    assert loaded_user is None
    captured = capsys.readouterr()
    assert (
        f"Error loading user '{username}' from motido.database: Query failed"
        in captured.out
    )


def test_ensure_user_exists(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test _ensure_user_exists executes correct SQL using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    username = "new_user"

    # Note: _ensure_user_exists takes connection as arg, so we pass the mock
    manager._ensure_user_exists(connection, username)

    cursor.execute.assert_called_once_with(
        "INSERT OR IGNORE INTO users (username) VALUES (?)", (username,)
    )


def test_ensure_user_exists_db_error(
    manager: DatabaseDataManager, mock_conn_fixture: Tuple[Any, Any, Any], capsys: Any
) -> None:
    """Test _ensure_user_exists handles database errors using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    username = "new_user"
    cursor.execute.side_effect = sqlite3.Error("Insert failed")

    manager._ensure_user_exists(connection, username)

    captured = capsys.readouterr()
    assert f"Error ensuring user '{username}' exists: Insert failed" in captured.out


def test_save_user_new(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_conn_fixture: Tuple[Any, Any, Any],
    sample_user_db: User,
) -> None:
    """Test saving a new user with tasks using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    # Mock the internal call specifically for this test
    mock_ensure_user = mocker.patch.object(
        manager, "_ensure_user_exists", autospec=True
    )

    manager.save_user(sample_user_db)

    # Check that _ensure_user_exists was called correctly (without self)
    mock_ensure_user.assert_called_once_with(connection, sample_user_db.username)

    # Check SQL executed via the mocked cursor
    cursor.execute.assert_called_once_with(
        "DELETE FROM tasks WHERE user_username = ?", (sample_user_db.username,)
    )
    expected_task_data = [
        ("db-uuid-1", "DB Task 1", sample_user_db.username),
        ("db-uuid-2", "DB Task 2", sample_user_db.username),
    ]
    cursor.executemany.assert_called_once_with(
        "INSERT INTO tasks (id, description, user_username) VALUES (?, ?, ?)",
        expected_task_data,
    )


def test_save_user_no_tasks(
    manager: DatabaseDataManager, mocker: Any, mock_conn_fixture: Tuple[Any, Any, Any]
) -> None:
    """Test saving a user with no tasks using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    mock_ensure_user = mocker.patch.object(
        manager, "_ensure_user_exists", autospec=True
    )
    user_no_tasks = User(username="empty_user")

    manager.save_user(user_no_tasks)

    # Check that _ensure_user_exists was called correctly (without self)
    mock_ensure_user.assert_called_once_with(connection, user_no_tasks.username)
    cursor.execute.assert_called_once_with(
        "DELETE FROM tasks WHERE user_username = ?", (user_no_tasks.username,)
    )
    cursor.executemany.assert_not_called()


def test_save_user_db_error_on_delete(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_conn_fixture: Tuple[Any, Any, Any],
    sample_user_db: User,
    capsys: Any,
) -> None:
    """Test save_user handles DB error during DELETE using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    mock_ensure_user = mocker.patch.object(
        manager, "_ensure_user_exists", autospec=True
    )
    # Make the first execute call (DELETE) raise an error
    cursor.execute.side_effect = sqlite3.Error("Delete failed")

    manager.save_user(sample_user_db)

    # Check that _ensure_user_exists was called correctly (without self)
    mock_ensure_user.assert_called_once_with(connection, sample_user_db.username)
    cursor.execute.assert_called_once()
    cursor.executemany.assert_not_called()
    captured = capsys.readouterr()
    assert (
        f"Error saving user '{sample_user_db.username}' to database: Delete failed"
        in captured.out
    )


def test_save_user_db_error_on_insert(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_conn_fixture: Tuple[Any, Any, Any],
    sample_user_db: User,
    capsys: Any,
) -> None:
    """Test save_user handles DB error during INSERT using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    mock_ensure_user = mocker.patch.object(
        manager, "_ensure_user_exists", autospec=True
    )
    # Let DELETE succeed (first execute call), but INSERT fail (executemany)
    cursor.execute.return_value = None
    cursor.executemany.side_effect = sqlite3.Error("Insert failed")

    manager.save_user(sample_user_db)

    # Check that _ensure_user_exists was called correctly (without self)
    mock_ensure_user.assert_called_once_with(connection, sample_user_db.username)
    assert cursor.execute.call_count == 1  # Just the DELETE call
    assert cursor.executemany.call_count == 1  # INSERT is attempted once
    captured = capsys.readouterr()
    assert (
        f"Error saving user '{sample_user_db.username}' to database: Insert failed"
        in captured.out
    )


def test_backend_type(manager: DatabaseDataManager) -> None:
    """Test the backend_type method returns 'db'."""
    assert manager.backend_type() == "db"


# Note: _connect and _close methods seem unused by the main logic (_get_connection is used).
# If they are indeed unused, they could be removed from the source code.
# We are not testing them here as they aren't part of the current public interface usage.
