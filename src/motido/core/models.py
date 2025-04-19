# core/models.py
"""
Defines the core data models for the Moti-Do application.
"""

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import List


class Priority(str, Enum):
    """Priority levels for tasks from least to most important."""

    TRIVIAL = "Trivial"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    DEFCON_ONE = "Defcon One"

    def emoji(self) -> str:
        """Returns emoji representation of the priority level."""
        if self == Priority.TRIVIAL:
            return "🔹"  # Blue diamond
        elif self == Priority.LOW:
            return "🟢"  # Green circle
        elif self == Priority.MEDIUM:
            return "🟡"  # Yellow circle
        elif self == Priority.HIGH:
            return "🟠"  # Orange circle
        elif self == Priority.DEFCON_ONE:
            return "🔴"  # Red circle
        else:
            return ""  # Fallback # pragma: no cover

    def display_style(self) -> str:
        """Returns rich console style string for the priority."""
        if self == Priority.TRIVIAL:
            return ""  # No color
        elif self == Priority.LOW:
            return "green"
        elif self == Priority.MEDIUM:
            return "yellow"
        elif self == Priority.HIGH:
            return "orange1"
        elif self == Priority.DEFCON_ONE:
            return "red"
        else:
            return ""  # Fallback # pragma: no cover


@dataclass
class Task:
    """Represents a single task."""

    description: str
    # Use a factory to generate a unique ID upon creation.
    # The ID is represented as a string for easier serialization (JSON, DB).
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    priority: Priority = field(default=Priority.LOW)

    def __str__(self) -> str:
        """String representation for simple display."""
        return (
            f"ID: {self.id[:8]} | Priority: {self.priority.emoji()} {self.priority.value} "
            f"| Description: {self.description}"  # Show partial ID
        )


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
        if len(matching_tasks) > 1:
            raise ValueError(
                f"Ambiguous ID prefix '{task_id_prefix}'. Multiple tasks found."
            )
        # else:

        return None

    def add_task(self, task: Task) -> None:
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
