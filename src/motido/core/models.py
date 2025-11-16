# core/models.py
"""
Defines the core data models for the Moti-Do application.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
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
            return "teal"  # Changed from no color to teal
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


class Difficulty(str, Enum):
    """Difficulty levels for tasks."""

    TRIVIAL = "Trivial"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    HERCULEAN = "Herculean"

    def emoji(self) -> str:
        """Returns emoji representation of the difficulty level."""
        if self == Difficulty.TRIVIAL:
            return "🍭"  # Lollipop
        elif self == Difficulty.LOW:
            return "🪶"  # Feather
        elif self == Difficulty.MEDIUM:
            return "🧱"  # Brick
        elif self == Difficulty.HIGH:
            return "🧗"  # Person climbing
        elif self == Difficulty.HERCULEAN:
            return "🦾"  # Mechanical arm
        else:
            return ""  # Fallback # pragma: no cover

    def display_style(self) -> str:
        """Returns rich console style string for the difficulty."""
        if self == Difficulty.TRIVIAL:
            return "teal"
        elif self == Difficulty.LOW:
            return "green"
        elif self == Difficulty.MEDIUM:
            return "yellow"
        elif self == Difficulty.HIGH:
            return "orange1"
        elif self == Difficulty.HERCULEAN:
            return "red"
        else:
            return ""  # Fallback # pragma: no cover


class Duration(str, Enum):
    """Duration levels for tasks from shortest to longest."""

    MINISCULE = "Miniscule"
    SHORT = "Short"
    MEDIUM = "Medium"
    LONG = "Long"
    ODYSSEYAN = "Odysseyan"

    def emoji(self) -> str:
        """Returns emoji representation of the duration level."""
        if self == Duration.MINISCULE:
            return "💨"  # Wind blowing
        elif self == Duration.SHORT:
            return "⏳"  # Hourglass not done
        elif self == Duration.MEDIUM:
            return "🕰️"  # Mantelpiece clock
        elif self == Duration.LONG:
            return "⏱️"  # Stopwatch
        elif self == Duration.ODYSSEYAN:
            return "♾️"  # Infinity
        else:
            return ""  # Fallback # pragma: no cover

    def display_style(self) -> str:
        """Returns rich console style string for the duration."""
        if self == Duration.MINISCULE:
            return "teal"
        elif self == Duration.SHORT:
            return "green"
        elif self == Duration.MEDIUM:
            return "yellow"
        elif self == Duration.LONG:
            return "orange1"
        elif self == Duration.ODYSSEYAN:
            return "red"
        else:
            return ""  # Fallback # pragma: no cover


@dataclass
class Task:  # pylint: disable=too-many-instance-attributes
    """Represents a single task."""

    description: str
    creation_date: datetime
    # Use a factory to generate a unique ID upon creation.
    # The ID is represented as a string for easier serialization (JSON, DB).
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    title: str | None = None
    priority: Priority = field(default=Priority.LOW)
    difficulty: Difficulty = field(default=Difficulty.TRIVIAL)
    duration: Duration = field(default=Duration.MINISCULE)
    is_complete: bool = field(default=False)
    due_date: datetime | None = None
    start_date: datetime | None = None
    icon: str | None = None
    tags: List[str] = field(default_factory=list)
    project: str | None = None
    subtasks: List[dict] = field(
        default_factory=list
    )  # {"text": str, "complete": bool}
    dependencies: List[str] = field(default_factory=list)  # List of task IDs

    def __str__(self) -> str:
        """String representation for simple display."""
        # Format creation_date as YYYY-MM-DD HH:MM:SS
        formatted_date = self.creation_date.strftime("%Y-%m-%d %H:%M:%S")
        status_indicator = "[✓]" if self.is_complete else "[ ]"
        return (
            f"{status_indicator} ID: {self.id[:8]} | Priority: {self.priority.emoji()} {self.priority.value} "
            f"| Duration: {self.duration.emoji()} {self.duration.value} "
            f"| Created: {formatted_date} | Description: {self.description}"  # Show partial ID
        )


@dataclass
class User:
    """Represents a user and their associated tasks."""

    username: str
    total_xp: int = 0
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
