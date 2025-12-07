# data/backend_factory.py
# pylint: disable=import-outside-toplevel
"""
Factory function to create the appropriate DataManager instance
based on the application's configuration.
"""

import os

from .abstraction import DataManager
from .config import load_config
from .database_manager import DatabaseDataManager
from .json_manager import JsonDataManager


def get_data_manager() -> DataManager:
    """
    Reads the configuration and returns an instance of the
    configured DataManager (JSON, SQLite DB, or PostgreSQL).

    The backend is determined in this order:
    1. DATABASE_URL environment variable -> PostgreSQL
    2. Config file backend setting -> JSON or SQLite
    3. Default -> JSON

    Returns:
        An instance implementing the DataManager interface.

    Raises:
        ValueError: If the configured backend type is unknown.
    """
    # Check for PostgreSQL via DATABASE_URL (used by Vercel Postgres)
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        print("Using PostgreSQL backend (DATABASE_URL detected).")
        # Import here to avoid requiring psycopg2 when not needed
        from .postgres_manager import PostgresDataManager

        return PostgresDataManager(database_url)

    # Fall back to config file
    config = load_config()
    backend_type = config.get("backend", "json")  # Default to json if missing

    if backend_type == "json":
        print("Using JSON backend.")
        return JsonDataManager()
    if backend_type == "db":
        print("Using Database (SQLite) backend.")
        return DatabaseDataManager()
    if backend_type == "postgres":
        # Allow explicit postgres config even without DATABASE_URL
        print("Using PostgreSQL backend (config).")
        from .postgres_manager import PostgresDataManager

        return PostgresDataManager()

    # Should ideally not happen due to config loading validation, but good practice
    raise ValueError(f"Unknown backend type configured: '{backend_type}'")
