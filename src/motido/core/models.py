# core/models.py
"""
Defines the core data models for the Moti-Do application.
"""

import uuid
from dataclasses import dataclass, field
from typing import List


@dataclass
class Task:
    """Represents a single task."""

    description: str
    # Use a factory to generate a unique ID upon creation.
    # The ID is represented as a string for easier serialization (JSON, DB).
    id: str = field(default_factory=lambda: str(uuid.uuid4()))

    def __str__(self):
        """String representation for simple display."""
        return f"ID: {self.id[:8]} | Description: {self.description}"  # Show partial ID


@dataclass
class User:
    """Represents a user and their associated tasks."""

    username: str
    tasks: List[Task] = field(default_factory=list)

    def find_task_by_id(self, task_id_prefix: str) -> Task | None:
        """
        Finds a task by its full or partial ID prefix.

        Args:
            task_id_prefix: The full or partial ID to search for.

        Returns:
            The matching Task object if found and unique, otherwise None.
            Raises ValueError if the prefix matches multiple tasks.
        """
        matching_tasks = [
            task for task in self.tasks if task.id.startswith(task_id_prefix)
        ]
        if len(matching_tasks) == 1:
            return matching_tasks[0]
        elif len(matching_tasks) > 1:
            raise ValueError(
                f"Ambiguous ID prefix '{task_id_prefix}'. Multiple tasks found."
            )
        else:
            return None

    def add_task(self, task: Task):
        """Adds a task to the user's list."""
        self.tasks.append(task)

    def remove_task(self, task_id: str) -> bool:
        """
        Removes a task by its full ID.

        Args:
            task_id: The full ID of the task to remove.

        Returns:
            True if the task was found and removed, False otherwise.
        """
        initial_length = len(self.tasks)
        self.tasks = [task for task in self.tasks if task.id != task_id]
        return len(self.tasks) < initial_length
