# data/json_manager.py
"""
Implementation of the DataManager interface using JSON file storage.
"""

import json
import os
import uuid
from datetime import date, datetime
from typing import Any, Dict

from motido.core.models import (
    Badge,
    Difficulty,
    Duration,
    Priority,
    Project,
    RecurrenceType,
    Tag,
    Task,
    User,
    XPTransaction,
)
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
            task_dict.get("duration", Duration.MINUSCULE.value), task_id
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

        # Parse recurrence type
        recurrence_type_str = task_dict.get("recurrence_type")
        recurrence_type = None
        if recurrence_type_str:
            try:
                recurrence_type = RecurrenceType(recurrence_type_str)
            except ValueError:
                pass  # Handle invalid enum value

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
            is_habit=task_dict.get("is_habit", False),
            recurrence_rule=task_dict.get("recurrence_rule"),
            recurrence_type=recurrence_type,
            streak_current=task_dict.get("streak_current", 0),
            streak_best=task_dict.get("streak_best", 0),
            parent_habit_id=task_dict.get("parent_habit_id"),
        )

    def _deserialize_xp_transaction(self, trans_dict: Dict[str, Any]) -> XPTransaction:
        """Deserialize an XP transaction dictionary."""
        timestamp_str = trans_dict.get("timestamp")
        timestamp = (
            self._parse_datetime_field(timestamp_str, "timestamp", None)
            or datetime.now()
        )
        return XPTransaction(
            id=trans_dict.get("id", str(uuid.uuid4())),
            amount=trans_dict.get("amount", 0),
            source=trans_dict.get("source", "task_completion"),
            timestamp=timestamp,
            task_id=trans_dict.get("task_id"),
            description=trans_dict.get("description", ""),
        )

    def _deserialize_badge(self, badge_dict: Dict[str, Any]) -> Badge:
        """Deserialize a badge dictionary."""
        earned_date_str = badge_dict.get("earned_date")
        earned_date = self._parse_datetime_field(earned_date_str, "earned_date", None)
        return Badge(
            id=badge_dict.get("id", str(uuid.uuid4())),
            name=badge_dict.get("name", "Unknown"),
            description=badge_dict.get("description", ""),
            glyph=badge_dict.get("glyph", "🏆"),
            earned_date=earned_date,
        )

    def _deserialize_tag(self, tag_dict: Dict[str, Any]) -> Tag:
        """Deserialize a tag dictionary."""
        return Tag(
            id=tag_dict.get("id", str(uuid.uuid4())),
            name=tag_dict.get("name", "Unknown"),
            color=tag_dict.get("color", "#808080"),
        )

    def _deserialize_project(self, project_dict: Dict[str, Any]) -> Project:
        """Deserialize a project dictionary."""
        return Project(
            id=project_dict.get("id", str(uuid.uuid4())),
            name=project_dict.get("name", "Unknown"),
            color=project_dict.get("color", "#4A90D9"),
        )

    def deserialize_user_data(
        self, user_data: Dict[str, Any], username: str = DEFAULT_USERNAME
    ) -> User:
        """
        Deserialize user data dictionary into a User object.

        This is a public method that can be used for importing user data.

        Args:
            user_data: Dictionary containing user data
            username: Username to use if not present in user_data

        Returns:
            User object with deserialized data

        Raises:
            ValueError: If user_data is invalid or missing required fields
        """
        try:
            # Deserialize tasks
            tasks = [
                self._deserialize_task(task_dict)
                for task_dict in user_data.get("tasks", [])
            ]

            # Deserialize XP transactions
            xp_transactions = [
                self._deserialize_xp_transaction(trans_dict)
                for trans_dict in user_data.get("xp_transactions", [])
            ]

            # Deserialize badges
            badges = [
                self._deserialize_badge(badge_dict)
                for badge_dict in user_data.get("badges", [])
            ]

            # Deserialize defined tags
            defined_tags = [
                self._deserialize_tag(tag_dict)
                for tag_dict in user_data.get("defined_tags", [])
            ]

            # Deserialize defined projects
            defined_projects = [
                self._deserialize_project(proj_dict)
                for proj_dict in user_data.get("defined_projects", [])
            ]

            # Create User object
            total_xp = user_data.get("total_xp", 0)

            # Parse last_processed_date if present
            last_processed_str = user_data.get("last_processed_date")
            if last_processed_str:
                last_processed = date.fromisoformat(last_processed_str)
            else:
                last_processed = date.today()

            return User(
                username=user_data.get("username", username),
                total_xp=total_xp,
                password_hash=user_data.get("password_hash"),
                tasks=tasks,
                last_processed_date=last_processed,
                vacation_mode=user_data.get("vacation_mode", False),
                xp_transactions=xp_transactions,
                badges=badges,
                defined_tags=defined_tags,
                defined_projects=defined_projects,
            )
        except (TypeError, KeyError, ValueError) as e:
            raise ValueError(f"Invalid user data format: {e}") from e

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """Loads a specific user's data from the JSON file."""
        # Placeholder for future sync: Check for remote changes before loading
        print(f"Loading user '{username}' from JSON...")
        all_data = self._read_data()
        user_data = all_data.get(username)

        if user_data:
            try:
                user = self.deserialize_user_data(user_data, username)
                print(f"User '{username}' loaded successfully.")
                return user
            except ValueError as e:  # pragma: no cover
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
                "is_habit": task.is_habit,
                "recurrence_rule": task.recurrence_rule,
                "recurrence_type": (
                    task.recurrence_type.value if task.recurrence_type else None
                ),
                "streak_current": task.streak_current,
                "streak_best": task.streak_best,
                "parent_habit_id": task.parent_habit_id,
            }
            for task in user.tasks
        ]
        # Prepare user data for JSON
        user_data = {
            "username": user.username,
            "total_xp": user.total_xp,
            "password_hash": user.password_hash,
            "tasks": tasks_data,
            "last_processed_date": user.last_processed_date.isoformat(),
            "vacation_mode": user.vacation_mode,
            "xp_transactions": [
                {
                    "id": trans.id,
                    "amount": trans.amount,
                    "source": trans.source,
                    "timestamp": trans.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                    "task_id": trans.task_id,
                    "description": trans.description,
                }
                for trans in getattr(user, "xp_transactions", [])
            ],
            "badges": [
                {
                    "id": badge.id,
                    "name": badge.name,
                    "description": badge.description,
                    "glyph": badge.glyph,
                    "earned_date": (
                        badge.earned_date.strftime("%Y-%m-%d %H:%M:%S")
                        if badge.earned_date
                        else None
                    ),
                }
                for badge in getattr(user, "badges", [])
            ],
            "defined_tags": [
                {
                    "id": tag.id,
                    "name": tag.name,
                    "color": tag.color,
                }
                for tag in getattr(user, "defined_tags", [])
            ],
            "defined_projects": [
                {
                    "id": proj.id,
                    "name": proj.name,
                    "color": proj.color,
                }
                for proj in getattr(user, "defined_projects", [])
            ],
        }

        # Update the specific user's data in the overall structure
        all_data[user.username] = user_data
        self._write_data(all_data)
        print(f"User '{user.username}' saved successfully.")
        # Placeholder for future sync: Push changes to remote after saving

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "json"
