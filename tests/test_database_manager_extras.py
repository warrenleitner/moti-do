"""Additional tests for DatabaseDataManager to improve code coverage."""

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
