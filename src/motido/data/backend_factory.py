# data/backend_factory.py
# pylint: disable=import-outside-toplevel
"""
Factory function to create the appropriate DataManager instance
based on the application's configuration.
"""

import os
from typing import Optional

from .abstraction import DataManager
from .config import load_config
from .database_manager import DatabaseDataManager
from .json_manager import JsonDataManager

# Singleton instance cache - mutable module-level state (not constants)
# pylint: disable=invalid-name
_data_manager_instance: Optional[DataManager] = None
_backend_message_shown = False  # Track if backend type message was shown
# pylint: enable=invalid-name


def reset_data_manager() -> None:
    """
    Reset the singleton data manager instance.

    This is primarily for testing purposes to ensure a clean state
    between tests.
    """
    # pylint: disable=global-statement
    global _data_manager_instance, _backend_message_shown
    _data_manager_instance = None
    _backend_message_shown = False


def get_data_manager() -> DataManager:
    """
    Reads the configuration and returns an instance of the
    configured DataManager (JSON, SQLite DB, or PostgreSQL).

    Uses a singleton pattern to avoid creating multiple instances
    and reduce duplicate initialization messages.

    The backend is determined in this order:
    1. DATABASE_URL environment variable -> PostgreSQL
    2. Config file backend setting -> JSON or SQLite
    3. Default -> JSON

    Returns:
        An instance implementing the DataManager interface.

    Raises:
        ValueError: If the configured backend type is unknown.
    """
    # pylint: disable=global-statement
    global _data_manager_instance, _backend_message_shown

    # Return cached instance if available
    if _data_manager_instance is not None:
        return _data_manager_instance

    # Check for PostgreSQL via DATABASE_URL (used by Vercel Postgres)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        if not _backend_message_shown:
            print("Using PostgreSQL backend (DATABASE_URL detected).")
            _backend_message_shown = True
        # Import here to avoid requiring psycopg2 when not needed
        from .postgres_manager import PostgresDataManager

        _data_manager_instance = PostgresDataManager(database_url)
        return _data_manager_instance

    # Fall back to config file
    config = load_config()
    backend_type = config.get("backend", "json")  # Default to json if missing

    if backend_type == "json":
        if not _backend_message_shown:
            print("Using JSON backend.")
            _backend_message_shown = True
        _data_manager_instance = JsonDataManager()
        return _data_manager_instance
    if backend_type == "db":
        if not _backend_message_shown:
            print("Using Database (SQLite) backend.")
            _backend_message_shown = True
        _data_manager_instance = DatabaseDataManager()
        return _data_manager_instance
    if backend_type == "postgres":
        # Allow explicit postgres config even without DATABASE_URL
        if not _backend_message_shown:
            print("Using PostgreSQL backend (config).")
            _backend_message_shown = True
        from .postgres_manager import PostgresDataManager

        _data_manager_instance = PostgresDataManager()
        return _data_manager_instance

    # Should ideally not happen due to config loading validation, but good practice
    raise ValueError(f"Unknown backend type configured: '{backend_type}'")
