"""Tests for the backend factory module.

This module contains tests for the get_data_manager factory function,
which creates the appropriate DataManager instance based on configuration.
The tests verify that:
- The correct manager type is returned for each backend configuration
- The configuration is properly loaded
- Appropriate messages are printed
- Invalid configurations raise appropriate errors
"""

from typing import Any
from unittest.mock import MagicMock, patch

import pytest

# Import the factory function and the classes it might return
from motido.data.backend_factory import get_data_manager
from motido.data.database_manager import DatabaseDataManager
from motido.data.json_manager import JsonDataManager


@patch("motido.data.backend_factory.load_config")
@patch("motido.data.backend_factory.JsonDataManager")
@patch("motido.data.backend_factory.DatabaseDataManager")  # Keep this mocked
@patch("motido.data.backend_factory.print")  # Mock print
def test_get_data_manager_json_backend(
    mock_print: Any, mock_db_manager: Any, mock_json_manager: Any, mock_load_config: Any
) -> None:
    """Test factory returns JsonDataManager for 'json' config."""
    # Configure mocks
    mock_load_config.return_value = {"backend": "json"}
    mock_json_instance = MagicMock(spec=JsonDataManager)
    mock_json_manager.return_value = mock_json_instance

    # Call the factory
    manager = get_data_manager()

    # Assertions
    mock_load_config.assert_called_once()
    mock_json_manager.assert_called_once()
    mock_db_manager.assert_not_called()
    assert isinstance(manager, JsonDataManager)
    assert manager == mock_json_instance
    mock_print.assert_called_once_with("Using JSON backend.")


@patch("motido.data.backend_factory.load_config")
@patch("motido.data.backend_factory.JsonDataManager")  # Keep this mocked
@patch("motido.data.backend_factory.DatabaseDataManager")
@patch("motido.data.backend_factory.print")  # Mock print
def test_get_data_manager_db_backend(
    mock_print: Any, mock_db_manager: Any, mock_json_manager: Any, mock_load_config: Any
) -> None:
    """Test factory returns DatabaseDataManager for 'db' config."""
    # Configure mocks
    mock_load_config.return_value = {"backend": "db"}
    mock_db_instance = MagicMock(spec=DatabaseDataManager)
    mock_db_manager.return_value = mock_db_instance

    # Call the factory
    manager = get_data_manager()

    # Assertions
    mock_load_config.assert_called_once()
    mock_db_manager.assert_called_once()
    mock_json_manager.assert_not_called()
    assert isinstance(manager, DatabaseDataManager)
    assert manager == mock_db_instance
    mock_print.assert_called_once_with("Using Database (SQLite) backend.")


@patch("motido.data.backend_factory.load_config")
@patch("motido.data.backend_factory.JsonDataManager")
@patch("motido.data.backend_factory.DatabaseDataManager")  # Keep this mocked
@patch("motido.data.backend_factory.print")  # Mock print
def test_get_data_manager_default_backend(
    mock_print: Any, mock_db_manager: Any, mock_json_manager: Any, mock_load_config: Any
) -> None:
    """Test factory defaults to JsonDataManager when backend key is missing."""
    # Configure mocks
    mock_load_config.return_value = {}  # Simulate missing key
    mock_json_instance = MagicMock(spec=JsonDataManager)
    mock_json_manager.return_value = mock_json_instance

    # Call the factory
    manager = get_data_manager()

    # Assertions
    mock_load_config.assert_called_once()
    mock_json_manager.assert_called_once()
    mock_db_manager.assert_not_called()
    assert isinstance(manager, JsonDataManager)
    assert manager == mock_json_instance
    mock_print.assert_called_once_with("Using JSON backend.")  # Check default message


@patch("motido.data.backend_factory.load_config")
@patch("motido.data.backend_factory.JsonDataManager")
@patch("motido.data.backend_factory.DatabaseDataManager")
@patch("motido.data.backend_factory.print")  # Mock print
def test_get_data_manager_unknown_backend(
    mock_print: Any, mock_db_manager: Any, mock_json_manager: Any, mock_load_config: Any
) -> None:
    """Test factory raises ValueError for unknown backend type."""
    # Configure mocks
    unknown_backend_type = "invalid_backend"
    mock_load_config.return_value = {"backend": unknown_backend_type}

    # Call the factory and assert exception
    with pytest.raises(ValueError) as excinfo:
        get_data_manager()

    assert (
        str(excinfo.value)
        == f"Unknown backend type configured: '{unknown_backend_type}'"
    )

    # Assertions
    mock_load_config.assert_called_once()
    mock_json_manager.assert_not_called()
    mock_db_manager.assert_not_called()
    mock_print.assert_not_called()  # No backend message should be printed


@patch("motido.data.backend_factory.os.getenv")
@patch("motido.data.postgres_manager.PostgresDataManager")
@patch("motido.data.backend_factory.print")
def test_get_data_manager_postgres_via_database_url(
    mock_print: Any, mock_postgres_manager: Any, mock_getenv: Any
) -> None:
    """Test factory returns PostgresDataManager when DATABASE_URL is set."""
    # Configure mocks
    database_url = "postgresql://user:password@localhost/testdb"
    mock_getenv.return_value = database_url
    mock_postgres_instance = MagicMock()
    mock_postgres_manager.return_value = mock_postgres_instance

    # Call the factory
    manager = get_data_manager()

    # Assertions
    mock_getenv.assert_called_once_with("DATABASE_URL")
    mock_postgres_manager.assert_called_once_with(database_url)
    assert manager == mock_postgres_instance
    mock_print.assert_called_once_with(
        "Using PostgreSQL backend (DATABASE_URL detected)."
    )


@patch("motido.data.backend_factory.os.getenv")
@patch("motido.data.backend_factory.load_config")
@patch("motido.data.postgres_manager.PostgresDataManager")
@patch("motido.data.backend_factory.print")
def test_get_data_manager_postgres_via_config(
    mock_print: Any, mock_postgres_manager: Any, mock_load_config: Any, mock_getenv: Any
) -> None:
    """Test factory returns PostgresDataManager when 'postgres' is in config."""
    # Configure mocks - no DATABASE_URL, but config has postgres
    mock_getenv.return_value = None
    mock_load_config.return_value = {"backend": "postgres"}
    mock_postgres_instance = MagicMock()
    mock_postgres_manager.return_value = mock_postgres_instance

    # Call the factory
    manager = get_data_manager()

    # Assertions
    mock_getenv.assert_called_once_with("DATABASE_URL")
    mock_load_config.assert_called_once()
    mock_postgres_manager.assert_called_once_with()
    assert manager == mock_postgres_instance
    mock_print.assert_called_once_with("Using PostgreSQL backend (config).")
