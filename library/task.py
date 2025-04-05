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
from typing import List, Optional, Dict

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
# Task Components: Subtask, Recurrence, HabitTracking, ChangeTracker, ScoreCalculator
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


# --- NEW/REFACTORED RECURRENCE ---
@dataclass
class Recurrence:
    """
    Defines the recurrence pattern for a task.

    Attributes:
        frequency (str): The recurrence frequency (e.g., 'daily', 'weekly', 'monthly', 'annually').
        interval (int): The number of frequency units between occurrences (default 1).
        start_date (datetime): When the recurrence pattern begins.
        end_date (Optional[datetime]): When the recurrence pattern ends (if applicable).
        days_of_week (Optional[List[int]]): For 'weekly' frequency, list of days (0=Mon, 6=Sun).
        day_of_month (Optional[int]): For 'monthly' frequency, the day of the month (1-31).
    """
    frequency: str
    interval: int = 1
    start_date: datetime = field(default_factory=datetime.now)
    end_date: Optional[datetime] = None
    # --- Frequency-specific ---
    days_of_week: Optional[List[int]] = None # 0=Mon, 6=Sun; relevant for 'weekly'
    day_of_month: Optional[int] = None # 1-31; relevant for 'monthly'


# --- NEW/REFACTORED HABIT TRACKING ---
@dataclass
class HabitTracking:
    """
    Tracks progress and history for tasks managed as habits. Replaces SuccessTracker.

    Attributes:
        tracking_start_date (datetime): When habit tracking began.
        goal_type (str): Type of goal (e.g., 'daily_completion', 'weekly_times', 'monthly_value').
        target_value (Optional[int]): Target number for the goal type (e.g., 3 times per week).
        history (List[Dict[str, any]]): Log of completion status/values per occurrence.
            Example entry: {'date': datetime, 'status': 'completed'/'missed'/'skipped', 'value': Optional[float]}
        current_streak (int): Current consecutive successful completions based on goal_type.
        best_streak (int): Highest recorded streak.
    """
    tracking_start_date: datetime = field(default_factory=datetime.now)
    goal_type: str = 'daily_completion'
    target_value: Optional[int] = None
    history: List[Dict[str, any]] = field(default_factory=list)
    current_streak: int = 0
    best_streak: int = 0


# --- Keep ChangeTracker ---
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


# --- Keep ScoreCalculator ---
class ScoreCalculator:
    """
    Placeholder for score calculation logic.

    This class will eventually calculate task/habit scores using multiple factors,
    including user preferences, task attributes, and dynamic conditions.

    Note: Consider refactoring this as a stateless service module separate from the task models.
    """
    pass  # Methods for computing scores will be implemented later.


# -------------------------------------------------------------------
# --- UNIFIED TASK CLASS (Replaces old Task and Habit) ---
# -------------------------------------------------------------------

@dataclass
class Task:
    """
    Unified representation for tasks, recurring tasks, and habits in Moti-Do.

    Determining the type:
    - Regular Task: `recurrence` is None, `habit_tracking` is None.
    - Recurring Task: `recurrence` is not None, `habit_tracking` is None.
    - Habit: `recurrence` is not None, `habit_tracking` is not None.
      (A non-recurring habit might also be possible if `recurrence` is None but `habit_tracking` is set).

    Attributes:
        name (str): Mandatory task name/title.
        id (str): Auto-generated unique ID.
        created_at (datetime): Timestamp of creation.
        updated_at (datetime): Timestamp of last modification.
        description (Optional[str]): Markdown formatted notes or description.
        emoji (Optional[str]): Optional icon/emoji representation.

        # --- Scheduling & Status ---
        start_date (Optional[datetime]): When the task can be started.
        due_date (Optional[datetime]): When the task is due.
        completed_at (Optional[datetime]): Timestamp when the task was completed.
        status (str): Current status (e.g., "active", "future", "completed", "archived").

        # --- Attributes & Relationships ---
        importance (Optional[ImportanceLevel]): Importance level instance.
        difficulty (Optional[DifficultyLevel]): Difficulty level instance.
        duration (Optional[DurationLevel]): Estimated duration level instance.
        subtasks (List[Subtask]): List of subtasks associated with this task.
        dependency_ids (List[str]): List of Task IDs this task depends on.
        dependent_ids (List[str]): List of Task IDs that depend on this task.
        tag_ids (List[str]): List of associated Tag IDs.
        project_id (Optional[str]): ID of the associated Project.

        # --- Tracking & History ---
        change_tracker (ChangeTracker): Tracks all field changes made to this task.

        # --- Recurrence & Habit ---
        recurrence (Optional[Recurrence]): Defines recurrence rules if the task repeats.
        habit_tracking (Optional[HabitTracking]): Tracks progress if the task is treated as a habit.
    """
    name: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    description: Optional[str] = None
    emoji: Optional[str] = None

    # Scheduling & Status
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: str = "active"

    # Attributes & Relationships
    importance: Optional[ImportanceLevel] = None
    difficulty: Optional[DifficultyLevel] = None
    duration: Optional[DurationLevel] = None
    subtasks: List[Subtask] = field(default_factory=list)
    dependency_ids: List[str] = field(default_factory=list)
    dependent_ids: List[str] = field(default_factory=list)
    tag_ids: List[str] = field(default_factory=list)
    project_id: Optional[str] = None

    # Tracking & History
    change_tracker: ChangeTracker = field(default_factory=ChangeTracker)

    # Recurrence & Habit
    recurrence: Optional[Recurrence] = None
    habit_tracking: Optional[HabitTracking] = None

    def __post_init__(self):
        """Ensure updated_at reflects creation time initially."""
        # If updated_at wasn't explicitly set during creation, default it to created_at
        if self.updated_at == self.created_at and self.created_at is not None:
             # This check seems redundant given the default factory, but ensures consistency
             pass # No action needed if defaults work as expected. Consider logic if update needed.
        # Set updated_at properly upon creation if default_factory wasn't sufficient
        self.updated_at = self.created_at


    # --- Type determination helpers (optional but useful) ---
    @property
    def is_recurring(self) -> bool:
        """Returns True if the task has recurrence rules defined."""
        return self.recurrence is not None

    @property
    def is_habit(self) -> bool:
        """Returns True if the task is being tracked as a habit."""
        return self.habit_tracking is not None

    @property
    def task_type(self) -> str:
        """Returns the type of the task ('habit', 'recurring_task', 'task')."""
        if self.is_habit:
            # Typically habits are recurring, but we allow non-recurring habits
            # if habit_tracking is set but recurrence is not.
            return "habit"
        elif self.is_recurring:
            return "recurring_task"
        else:
            return "task"


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
        tasks (List[Task]): List of Task and Habit instances.
        tags (List[Tag]): List of Tag instances.
        projects (List[Project]): List of Project instances.
        xp_log (List[XPLog]): List of XP event records.
        xp_ledger (List[LedgerLog]): List of ledger entries for XP adjustments.
        score_preferences (ScorePreferences): Instance holding the user's scoring settings.
    """
    name: str = "User"
    active_since: datetime = field(default_factory=datetime.now)
    last_update: datetime = field(default_factory=datetime.now)
    tasks: List[Task] = field(default_factory=list)
    tags: List[Tag] = field(default_factory=list)
    projects: List[Project] = field(default_factory=list)
    xp_log: List[XPLog] = field(default_factory=list)
    xp_ledger: List[LedgerLog] = field(default_factory=list)
    score_preferences: ScorePreferences = field(default_factory=ScorePreferences)
