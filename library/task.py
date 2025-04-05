"""
Module: moti-do.backend.task
Description: Contains the data model classes for the Moti-Do backend.
This module defines the core domain models for tasks, habits, tags, projects, etc.
The classes are built with exportability (JSON, database integration, sync operations) in mind.

Note:
- We use Python dataclasses for brevity and clarity.
- Some domains (e.g., Importance, Difficulty, Duration) might be better served in production by Python Enum types.
- Business logic should eventually be kept separate from these pure data models.
- Persistence and serialization (JSON, ORM, etc.) can be added through custom methods or external libraries.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Optional

# -------------------------------------------------------------------
# Value Classes: Importance, Difficulty, Duration
# -------------------------------------------------------------------

@dataclass
class ImportanceLevel:
    """
    Represents an importance level for a task/habit.

    Attributes:
        selector (str): Constant used for selection (e.g., 'TRIVIAL', 'LOW', etc.).
        name (str): Human-readable name.
        color (str): Display color when printed.
        weight (float): Numeric weight to factor into scoring.
    """
    selector: str
    name: str
    color: str
    weight: float

# Predefined importance levels represented as a dictionary
IMPORTANT_LEVELS = {
    "TRIVIAL": ImportanceLevel("TRIVIAL", "Trivial", "Default", 1),
    "LOW": ImportanceLevel("LOW", "Low", "Green", 1.5),
    "MEDIUM": ImportanceLevel("MEDIUM", "Medium", "Yellow", 2),
    "HIGH": ImportanceLevel("HIGH", "High", "Orange", 2.5),
    "DEFCON": ImportanceLevel("DEFCON", "Defcon One", "Red", 3)
}


@dataclass
class DifficultyLevel:
    """
    Represents a difficulty level for a task/habit.

    Attributes:
        selector (str): Constant used for selection (e.g., 'TRIVIAL', 'EASY', etc.).
        name (str): Human-readable name.
        color (str): Display color when printed.
        weight (float): Numeric weight affecting score calculations.
    """
    selector: str
    name: str
    color: str
    weight: float

# Predefined difficulty levels
DIFFICULTY_LEVELS = {
    "TRIVIAL": DifficultyLevel("TRIVIAL", "Trivial", "Default", 1),
    "EASY": DifficultyLevel("EASY", "Easy", "Green", 1.5),
    "MEDIUM": DifficultyLevel("MEDIUM", "Medium", "Yellow", 2),
    "HARD": DifficultyLevel("HARD", "Hard", "Orange", 2.5),
    "HERCULEAN": DifficultyLevel("HERCULEAN", "Herculean", "Red", 3)
}


@dataclass
class DurationLevel:
    """
    Represents a duration level for a task/habit.

    Attributes:
        selector (str): Constant used for selection (e.g., 'TRIVIAL', 'SHORT', etc.).
        name (str): Human-readable name.
        color (str): Display color when printed.
        weight (float): Numeric factor for scoring.
    """
    selector: str
    name: str
    color: str
    weight: float

# Predefined duration levels
DURATION_LEVELS = {
    "TRIVIAL": DurationLevel("TRIVIAL", "Trivial", "Default", 1),
    "SHORT": DurationLevel("SHORT", "Short", "Green", 1.5),
    "MEDIUM": DurationLevel("MEDIUM", "Medium", "Yellow", 2),
    "LONG": DurationLevel("LONG", "Long", "Orange", 3),
    "ODYSSYEN": DurationLevel("ODYSSYEN", "Odysseyen", "Red", 4)
}


# -------------------------------------------------------------------
# Task Components: Subtask, Recurrence, SuccessTracker, ChangeTracker, ScoreCalculator
# -------------------------------------------------------------------

@dataclass
class Subtask:
    """
    Represents a subtask for a parent task.

    Attributes:
        status (bool): True if completed, False if active.
        name (str): Subtask description.
        order (int): Order index for display hierarchy.
    """
    status: bool  # True means completed, False means active.
    name: str
    order: int


# Recurrence Base Class and Derived Classes

@dataclass
class Recurrence:
    """
    Base class for task/habit recurrence patterns.

    Attributes:
        units (int): Number of recurrence units (default is 1).
    """
    units: int = 1


class DailyRecurrence(Recurrence):
    """
    Represents a daily recurrence pattern.
    
    The 'units' variable represents the number of days between recurrences.
    """
    pass  # Specific logic may be implemented later.


@dataclass
class WeeklyRecurrence(Recurrence):
    """
    Represents a weekly recurrence pattern.
    
    Attributes:
        days_of_week (List[str]): The weekdays on which recurrence occurs (e.g., ['Monday', 'Wednesday']).
    """
    days_of_week: List[str] = field(default_factory=list)


@dataclass
class MonthlyRecurrenceRecurrence):
    """
    Represents a monthly recurrence pattern.
    
    Attributes:
        day_of_month (int): The day of the month (1-31) when the task recurs.
    """
    day_of_month: int = 1


class AnnuallyRecurrence(Recurrence):
    """
    Represents an annual recurrence pattern.
    
    In this pattern, recurrence units are interpreted as years.
    """
    pass  # Specific annual logic to be added later.


@dataclass
class SuccessTracker:
    """
    Tracks the success history for a habit.
    
    Attributes:
        history (List[dict]): List of records. Each record contains the due date and completion status ('on_time', 'late', 'not_completed').
        current_streak (int): Current streak of on-time completions.
        best_streak (int): Record-high streak of on-time completions.
    """
    history: List[dict] = field(default_factory=list)
    current_streak: int = 0
    best_streak: int = 0


@dataclass
class ChangeTracker:
    """
    Logs every field change on a task.
    
    Attributes:
        changes (List[dict]): Each record contains:
            - timestamp: When the change occurred.
            - field: The field name that was changed.
            - old_value: The previous value.
            - new_value: The new value.
    """
    changes: List[dict] = field(default_factory=list)


class ScoreCalculator:
    """
    Placeholder for score calculation logic.
    
    This class will eventually calculate task/habit scores using multiple factors,
    including user preferences, task attributes, and dynamic conditions.
    
    Note: Consider refactoring this as a stateless service module separate from the task models.
    """
    pass  # Methods for computing scores will be implemented later.


# -------------------------------------------------------------------
# Primary Task Classes: Task and Habit
# -------------------------------------------------------------------

@dataclass
class Task:
    """
    Represents a generic task in the Moti-Do backend.

    Attributes:
        name (str): Mandatory task name.
        emoji (Optional[str]): Optional icon/emoji.
        id (str): Auto-generated unique ID.
        created_date (datetime): Timestamp when the task was created.
        description (Optional[str]): Markdown formatted description.
        start_date (Optional[datetime]): Optional start date.
        start_time (Optional[datetime]): Optional start time.
        due_date (Optional[datetime]): Optional due date.
        due_time (Optional[datetime]): Optional due time.
        importance (Optional[ImportanceLevel]): Instance representing task importance.
        difficulty (Optional[DifficultyLevel]): Instance representing task difficulty.
        duration (Optional[DurationLevel]): Instance representing task duration.
        recurrence (Optional[Recurrence]): Instance defining recurrence settings.
        subtasks (List[Subtask]): List of subtasks.
        dependency_ids (List[str]): Task IDs this task depends on.
        dependent_ids (List[str]): Task IDs that depend on this task.
        change_tracker (ChangeTracker): Tracks all changes made to this task.
        status (str): Current status ('active', 'future', or 'completed').
        tag_ids (List[str]): List of associated tag identifiers.
        project_id (Optional[str]): Associated project identifier.
    """
    name: str
    emoji: Optional[str] = None
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_date: datetime = field(default_factory=datetime.now)
    description: Optional[str] = None
    start_date: Optional[datetime] = None
    start_time: Optional[datetime] = None
    due_date: Optional[datetime] = None
    due_time: Optional[datetime] = None
    importance: Optional[ImportanceLevel] = None
    difficulty: Optional[DifficultyLevel] = None
    duration: Optional[DurationLevel] = None
    recurrence: Optional[Recurrence] = None
    subtasks: List[Subtask] = field(default_factory=list)
    dependency_ids: List[str] = field(default_factory=list)
    dependent_ids: List[str] = field(default_factory=list)
    change_tracker: ChangeTracker = field(default_factory=ChangeTracker)
    status: str = "active"  # Options: "active", "future", "completed"
    tag_ids: List[str] = field(default_factory=list)
    project_id: Optional[str] = None


@dataclass
class Habit(Task):
    """
    Represents a habit, a specialized version of a task.

    Inherits all attributes from Task and adds:
        - Recurrence and due_date become mandatory.
        - count (Optional[int]): Number of times the habit must be completed before the due date.
          (Mutually exclusive with subtasks.)
        - success_tracker (SuccessTracker): Tracks the habit's completion history.
        - refresh_delta (Optional[int]): Days before the next due date to refresh/create a new instance.
    """
    recurrence: Recurrence = field(default_factory=Recurrence)
    due_date: datetime = field(default_factory=datetime.now)
    count: Optional[int] = None
    success_tracker: SuccessTracker = field(default_factory=SuccessTracker)
    refresh_delta: Optional[int] = None


# -------------------------------------------------------------------
# Logging and Tracking Classes: XPLog and LedgerLog
# -------------------------------------------------------------------

@dataclass
class XPLog:
    """
    Records an XP event for a task or habit.

    Attributes:
        timestamp (datetime): The event timestamp.
        event_type (str): Type of event (e.g., "completion", "penalty").
        task_type (str): Specifies task category ("task", "habit", "subtask").
        task_id (str): ID of the associated task/habit.
        value (float): XP value (earned or penalty).
    """
    timestamp: datetime = field(default_factory=datetime.now)
    event_type: str = ""
    task_type: str = ""
    task_id: str = ""
    value: float = 0.0


@dataclass
class LedgerLog(XPLog):
    """
    An XPLog extension for ledger entries.
    
    In addition to XPLog fields, supports event types like "XP Deposit" or "XP Withdrawal".
    
    Critical note: Consider merging XP and ledger logs if they share most properties.
    """
    pass  # Extend with additional ledger functionality as needed.


# -------------------------------------------------------------------
# Tag and Project Classes: (Consider a shared base class for both)
# -------------------------------------------------------------------

@dataclass
class Tag:
    """
    Represents a tag for task categorization.

    Attributes:
        name (str): Name of the tag.
        emoji (Optional[str]): Optional emoji representation.
        color (Optional[str]): Display color (default if not specified).
        id (str): Auto-generated unique ID.
        description (Optional[str]): Markdown formatted tag description.
        task_ids (List[str]): List of task IDs associated with this tag.
    """
    name: str
    emoji: Optional[str] = None
    color: Optional[str] = "Default"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    task_ids: List[str] = field(default_factory=list)


@dataclass
class Project:
    """
    Represents a project grouping tasks.
    
    Attributes:
        name (str): Name of the project.
        emoji (Optional[str]): Optional emoji representation.
        color (Optional[str]): Display color.
        id (str): Auto-generated unique identifier.
        description (Optional[str]): Markdown formatted project description.
        task_ids (List[str]): List of task IDs associated with this project.
    """
    name: str
    emoji: Optional[str] = None
    color: Optional[str] = "Default"
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    description: Optional[str] = None
    task_ids: List[str] = field(default_factory=list)


# -------------------------------------------------------------------
# Score Preferences Class
# -------------------------------------------------------------------

@dataclass
class ScorePreferences:
    """
    Holds configuration for score calculations.

    Attributes:
        description_weight (float): Weight for having a description.
        due_date_multiplier (float): Multiplier for days away from the due date.
        active_streak_multiplier (float): Multiplier for maintaining an active streak.
        project_multiplier (float): Multiplier for being associated with a project.
        tag_multiplier (float): Multiplier per associated tag.
        dependency_multiplier (float): Multiplier per dependent task.
        importance_level_multipliers (dict): Multipliers for importance levels.
        difficulty_level_multipliers (dict): Multipliers for difficulty levels.
        duration_level_multipliers (dict): Multipliers for duration levels.
        base_weight (float): Base weight for a task/habit.
    """
    description_weight: float = 0.5
    due_date_multiplier: float = 1.0
    active_streak_multiplier: float = 1.0
    project_multiplier: float = 1.0
    tag_multiplier: float = 1.0
    dependency_multiplier: float = 1.0
    importance_level_multipliers: dict = field(default_factory=dict)
    difficulty_level_multipliers: dict = field(default_factory=dict)
    duration_level_multipliers: dict = field(default_factory=dict)
    base_weight: float = 1.0


# -------------------------------------------------------------------
# User Class
# -------------------------------------------------------------------

@dataclass
class User:
    """
    Represents a Moti-Do application user.

    Attributes:
        name (str): User name, defaults to "User".
        active_since (datetime): The date/time when the user first became active.
        last_update (datetime): Timestamp updated each time the application runs.
        xp_log (List[XPLog]): List of XP event records.
        tasks (List[Task]): List of Task and Habit instances.
        xp_ledger (List[LedgerLog]): List of ledger entries for XP adjustments.
        score_preferences (ScorePreferences): Instance holding the user's scoring settings.
    """
    name: str = "User"
    active_since: datetime = field(default_factory=datetime.now)
    last_update: datetime = field(default_factory=datetime.now)
    xp_log: List[XPLog] = field(default_factory=list)
    tasks: List[Task] = field(default_factory=list)
    xp_ledger: List[LedgerLog] = field(default_factory=list)
    score_preferences: ScorePreferences = field(default_factory=ScorePreferences)
