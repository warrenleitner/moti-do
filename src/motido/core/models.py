# core/models.py
"""
Defines the core data models for the Moti-Do application.
"""

import uuid
from dataclasses import dataclass, field
from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Literal

# Type for XP transaction sources
XPSource = Literal[
    "task_completion",
    "subtask_completion",
    "penalty",
    "withdrawal",
    "habit_completion",
    "manual_adjustment",
]

# Default colors for tags and projects
DEFAULT_TAG_COLORS = [
    "#FF6B6B",  # Red
    "#4ECDC4",  # Teal
    "#45B7D1",  # Light Blue
    "#96CEB4",  # Sage Green
    "#FFEAA7",  # Yellow
    "#DDA0DD",  # Plum
    "#98D8C8",  # Mint
    "#F7DC6F",  # Gold
]

DEFAULT_PROJECT_COLORS = [
    "#6C5CE7",  # Purple
    "#A29BFE",  # Light Purple
    "#74B9FF",  # Sky Blue
    "#0984E3",  # Blue
    "#00CEC9",  # Cyan
    "#55A3FF",  # Azure
    "#E17055",  # Coral
    "#FDCB6E",  # Amber
]


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


class RecurrenceType(str, Enum):
    """Types of recurrence patterns for habits."""

    STRICT = "Strict"  # Always create next instance
    FROM_DUE_DATE = "From Due Date"  # Next instance based on original due date
    FROM_COMPLETION = "From Completion"  # Next instance based on completion date


class SubtaskRecurrenceMode(str, Enum):
    """Options for how subtasks recur with habits."""

    DEFAULT = "default"  # New recurrence only after ALL subtasks complete
    PARTIAL = "partial"  # New task with only completed subtasks carried over
    ALWAYS = "always"  # Full new task regardless of subtask state


@dataclass
class XPTransaction:
    """Represents a single XP transaction (gain or loss)."""

    amount: int
    source: XPSource
    timestamp: datetime
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str | None = None
    description: str = ""


@dataclass
class Badge:
    """Represents an achievement badge."""

    id: str
    name: str
    description: str
    glyph: str  # Emoji representation
    earned_date: datetime | None = None

    def is_earned(self) -> bool:
        """Check if the badge has been earned."""
        return self.earned_date is not None


@dataclass
class Tag:
    """Represents a tag with color for categorizing tasks."""

    name: str
    color: str = "#808080"  # Default gray
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class Project:
    """Represents a project with color for organizing tasks."""

    name: str
    color: str = "#4A90D9"  # Default blue
    id: str = field(default_factory=lambda: str(uuid.uuid4()))


@dataclass
class Task:  # pylint: disable=too-many-instance-attributes
    """Represents a single task."""

    title: str
    creation_date: datetime
    # Use a factory to generate a unique ID upon creation.
    # The ID is represented as a string for easier serialization (JSON, DB).
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    text_description: str | None = None  # Rich text description (optional)
    priority: Priority = field(default=Priority.LOW)
    difficulty: Difficulty = field(default=Difficulty.TRIVIAL)
    duration: Duration = field(default=Duration.MINISCULE)
    is_complete: bool = field(default=False)
    due_date: datetime | None = None
    start_date: datetime | None = None
    icon: str | None = None
    tags: List[str] = field(default_factory=list)
    project: str | None = None
    subtasks: List[Dict[str, Any]] = field(
        default_factory=list
    )  # {"text": str, "complete": bool}
    dependencies: List[str] = field(default_factory=list)  # List of task IDs
    history: List[Dict[str, Any]] = field(
        default_factory=list
    )  # {"timestamp": datetime, "field": str, "old_value": Any, "new_value": Any}
    # Habit fields
    is_habit: bool = field(default=False)
    recurrence_rule: str | None = None  # e.g., "daily", "weekly", "every 3 days"
    recurrence_type: RecurrenceType | None = None
    habit_start_delta: int | None = None  # Days before due date to show habit
    streak_current: int = 0
    streak_best: int = 0
    parent_habit_id: str | None = (
        None  # Links to original habit for auto-generated instances
    )

    def __str__(self) -> str:
        """String representation for simple display."""
        # Format creation_date as YYYY-MM-DD HH:MM:SS
        formatted_date = self.creation_date.strftime("%Y-%m-%d %H:%M:%S")
        status_indicator = "[✓]" if self.is_complete else "[ ]"
        return (
            f"{status_indicator} ID: {self.id[:8]} | Priority: {self.priority.emoji()} {self.priority.value} "
            f"| Duration: {self.duration.emoji()} {self.duration.value} "
            f"| Created: {formatted_date} | Title: {self.title}"  # Show partial ID
        )


@dataclass
class User:  # pylint: disable=too-many-instance-attributes
    """Represents a user and their associated tasks."""

    username: str
    total_xp: int = 0
    tasks: List[Task] = field(default_factory=list)
    last_processed_date: date = field(default_factory=date.today)
    vacation_mode: bool = False
    xp_transactions: List[XPTransaction] = field(default_factory=list)
    badges: List[Badge] = field(default_factory=list)
    defined_tags: List[Tag] = field(default_factory=list)  # Global tag registry
    defined_projects: List[Project] = field(
        default_factory=list
    )  # Global project registry

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

    def find_tag_by_name(self, tag_name: str) -> Tag | None:
        """
        Finds a defined tag by its name (case-insensitive).

        Args:
            tag_name: The name of the tag to find.

        Returns:
            The Tag object if found, None otherwise.
        """
        for tag in self.defined_tags:
            if tag.name.lower() == tag_name.lower():
                return tag
        return None

    def find_project_by_name(self, project_name: str) -> Project | None:
        """
        Finds a defined project by its name (case-insensitive).

        Args:
            project_name: The name of the project to find.

        Returns:
            The Project object if found, None otherwise.
        """
        for project in self.defined_projects:
            if project.name.lower() == project_name.lower():
                return project
        return None

    def get_or_create_tag(self, tag_name: str) -> Tag:
        """
        Gets an existing tag or creates a new one with an auto-assigned color.

        Args:
            tag_name: The name of the tag.

        Returns:
            The existing or newly created Tag object.
        """
        existing = self.find_tag_by_name(tag_name)
        if existing:
            return existing
        # Auto-assign a color based on the number of existing tags
        color_index = len(self.defined_tags) % len(DEFAULT_TAG_COLORS)
        new_tag = Tag(name=tag_name, color=DEFAULT_TAG_COLORS[color_index])
        self.defined_tags.append(new_tag)
        return new_tag

    def get_or_create_project(self, project_name: str) -> Project:
        """
        Gets an existing project or creates a new one with an auto-assigned color.

        Args:
            project_name: The name of the project.

        Returns:
            The existing or newly created Project object.
        """
        existing = self.find_project_by_name(project_name)
        if existing:
            return existing
        # Auto-assign a color based on the number of existing projects
        color_index = len(self.defined_projects) % len(DEFAULT_PROJECT_COLORS)
        new_project = Project(
            name=project_name, color=DEFAULT_PROJECT_COLORS[color_index]
        )
        self.defined_projects.append(new_project)
        return new_project
