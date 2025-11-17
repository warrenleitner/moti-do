"""Tests for the DatabaseDataManager class."""

import os
import sqlite3
from datetime import date, datetime
from typing import Any, Tuple
from unittest.mock import MagicMock, call

import pytest

from motido.core.models import Priority, Task, User
from motido.data.database_manager import DB_NAME, DEFAULT_USERNAME, DatabaseDataManager

# pylint: disable=protected-access,redefined-outer-name,unused-argument

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
    # Use a fixed datetime for testing
    test_date = datetime(2023, 1, 1, 12, 0, 0)
    user.add_task(Task(title="DB Task 1", creation_date=test_date, id="db-uuid-1"))
    user.add_task(Task(title="DB Task 2", creation_date=test_date, id="db-uuid-2"))
    return user


# --- Tests ---


def test_init_sets_db_path(
    manager: DatabaseDataManager,
    mock_db_path: Tuple[str, str],
) -> None:
    """Test that __init__ sets the _db_path correctly using the mocked method."""
    expected_path, _ = mock_db_path
    assert manager._db_path == expected_path


# Skipping test for _get_db_path itself as we mock it for simplicity.


def test_ensure_data_dir_exists(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_db_path: Tuple[str, str],
) -> None:
    """Test _ensure_data_dir_exists calls os.makedirs correctly."""
    mock_makedirs = mocker.patch("os.makedirs")
    _, expected_dir = mock_db_path

    # Call directly for testing its specific behavior
    manager._ensure_data_dir_exists()

    mock_makedirs.assert_called_once_with(expected_dir, exist_ok=True)


def test_get_connection_success(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_db_path: Tuple[str, str],
) -> None:
    """Test _get_connection establishes connection and sets row factory."""
    db_path, _ = mock_db_path  # Get path from other fixture
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
    mock_connect.assert_called_once_with(db_path, isolation_level=None)
    assert conn == mock_conn_instance
    # Check that row_factory was set on the mocked instance
    assert mock_conn_instance.row_factory == sqlite3.Row


def test_get_connection_error(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_db_path: Tuple[str, str],
) -> None:
    """Test _get_connection raises error on connection failure."""
    # Mock dependencies needed ONLY for the real _get_connection
    mocker.patch.object(manager, "_ensure_data_dir_exists", autospec=True)
    mocker.patch("sqlite3.connect", side_effect=sqlite3.Error("Connection failed"))

    # Call the *real* method and assert it raises
    with pytest.raises(sqlite3.Error, match="Connection failed"):
        manager._get_connection()


# Most tests below use the mock_conn_fixture to avoid hitting the real _get_connection


def test_create_tables(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test _create_tables executes correct SQL using mocked connection."""
    _, connection, cursor = mock_conn_fixture  # Get mocked connection/cursor

    # Call the method directly with mock connection
    manager._create_tables(connection)

    expected_calls = [
        call(
            """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    last_processed_date TEXT NOT NULL DEFAULT (date('now'))
                )
            """
        ),
        call(
            """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    text_description TEXT,
                    priority TEXT NOT NULL DEFAULT 'Low',
                    difficulty TEXT NOT NULL DEFAULT 'Trivial',
                    duration TEXT NOT NULL DEFAULT 'Miniscule',
                    is_complete INTEGER NOT NULL DEFAULT 0,
                    creation_date TEXT,
                    due_date TEXT,
                    start_date TEXT,
                    icon TEXT,
                    tags TEXT,
                    project TEXT,
                    subtasks TEXT,
                    dependencies TEXT,
                    history TEXT,
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
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
    capsys: Any,
) -> None:
    """Test _create_tables handles sqlite3.Error using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    cursor.execute.side_effect = sqlite3.Error("Table creation failed")

    manager._create_tables(connection)

    connection.commit.assert_not_called()
    captured = capsys.readouterr()
    assert "Error creating database tables: Table creation failed" in captured.out


def test_initialize_success(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test initialize calls _get_connection (mocked) and _create_tables."""
    # mock_conn_fixture patches _get_connection globally for this test
    mock_get_connection, mock_conn_instance, _ = mock_conn_fixture
    mock_create_tables = mocker.patch.object(manager, "_create_tables", autospec=True)
    # Prevent the OSError by mocking makedirs, even though _get_connection is mocked.
    # This guards against potential unexpected calls to the real method somehow.
    mocker.patch("os.makedirs")

    manager.initialize()

    # Check the mocked _get_connection was called
    mock_get_connection.assert_called_once()
    mock_create_tables.assert_called_once_with(mock_conn_instance)


def test_initialize_connection_error(
    manager: DatabaseDataManager,
    mocker: Any,
    capsys: Any,
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
    # create_tables shouldn't be called if conn fails
    mock_create_tables.assert_not_called()
    captured = capsys.readouterr()
    error_msg = "Database initialization failed: Initial connection failed"
    assert error_msg in captured.out


def test_load_user_success(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test load_user with a successful user fetch."""
    mock_get_connection, _, cursor = mock_conn_fixture

    # Mock cursor.fetchone for user lookup
    cursor.fetchone.side_effect = [
        {
            "username": DEFAULT_USERNAME,
            "total_xp": 0,
            "last_processed_date": "2025-11-16",
        },
        None,
    ]
    # Mock cursor.fetchall for task lookup - return 2 tasks
    cursor.fetchall.return_value = [
        {"id": "task1", "title": "Task 1", "priority": "Low"},
        {"id": "task2", "title": "Task 2", "priority": "High"},
    ]

    user = manager.load_user()

    mock_get_connection.assert_called_once()
    assert cursor.execute.call_count == 2  # One for user lookup, one for tasks
    assert user is not None
    assert user.username == DEFAULT_USERNAME
    assert len(user.tasks) == 2
    # Check task properties including priority
    assert user.tasks[0].id == "task1"
    assert user.tasks[0].title == "Task 1"
    assert user.tasks[0].priority == Priority.LOW
    assert user.tasks[1].id == "task2"
    assert user.tasks[1].title == "Task 2"
    assert user.tasks[1].priority == Priority.HIGH


def test_load_user_without_last_processed_date(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test loading a user without last_processed_date defaults to today."""
    mock_get_connection, _, cursor = mock_conn_fixture

    # Mock cursor.fetchone for user lookup WITHOUT last_processed_date field
    cursor.fetchone.side_effect = [
        {
            "username": "testuser",
            "total_xp": 50,
            # No last_processed_date key (backwards compatibility)
        },
        None,
    ]
    # Mock cursor.fetchall for task lookup - no tasks
    cursor.fetchall.return_value = []

    user = manager.load_user("testuser")

    mock_get_connection.assert_called_once()
    assert user is not None
    assert user.username == "testuser"
    assert user.total_xp == 50
    assert user.last_processed_date == date.today()


def test_load_user_invalid_priority(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
    capsys: Any,
) -> None:
    """Test load_user handles invalid priority values."""
    mock_get_connection, _, cursor = mock_conn_fixture

    # Mock cursor.fetchone for user lookup
    cursor.fetchone.side_effect = [{"username": DEFAULT_USERNAME}, None]
    # Mock cursor.fetchall for task lookup - return a task with invalid priority
    cursor.fetchall.return_value = [
        {"id": "task1", "title": "Task 1", "priority": "InvalidPriority"},
    ]

    user = manager.load_user()

    mock_get_connection.assert_called_once()
    assert user is not None
    assert len(user.tasks) == 1
    # Should default to LOW priority for invalid value
    assert user.tasks[0].priority == Priority.LOW

    # Check warning was printed
    captured = capsys.readouterr()
    assert "Warning: Invalid priority 'InvalidPriority'" in captured.out


def test_load_user_not_found(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
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
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test loading a user who exists but has no tasks using mocked connection."""
    _, _, cursor = mock_conn_fixture
    username = DEFAULT_USERNAME

    cursor.fetchone.return_value = {"username": username, "total_xp": 0}
    # cursor.fetchall returns [] by default in fixture

    loaded_user = manager.load_user(username)

    assert loaded_user is not None
    assert loaded_user.username == username
    assert loaded_user.total_xp == 0
    assert loaded_user.tasks == []

    expected_calls = [
        call("SELECT username FROM users WHERE username = ?", (username,)),
        call(
            "SELECT id, title, text_description, priority, difficulty, duration, "
            "is_complete, creation_date, due_date, start_date, icon, tags, "
            "project, subtasks, dependencies, history FROM tasks "
            "WHERE user_username = ?",
            (username,),
        ),
    ]
    cursor.execute.assert_has_calls(expected_calls)


def test_load_user_db_error(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
    capsys: Any,
) -> None:
    """Test load_user handles database errors during query using mocked connection."""
    _, _, cursor = mock_conn_fixture
    username = DEFAULT_USERNAME
    cursor.execute.side_effect = sqlite3.Error("Query failed")

    loaded_user = manager.load_user(username)

    assert loaded_user is None
    captured = capsys.readouterr()
    error_msg = (
        f"Error loading user '{username}' from motido.database: " f"Query failed"
    )
    assert error_msg in captured.out


def test_ensure_user_exists(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test _ensure_user_exists executes correct SQL using mocked connection."""
    _, connection, cursor = mock_conn_fixture

    user = User(username="new_user", total_xp=0, last_processed_date=date(2025, 11, 16))

    # Note: _ensure_user_exists takes connection and user as args
    manager._ensure_user_exists(connection, user)

    cursor.execute.assert_called_once_with(
        "INSERT OR IGNORE INTO users (username, total_xp, last_processed_date) VALUES (?, ?, ?)",
        ("new_user", 0, "2025-11-16"),
    )


def test_ensure_user_exists_db_error(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
    capsys: Any,
) -> None:
    """Test _ensure_user_exists handles database errors using mocked connection."""
    _, connection, cursor = mock_conn_fixture

    user = User(username="new_user", total_xp=0, last_processed_date=date(2025, 11, 16))
    cursor.execute.side_effect = sqlite3.Error("Insert failed")

    manager._ensure_user_exists(connection, user)

    captured = capsys.readouterr()
    assert (
        f"Error ensuring user '{user.username}' exists: Insert failed" in captured.out
    )


def test_save_user(
    manager: DatabaseDataManager,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test save_user executes the expected SQL statements."""
    mock_get_connection, _, cursor = mock_conn_fixture

    # Create test user with tasks
    user = User(username=DEFAULT_USERNAME)
    test_date = datetime(2023, 1, 1, 12, 0, 0)
    task1 = Task(
        id="task1", title="Task 1", creation_date=test_date, priority=Priority.LOW
    )
    task2 = Task(
        id="task2",
        title="Task 2",
        creation_date=test_date,
        priority=Priority.HIGH,
    )
    user.add_task(task1)
    user.add_task(task2)

    # Call save_user
    manager.save_user(user)

    # Verify connection and cursor usage
    mock_get_connection.assert_called_once()
    # Check specific SQL operations
    assert cursor.execute.call_count >= 2  # At least insert user and delete tasks

    # Check that executemany was called with the task data including priority
    # The last call to executemany should be for task insertion
    executemany_calls = [
        call for call in cursor.method_calls if call[0] == "executemany"
    ]
    assert executemany_calls  # Should have at least one executemany call

    # Extract the SQL and parameters from the last executemany call
    _, args, _ = executemany_calls[-1]
    sql, params = args

    # Check that the SQL contains all field names
    assert "priority" in sql
    assert "difficulty" in sql
    assert "duration" in sql
    assert "is_complete" in sql
    assert "creation_date" in sql
    assert "title" in sql
    assert "due_date" in sql
    assert "start_date" in sql
    assert (
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)" in sql
    )  # 17 parameters for all task fields

    # Check that the task parameters include all field values
    assert len(params) == 2  # Two tasks
    # Each task tuple has 17 elements:
    # (id, title, text_description, priority, difficulty, duration, is_complete, creation_date,
    #  due_date, start_date, icon, tags, project, subtasks, dependencies, history, username)
    assert params[0][0] == task1.id
    assert params[0][1] == task1.title
    assert params[0][2] == task1.text_description  # None by default
    assert params[0][3] == task1.priority.value
    assert params[0][4] == task1.difficulty.value
    assert params[0][5] == task1.duration.value
    assert params[0][6] == (1 if task1.is_complete else 0)
    # params[0][7] is creation_date string - just verify it exists
    assert isinstance(params[0][7], str)
    # params[0][8-10] are due_date, start_date, icon (all None by default)
    assert params[0][8] is None  # due_date
    assert params[0][9] is None  # start_date
    assert params[0][10] is None  # icon
    # params[0][11-15] are JSON strings for tags, project, subtasks, dependencies, history
    assert params[0][11] is None  # tags (empty list serialized as None)
    assert params[0][12] is None  # project
    assert params[0][13] is None  # subtasks
    assert params[0][14] is None  # dependencies
    assert params[0][15] is None  # history
    assert params[0][16] == user.username

    assert params[1][0] == task2.id
    assert params[1][1] == task2.title
    assert params[1][16] == user.username


def test_save_user_no_tasks(
    manager: DatabaseDataManager,
    mocker: Any,
    mock_conn_fixture: Tuple[Any, Any, Any],
) -> None:
    """Test saving a user with no tasks using mocked connection."""
    _, connection, cursor = mock_conn_fixture
    mock_ensure_user = mocker.patch.object(
        manager, "_ensure_user_exists", autospec=True
    )
    user_no_tasks = User(username="empty_user")

    manager.save_user(user_no_tasks)

    # Check that _ensure_user_exists was called correctly (without self)
    mock_ensure_user.assert_called_once_with(connection, user_no_tasks)
    # Should have 2 execute calls: UPDATE total_xp and DELETE tasks
    assert cursor.execute.call_count == 2
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
    mock_ensure_user.assert_called_once_with(connection, sample_user_db)
    cursor.execute.assert_called_once()
    cursor.executemany.assert_not_called()
    captured = capsys.readouterr()
    db_error = "Delete failed"
    user = sample_user_db.username
    error_msg = f"Error saving user '{user}' to database: {db_error}"
    assert error_msg in captured.out


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
    mock_ensure_user.assert_called_once_with(connection, sample_user_db)
    assert cursor.execute.call_count == 2  # UPDATE and DELETE calls
    assert cursor.executemany.call_count == 1  # INSERT is attempted once
    captured = capsys.readouterr()
    db_error = "Insert failed"
    user = sample_user_db.username
    error_msg = f"Error saving user '{user}' to database: {db_error}"
    assert error_msg in captured.out


def test_backend_type(manager: DatabaseDataManager) -> None:
    """Test the backend_type method returns 'db'."""
    assert manager.backend_type() == "db"


# Note: _connect and _close methods seem unused by the main logic
# (_get_connection is used). If they are indeed unused, they could be removed from the
# source code. We are not testing them here as they aren't part of the current public
# interface usage.


def test_init_connection_attributes(manager: DatabaseDataManager) -> None:
    """Test that __init__ initializes connection attributes correctly."""
    assert manager.conn is None
    assert manager.cursor is None


def test_connect_method(
    manager: DatabaseDataManager,
    mocker: Any,
) -> None:
    """Test the _connect method properly initializes a connection."""
    # Mock dependencies
    mock_get_config_path = mocker.patch(
        "motido.data.database_manager.get_config_path",
        return_value="/fake/config/path/config.json",
    )
    mock_sqlite_connect = mocker.patch("sqlite3.connect")
    mock_conn = MagicMock(spec=sqlite3.Connection)
    mock_cursor = MagicMock(spec=sqlite3.Cursor)
    mock_sqlite_connect.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cursor

    # Call the method
    manager._connect()

    # Verify behavior
    mock_get_config_path.assert_called_once()
    expected_db_path = os.path.join(
        os.path.dirname("/fake/config/path/config.json"), DB_NAME
    )
    mock_sqlite_connect.assert_called_once_with(expected_db_path)
    assert manager.conn == mock_conn
    assert manager.cursor == mock_cursor


def test_close_method_with_connection(
    manager: DatabaseDataManager,
    mocker: Any,
) -> None:
    """Test the _close method properly closes an open connection."""
    # Set up a mock connection
    mock_conn = MagicMock(spec=sqlite3.Connection)
    mock_cursor = MagicMock(spec=sqlite3.Cursor)

    # Manually set the connection and cursor
    manager.conn = mock_conn
    manager.cursor = mock_cursor

    # Call the method
    manager._close()

    # Verify behavior
    mock_conn.commit.assert_called_once()
    mock_conn.close.assert_called_once()
    assert manager.conn is None
    assert manager.cursor is None


def test_close_method_without_connection(manager: DatabaseDataManager) -> None:
    """Test the _close method handles the case where there's no connection."""
    # Ensure conn is None
    manager.conn = None
    manager.cursor = None

    # Call the method (should not raise any exceptions)
    manager._close()

    # No assertions needed for this test case - just checking it doesn't fail
