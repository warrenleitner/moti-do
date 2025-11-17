# data/json_manager.py
"""
Implementation of the DataManager interface using JSON file storage.
"""

import json
import os
from datetime import date, datetime
from typing import Any, Dict

from motido.core.models import Difficulty, Duration, Priority, Task, User
from motido.core.utils import (
    parse_difficulty_safely,
    parse_duration_safely,
    parse_priority_safely,
)

from .abstraction import DEFAULT_USERNAME, DataManager
from .config import get_config_path

DATA_DIR = "motido_data"
USERS_FILE = "users.json"


class JsonDataManager(DataManager):
    """Manages data persistence using a JSON file."""

    def __init__(self) -> None:
        """Initializes the JSON data manager."""
        self._data_path = self._get_data_path()

    def _get_data_path(self) -> str:
        """Gets the path to the main data file (users.json)."""
        # Place data directory at the same level as the config file (within the package)
        package_data_dir = os.path.dirname(get_config_path())
        data_dir_path = os.path.join(package_data_dir, DATA_DIR)
        return os.path.join(data_dir_path, USERS_FILE)

    def _ensure_data_dir_exists(self) -> None:
        """Creates the data directory if it doesn't exist."""
        os.makedirs(os.path.dirname(self._data_path), exist_ok=True)

    def initialize(self) -> None:
        """
        Ensures the data directory exists.
        Creates an empty data file if it doesn't exist.
        """
        self._ensure_data_dir_exists()
        if not os.path.exists(self._data_path):
            # Create an empty structure if the file is new
            self._write_data({})  # Start with an empty JSON object
            print(f"Initialized empty data file at: {self._data_path}")
        else:
            print(f"Data file already exists at: {self._data_path}")

    def _read_data(self) -> Dict[str, Any]:
        """
        Reads user data from the JSON file.

        Returns:
            A dictionary containing all user data from the file.
        """
        try:
            if not os.path.exists(self._data_path):
                # Return empty dict if file doesn't exist yet
                return {}
            with open(self._data_path, "r", encoding="utf-8") as file:
                data = json.load(file)
                # Return loaded data, defaulting to empty dict if file was empty
                return data if data else {}
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON data: {e}")
            # In case of corrupted file, return empty dict (could be handled better)
            return {}
        except IOError as e:
            print(f"Error reading data file: {e}")  # pragma: no cover
            # In case of file access error, return empty dict (could be handled better)
            return {}  # pragma: no cover

    def _write_data(self, data: Dict[str, Any]) -> None:
        """
        Writes user data to the JSON file.

        Args:
            data: The dictionary containing user data to write.
        """
        try:
            self._ensure_data_dir_exists()  # Ensure dir exists before writing
            with open(self._data_path, "w", encoding="utf-8") as file:
                json.dump(data, file, indent=2)  # Pretty-print with 2-space indent
        except IOError as e:
            print(f"Error writing to data file: {e}")
            raise  # Re-raise to signal failure to the caller

    def _parse_datetime_field(
        self, date_str: str | None, field_name: str, task_id: str | None
    ) -> datetime | None:
        """Parse a datetime field from string, returning None if invalid."""
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
        except ValueError:
            print(f"Warning: Invalid {field_name} format for task {task_id}, ignoring.")
            return None

    def _deserialize_task(self, task_dict: Dict[str, Any]) -> Task:
        """Deserialize a task dictionary into a Task object."""
        # pylint: disable=too-many-locals
        task_id = task_dict.get("id")

        # Parse enums
        priority = parse_priority_safely(
            task_dict.get("priority", Priority.LOW.value), task_id
        )
        difficulty = parse_difficulty_safely(
            task_dict.get("difficulty", Difficulty.TRIVIAL.value), task_id
        )
        duration = parse_duration_safely(
            task_dict.get("duration", Duration.MINISCULE.value), task_id
        )

        # Parse dates
        creation_date = (
            self._parse_datetime_field(
                task_dict.get("creation_date"), "creation_date", task_id
            )
            or datetime.now()
        )
        due_date = self._parse_datetime_field(
            task_dict.get("due_date"), "due_date", task_id
        )
        start_date = self._parse_datetime_field(
            task_dict.get("start_date"), "start_date", task_id
        )

        # Handle migration from old 'description' field to new 'title' field
        title = task_dict.get("title") or task_dict.get("description", "Untitled Task")

        return Task(
            id=task_dict["id"],
            title=title,
            text_description=task_dict.get("text_description"),
            creation_date=creation_date,
            priority=priority,
            difficulty=difficulty,
            duration=duration,
            is_complete=task_dict.get("is_complete", False),
            due_date=due_date,
            start_date=start_date,
            icon=task_dict.get("icon"),
            tags=task_dict.get("tags", []),
            project=task_dict.get("project"),
            subtasks=task_dict.get("subtasks", []),
            dependencies=task_dict.get("dependencies", []),
            history=task_dict.get("history", []),
        )

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """Loads a specific user's data from the JSON file."""
        # Placeholder for future sync: Check for remote changes before loading
        print(f"Loading user '{username}' from JSON...")
        all_data = self._read_data()
        user_data = all_data.get(username)

        if user_data:
            try:
                # Deserialize tasks
                tasks = [
                    self._deserialize_task(task_dict)
                    for task_dict in user_data.get("tasks", [])
                ]

                # Create User object
                total_xp = user_data.get("total_xp", 0)

                # Parse last_processed_date if present
                last_processed_str = user_data.get("last_processed_date")
                if last_processed_str:
                    last_processed = date.fromisoformat(last_processed_str)
                else:
                    last_processed = date.today()

                user = User(
                    username=user_data.get("username", username),
                    total_xp=total_xp,
                    tasks=tasks,
                    last_processed_date=last_processed,
                )
                print(f"User '{username}' loaded successfully.")
                return user
            except TypeError as e:  # pragma: no cover
                print(f"Error deserializing user data for '{username}': {e}")
                return None  # Or handle corrupted data more gracefully
        else:
            print(f"User '{username}' not found in JSON data.")
            # Optionally create a new user here if desired
            # return User(username=username)
            return None

    def save_user(self, user: User) -> None:
        """Saves a specific user's data to the JSON file."""
        print(f"Saving user '{user.username}' to JSON...")
        all_data = self._read_data()

        # Serialize tasks
        tasks_data = [
            {
                "id": task.id,
                "title": task.title,
                "text_description": task.text_description,
                "priority": task.priority.value,  # Save the priority value as string
                "difficulty": task.difficulty.value,  # Save the difficulty value
                "duration": task.duration.value,  # Save the duration value
                "is_complete": task.is_complete,  # Save the completion status
                "creation_date": (
                    task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
                    if task.creation_date
                    else None
                ),
                "due_date": (
                    task.due_date.strftime("%Y-%m-%d %H:%M:%S")
                    if task.due_date
                    else None
                ),
                "start_date": (
                    task.start_date.strftime("%Y-%m-%d %H:%M:%S")
                    if task.start_date
                    else None
                ),
                "icon": task.icon,
                "tags": task.tags,
                "project": task.project,
                "subtasks": task.subtasks,
                "dependencies": task.dependencies,
                "history": task.history,
            }
            for task in user.tasks
        ]
        # Prepare user data for JSON
        user_data = {
            "username": user.username,
            "total_xp": user.total_xp,
            "tasks": tasks_data,
            "last_processed_date": user.last_processed_date.isoformat(),
        }

        # Update the specific user's data in the overall structure
        all_data[user.username] = user_data
        self._write_data(all_data)
        print(f"User '{user.username}' saved successfully.")
        # Placeholder for future sync: Push changes to remote after saving

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "json"
