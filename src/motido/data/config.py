# data/config.py
"""
Handles loading and saving the application configuration,
specifically the chosen data backend.
"""

import json
import os
from typing import Any, Dict, cast
from unittest.mock import MagicMock, mock_open, patch

CONFIG_FILENAME = "config.json"
DEFAULT_BACKEND = "json"  # Default to JSON if no config exists


def get_config_path() -> str:
    """Gets the absolute path to the configuration file within the package data dir."""
    # Place config within the package's data directory
    package_data_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(package_data_dir, CONFIG_FILENAME)


def load_config() -> Dict[str, str]:
    """
    Loads the configuration from the config file.
    Returns default config if the file doesn't exist.
    """
    config_path = get_config_path()
    if not os.path.exists(config_path):
        # Return default config if file not found
        return {"backend": DEFAULT_BACKEND}
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            # Cast the result of json.load to the expected type
            config_data = cast(Dict[str, str], json.load(f))
            # Basic validation
            if "backend" not in config_data or config_data["backend"] not in [
                "json",
                "db",
            ]:
                print(
                    f"Warning: Invalid backend '{config_data.get('backend')}' in config. Using default '{DEFAULT_BACKEND}'."
                )
                return {"backend": DEFAULT_BACKEND}
            return config_data
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error loading config file '{config_path}': {e}. Using default config.")
        return {"backend": DEFAULT_BACKEND}


def save_config(config: Dict[str, str]) -> None:
    """Saves the configuration dictionary to the config file."""
    config_path = get_config_path()
    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=4)
        print(f"Configuration saved to {config_path}")
    except IOError as e:
        print(f"Error saving config file '{config_path}': {e}")
