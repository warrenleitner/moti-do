"""
Module: moti-do.library.persistence.json_repository
Description: Concrete implementation of repository interfaces using JSON files for persistence.
"""

import json
import os
from typing import List, Optional, Type, Dict, Any
from datetime import datetime

# Assuming models and repositories are in the parent 'library' directory
from ..task import Task, Tag, Project, User, ImportanceLevel, DifficultyLevel, DurationLevel, Subtask, Recurrence, HabitTracking, ChangeTracker, ScorePreferences, IMPORTANT_LEVELS, DIFFICULTY_LEVELS, DURATION_LEVELS
from ..repository import ITaskRepository, ITagRepository, IProjectRepository, IUserRepository

# Helper functions for custom JSON serialization/deserialization

def complex_encoder(obj):
    """Custom JSON encoder for complex types like datetime and custom objects."""
    if isinstance(obj, datetime):
        return {"__datetime__": True, "isoformat": obj.isoformat()}
    if hasattr(obj, '__dict__') or isinstance(obj, (ImportanceLevel, DifficultyLevel, DurationLevel)):
        # Handle dataclasses and simple value objects
        # Store class name for potential deserialization
        result = {'__class__': obj.__class__.__name__}
        # Use vars for dataclasses, direct access for simple objects
        data = vars(obj) if hasattr(obj, '__dict__') else {
            'selector': obj.selector,
            'name': obj.name,
            'color': obj.color,
            'weight': obj.weight
        }
        result.update(data)
        return result
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

def complex_decoder(dct: Dict[str, Any]) -> Any:
    """Custom JSON decoder for complex types."""
    if "__datetime__" in dct:
        return datetime.fromisoformat(dct["isoformat"])
    if "__class__" in dct:
        class_name = dct.pop("__class__")
        # Map class names to actual classes (adjust imports as needed)
        # This mapping needs to be comprehensive for all serialized classes
        cls_map = {
            "Task": Task,
            "Tag": Tag,
            "Project": Project,
            "User": User,
            "ImportanceLevel": ImportanceLevel,
            "DifficultyLevel": DifficultyLevel,
            "DurationLevel": DurationLevel,
            "Subtask": Subtask,
            "Recurrence": Recurrence,
            "HabitTracking": HabitTracking,
            "ChangeTracker": ChangeTracker,
            "ScorePreferences": ScorePreferences
            # Add other necessary classes here
        }

        cls = cls_map.get(class_name)

        if cls:
            # Handle predefined level objects specially
            if cls in (ImportanceLevel, DifficultyLevel, DurationLevel):
                selector = dct.get('selector')
                if cls is ImportanceLevel and selector in IMPORTANT_LEVELS:
                    return IMPORTANT_LEVELS[selector]
                if cls is DifficultyLevel and selector in DIFFICULTY_LEVELS:
                    return DIFFICULTY_LEVELS[selector]
                if cls is DurationLevel and selector in DURATION_LEVELS:
                    return DURATION_LEVELS[selector]
                # Fallback if selector not found (should not happen with encoder)
                return cls(**dct)
            else:
                 # Recursively decode nested dictionaries before passing to constructor
                decoded_dct = {k: complex_decoder(v) if isinstance(v, dict) else v for k, v in dct.items()}
                # Ensure lists containing dicts are also decoded
                for key, value in decoded_dct.items():
                    if isinstance(value, list):
                        decoded_dct[key] = [complex_decoder(item) if isinstance(item, dict) else item for item in value]

                try:
                    return cls(**decoded_dct)
                except TypeError as e:
                    print(f"Error instantiating {class_name} with args {decoded_dct}: {e}")
                    # Provide a default or raise a more specific error
                    return None # Or raise a DeserializationError
        else:
            # Handle cases where class name is not recognized
            print(f"Warning: Class '{class_name}' not found in cls_map during decoding.")
            return dct # Return the dict as is, or handle differently
    return dct


class JsonUserRepository(IUserRepository):
    """
    Implementation of IUserRepository using a single JSON file per user.
    The user file contains all associated tasks, tags, and projects.
    """

    def __init__(self, data_dir: str = "data"):
        """
        Initializes the repository, specifying the directory for user JSON files.

        Args:
            data_dir: The directory where user data files will be stored.
        """
        self.data_dir = data_dir
        os.makedirs(self.data_dir, exist_ok=True)

    def _get_user_filepath(self, user_id: str) -> str:
        """Gets the full path to a user's JSON file based on their ID."""
        # Using user ID for filename to ensure uniqueness
        return os.path.join(self.data_dir, f"user_{user_id}.json")

    def _load_user_data(self, user_id: str) -> Optional[User]:
        """Loads user data from a JSON file."""
        filepath = self._get_user_filepath(user_id)
        if not os.path.exists(filepath):
            return None
        try:
            with open(filepath, 'r') as f:
                user_data = json.load(f, object_hook=complex_decoder)
                # Ensure the loaded object is indeed a User instance
                if isinstance(user_data, User):
                    return user_data
                else:
                    print(f"Error: Expected User object, but got {type(user_data)} from {filepath}")
                    return None
        except (json.JSONDecodeError, IOError, TypeError) as e:
            print(f"Error loading user data from {filepath}: {e}")
            return None

    def _save_user_data(self, user: User) -> None:
        """Saves user data to a JSON file."""
        filepath = self._get_user_filepath(user.id)
        try:
            with open(filepath, 'w') as f:
                json.dump(user, f, default=complex_encoder, indent=4)
        except (IOError, TypeError) as e:
            print(f"Error saving user data to {filepath}: {e}")
            # Consider raising an exception here depending on error handling strategy

    # --- IUserRepository Implementation ---

    def get_by_id(self, id: str) -> Optional[User]:
        """Retrieves a user by their ID."""
        return self._load_user_data(id)

    def get_all(self) -> List[User]:
        """Retrieves all users stored in the data directory."""
        users: List[User] = []
        try:
            for filename in os.listdir(self.data_dir):
                if filename.startswith("user_") and filename.endswith(".json"):
                    user_id = filename.replace("user_", "").replace(".json", "")
                    user = self._load_user_data(user_id)
                    if user:
                        users.append(user)
        except OSError as e:
            print(f"Error reading user data directory {self.data_dir}: {e}")
        return users

    def save(self, entity: User) -> None:
        """
        Saves (creates or updates) a user. Assumes the User object has a valid ID.
        The entire user aggregate (including tasks, tags, projects) is saved.
        """
        if not entity or not hasattr(entity, 'id') or not entity.id:
             print("Error: Cannot save user without a valid ID.")
             return # Or raise an error
        # Update the last_update timestamp before saving
        entity.last_update = datetime.now()
        self._save_user_data(entity)

    def delete(self, id: str) -> None:
        """Deletes a user's data file."""
        filepath = self._get_user_filepath(id)
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
            else:
                print(f"Warning: User file not found for deletion: {filepath}")
        except OSError as e:
            print(f"Error deleting user file {filepath}: {e}")

    def get_by_name(self, name: str) -> Optional[User]:
        """
        Retrieves a user by name. This can be inefficient as it requires loading all users.
        Consider optimizing if frequent name lookups are needed (e.g., maintaining an index).
        """
        all_users = self.get_all()
        for user in all_users:
            if user.name == name:
                return user
        return None

# --- Concrete Implementations for Task, Tag, Project (using the User aggregate) ---
# These implementations assume data is managed primarily through the User object.
# They might seem less direct but align with the single-file-per-user approach.

class JsonTaskRepository(ITaskRepository):
    """
    Implementation of ITaskRepository using the User's JSON file.
    Requires a UserRepository instance to access the user data.
    """
    def __init__(self, user_repository: JsonUserRepository):
        self.user_repo = user_repository
        # Note: This implementation needs a way to associate tasks with a user.
        # It might require a 'current_user_id' or similar context.
        # For simplicity, let's assume a single-user context for now or
        # methods will require a user_id parameter.

    def get_by_id(self, id: str, user_id: str) -> Optional[Task]:
        """Gets a task by its ID, requires the user ID."""
        user = self.user_repo.get_by_id(user_id)
        if user:
            for task in user.tasks:
                if task.id == id:
                    return task
        return None

    def get_all(self, user_id: str) -> List[Task]:
        """Gets all tasks for a specific user."""
        user = self.user_repo.get_by_id(user_id)
        return user.tasks if user else []

    def save(self, entity: Task, user_id: str) -> None:
        """Saves a task for a specific user. Updates the user file."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            print(f"Error: User {user_id} not found. Cannot save task.")
            return

        # Find if task already exists to update, otherwise append
        task_index = -1
        for i, task in enumerate(user.tasks):
            if task.id == entity.id:
                task_index = i
                break

        entity.updated_at = datetime.now() # Ensure updated_at is set

        if task_index != -1:
            user.tasks[task_index] = entity
        else:
            user.tasks.append(entity)

        self.user_repo.save(user) # Save the entire user object

    def delete(self, id: str, user_id: str) -> None:
        """Deletes a task for a specific user. Updates the user file."""
        user = self.user_repo.get_by_id(user_id)
        if not user:
            print(f"Error: User {user_id} not found. Cannot delete task.")
            return

        initial_length = len(user.tasks)
        user.tasks = [task for task in user.tasks if task.id != id]

        if len(user.tasks) < initial_length:
            self.user_repo.save(user) # Save only if a task was removed
        else:
            print(f"Warning: Task {id} not found for user {user_id}. No deletion performed.")

# Similar implementations for JsonTagRepository and JsonProjectRepository
# would follow the pattern of requiring a user_id and modifying the User object.

class JsonTagRepository(ITagRepository):
    def __init__(self, user_repository: JsonUserRepository):
        self.user_repo = user_repository

    def get_by_id(self, id: str, user_id: str) -> Optional[Tag]:
        user = self.user_repo.get_by_id(user_id)
        if user:
            for tag in user.tags:
                if tag.id == id:
                    return tag
        return None

    def get_all(self, user_id: str) -> List[Tag]:
        user = self.user_repo.get_by_id(user_id)
        return user.tags if user else []

    def save(self, entity: Tag, user_id: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user: return
        tag_index = next((i for i, t in enumerate(user.tags) if t.id == entity.id), -1)
        if tag_index != -1:
            user.tags[tag_index] = entity
        else:
            user.tags.append(entity)
        self.user_repo.save(user)

    def delete(self, id: str, user_id: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user: return
        initial_length = len(user.tags)
        user.tags = [tag for tag in user.tags if tag.id != id]
        if len(user.tags) < initial_length:
            self.user_repo.save(user)

class JsonProjectRepository(IProjectRepository):
    def __init__(self, user_repository: JsonUserRepository):
        self.user_repo = user_repository

    def get_by_id(self, id: str, user_id: str) -> Optional[Project]:
        user = self.user_repo.get_by_id(user_id)
        if user:
            for project in user.projects:
                if project.id == id:
                    return project
        return None

    def get_all(self, user_id: str) -> List[Project]:
        user = self.user_repo.get_by_id(user_id)
        return user.projects if user else []

    def save(self, entity: Project, user_id: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user: return
        project_index = next((i for i, p in enumerate(user.projects) if p.id == entity.id), -1)
        if project_index != -1:
            user.projects[project_index] = entity
        else:
            user.projects.append(entity)
        self.user_repo.save(user)

    def delete(self, id: str, user_id: str) -> None:
        user = self.user_repo.get_by_id(user_id)
        if not user: return
        initial_length = len(user.projects)
        user.projects = [project for project in user.projects if project.id != id]
        if len(user.projects) < initial_length:
            self.user_repo.save(user) 