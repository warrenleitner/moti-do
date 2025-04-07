# data/json_manager.py
"""
Implementation of the DataManager interface using JSON file storage.
"""

import json
import os
from typing import Dict, Any
from .abstraction import DataManager, DEFAULT_USERNAME
from core.models import User, Task

DATA_DIR = "data"
JSON_FILENAME = "data.json"

class JsonDataManager(DataManager):
    """Manages data persistence using a JSON file."""

    def __init__(self):
        """Initializes the JSON data manager."""
        self._data_path = self._get_data_path()

    def _get_data_path(self) -> str:
        """Constructs the full path to the JSON data file."""
        # Assumes data is one level down from the project root
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir_path = os.path.join(project_root, DATA_DIR)
        return os.path.join(data_dir_path, JSON_FILENAME)

    def _ensure_data_dir_exists(self):
        """Creates the data directory if it doesn't exist."""
        os.makedirs(os.path.dirname(self._data_path), exist_ok=True)

    def initialize(self):
        """
        Ensures the data directory exists.
        Creates an empty data file if it doesn't exist.
        """
        self._ensure_data_dir_exists()
        if not os.path.exists(self._data_path):
            # Create an empty structure if the file is new
            self._write_data({}) # Start with an empty JSON object
            print(f"Initialized empty data file at: {self._data_path}")
        else:
            print(f"Data file already exists at: {self._data_path}")

    def _read_data(self) -> Dict[str, Any]:
        """Reads the entire data structure from the JSON file."""
        self._ensure_data_dir_exists()
        if not os.path.exists(self._data_path):
            return {} # Return empty dict if file doesn't exist

        try:
            with open(self._data_path, 'r', encoding='utf-8') as f:
                # Handle empty file case
                content = f.read()
                if not content:
                    return {}
                return json.loads(content)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading data file '{self._data_path}': {e}. Returning empty data.")
            # Consider backup/recovery mechanism here in a real app
            return {}

    def _write_data(self, data: Dict[str, Any]):
        """Writes the entire data structure to the JSON file."""
        self._ensure_data_dir_exists()
        try:
            with open(self._data_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
        except IOError as e:
            print(f"Error writing data file '{self._data_path}': {e}")

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """Loads a specific user's data from the JSON file."""
        # Placeholder for future sync: Check for remote changes before loading
        print(f"Loading user '{username}' from JSON...")
        all_data = self._read_data()
        user_data = all_data.get(username)

        if user_data:
            try:
                # Deserialize tasks
                tasks = [Task(**task_dict) for task_dict in user_data.get("tasks", [])]
                # Create User object
                user = User(username=user_data.get("username", username), tasks=tasks)
                print(f"User '{username}' loaded successfully.")
                return user
            except TypeError as e:
                 print(f"Error deserializing user data for '{username}': {e}")
                 return None # Or handle corrupted data more gracefully
        else:
            print(f"User '{username}' not found in JSON data.")
            # Optionally create a new user here if desired
            # return User(username=username)
            return None


    def save_user(self, user: User):
        """Saves a specific user's data to the JSON file."""
        print(f"Saving user '{user.username}' to JSON...")
        all_data = self._read_data()

        # Serialize tasks
        tasks_data = [{"id": task.id, "description": task.description} for task in user.tasks]
        # Prepare user data for JSON
        user_data = {
            "username": user.username,
            "tasks": tasks_data
        }

        # Update the specific user's data in the overall structure
        all_data[user.username] = user_data
        self._write_data(all_data)
        print(f"User '{user.username}' saved successfully.")
        # Placeholder for future sync: Push changes to remote after saving

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "json"

