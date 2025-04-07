# data/backend_factory.py
"""
Factory function to create the appropriate DataManager instance
based on the application's configuration.
"""

from .abstraction import DataManager
from .json_manager import JsonDataManager
from .database_manager import DatabaseDataManager
from .config import load_config

def get_data_manager() -> DataManager:
    """
    Reads the configuration and returns an instance of the
    configured DataManager (JSON or DB).

    Returns:
        An instance implementing the DataManager interface.

    Raises:
        ValueError: If the configured backend type is unknown.
    """
    config = load_config()
    backend_type = config.get("backend", "json") # Default to json if missing

    if backend_type == "json":
        print("Using JSON backend.")
        return JsonDataManager()
    elif backend_type == "db":
        print("Using Database (SQLite) backend.")
        return DatabaseDataManager()
    else:
        # Should ideally not happen due to config loading validation, but good practice
        raise ValueError(f"Unknown backend type configured: '{backend_type}'")

