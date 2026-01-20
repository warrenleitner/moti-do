# motido/api/schemas.py
# pylint: disable=too-few-public-methods
"""
Pydantic schemas for API request/response validation.
These mirror the core models but are optimized for JSON serialization.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

# === Enums as string literals for API ===
# These match the core model enums but are simpler for JSON


# === Subtask Schema ===
class SubtaskSchema(BaseModel):
    """Schema for subtask data."""

    text: str
    complete: bool = False


class SubtaskCreate(BaseModel):
    """Schema for creating a subtask."""

    text: str


# === History Entry Schema ===
class HistoryEntrySchema(BaseModel):
    """Schema for task history entries."""

    timestamp: datetime
    field: str
    old_value: Any
    new_value: Any


# === Task Schemas ===
class TaskBase(BaseModel):
    """Base schema for task data."""

    title: str
    text_description: str | None = None
    priority: str = "Low"
    difficulty: str = "Trivial"
    duration: str = "Minuscule"
    due_date: datetime | None = None
    start_date: datetime | None = None
    icon: str | None = None
    tags: list[str] = Field(default_factory=list)
    project: str | None = None
    is_habit: bool = False
    recurrence_rule: str | None = None
    recurrence_type: str | None = None
    habit_start_delta: int | None = None
    subtask_recurrence_mode: str | None = None
    # Counter task fields
    target_count: int | None = None  # Target count to reach (None = not a counter task)


class TaskCreate(TaskBase):
    """Schema for creating a new task."""

    subtasks: list[SubtaskCreate] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    """Schema for updating a task (all fields optional)."""

    title: str | None = None
    text_description: str | None = None
    priority: str | None = None
    difficulty: str | None = None
    duration: str | None = None
    due_date: datetime | None = None
    start_date: datetime | None = None
    icon: str | None = None
    tags: list[str] | None = None
    project: str | None = None
    is_habit: bool | None = None
    recurrence_rule: str | None = None
    recurrence_type: str | None = None
    habit_start_delta: int | None = None
    subtask_recurrence_mode: str | None = None
    is_complete: bool | None = None
    # Counter task fields
    target_count: int | None = None
    current_count: int | None = None


class TaskResponse(TaskBase):
    """Schema for task response data."""

    id: str
    creation_date: datetime
    is_complete: bool
    subtasks: list[SubtaskSchema] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    history: list[HistoryEntrySchema] = Field(default_factory=list)
    streak_current: int = 0
    streak_best: int = 0
    parent_habit_id: str | None = None
    subtask_recurrence_mode: str = "default"
    score: float = 0.0  # Calculated XP value for this task
    penalty_score: float = 0.0  # Penalty if not completed today
    net_score: float = 0.0  # XP + penalty avoided
    # Counter task fields
    current_count: int = 0  # Current progress toward target

    model_config = ConfigDict(from_attributes=True)


class TaskCompletionRequest(BaseModel):
    """Schema for task completion request with optional completion date.

    The completion_date allows the client to send its local date/time,
    ensuring recurrence calculations work correctly regardless of server timezone.
    """

    completion_date: datetime | None = None


class TaskCompletionResponse(BaseModel):
    """Schema for task completion response with next instance info."""

    task: TaskResponse
    xp_earned: int
    next_instance: TaskResponse | None = None


# === Tag Schemas ===
class TagBase(BaseModel):
    """Base schema for tag data."""

    name: str
    color: str = "#808080"
    multiplier: float = 1.0


class TagCreate(TagBase):
    """Schema for creating a tag."""


class TagResponse(TagBase):
    """Schema for tag response."""

    id: str

    model_config = ConfigDict(from_attributes=True)


# === Project Schemas ===
class ProjectBase(BaseModel):
    """Base schema for project data."""

    name: str
    color: str = "#4A90D9"
    multiplier: float = 1.0


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: str

    model_config = ConfigDict(from_attributes=True)


# === XP Transaction Schemas ===
class XPTransactionSchema(BaseModel):
    """Schema for XP transaction data."""

    id: str
    amount: int
    source: str
    timestamp: datetime
    task_id: str | None = None
    description: str = ""
    game_date: date | None = None

    model_config = ConfigDict(from_attributes=True)


class XPWithdrawRequest(BaseModel):
    """Schema for XP withdrawal request."""

    amount: int = Field(gt=0, description="Amount of XP to withdraw")
    description: str = ""


# === Badge Schemas ===
class BadgeSchema(BaseModel):
    """Schema for badge data."""

    id: str
    name: str
    description: str
    glyph: str
    earned_date: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


# === User Schemas ===
class UserProfile(BaseModel):
    """Schema for user profile data."""

    username: str
    total_xp: int
    level: int
    last_processed_date: date
    vacation_mode: bool


class UserStats(BaseModel):
    """Schema for user statistics."""

    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    habits_count: int
    total_xp: int
    level: int
    badges_earned: int
    current_streak: int
    best_streak: int


# === Auth Schemas ===
class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str
    password: str


class UserRegisterRequest(BaseModel):
    """Schema for user registration."""

    username: str
    password: str = Field(min_length=8)


class PasswordChangeRequest(BaseModel):
    """Schema for password change."""

    current_password: str
    new_password: str = Field(min_length=8)


# === View Schemas ===
class CalendarEvent(BaseModel):
    """Schema for calendar event data."""

    id: str
    title: str
    start: datetime
    end: datetime | None = None
    all_day: bool = True
    color: str = "#1976d2"
    is_complete: bool = False
    is_habit: bool = False


class HeatmapDay(BaseModel):
    """Schema for heatmap day data."""

    date: date
    completed_count: int
    total_count: int


class KanbanColumn(BaseModel):
    """Schema for kanban column data."""

    id: str
    title: str
    tasks: list[TaskResponse]


# === System Schemas ===
class AdvanceRequest(BaseModel):
    """Schema for date advance request."""

    days: int | None = Field(None, ge=1, description="Number of days to advance")
    to_date: date | None = Field(None, description="Target date to advance to")


class SystemStatus(BaseModel):
    """Schema for system status response."""

    last_processed_date: date
    current_date: date
    vacation_mode: bool
    pending_days: int


# === Scoring Configuration Schemas ===
class AgeFactorConfig(BaseModel):
    """Schema for age factor settings."""

    enabled: bool = True
    unit: str = "days"  # "days" or "weeks"
    multiplier_per_unit: float = 0.025
    max_multiplier: float = 1.5


class DueDateProximityConfig(BaseModel):
    """Schema for due date proximity settings."""

    enabled: bool = True
    unit: str = "days"  # "days" or "weeks"
    multiplier_per_unit: float = 0.02
    max_multiplier: float = 1.5


class PenaltyInvertWeightsConfig(BaseModel):
    """Schema for per-component penalty inversion flags."""

    priority: bool = True
    difficulty: bool = True
    duration: bool = True
    age: bool = True
    due_date: bool = True
    tag: bool = True
    project: bool = True


class DependencyChainConfig(BaseModel):
    """Schema for dependency chain settings."""

    enabled: bool = True
    dependent_score_percentage: float = 0.1


class HabitStreakBonusConfig(BaseModel):
    """Schema for habit streak bonus settings."""

    enabled: bool = True
    bonus_per_streak_day: float = 1.0
    max_bonus: float = 50.0


class ScoringConfigResponse(BaseModel):
    """Schema for scoring configuration response."""

    base_score: float = 10.0
    difficulty_multiplier: dict[str, float] = Field(default_factory=dict)
    duration_multiplier: dict[str, float] = Field(default_factory=dict)
    priority_multiplier: dict[str, float] = Field(default_factory=dict)
    age_factor: AgeFactorConfig = Field(default_factory=AgeFactorConfig)
    due_date_proximity: DueDateProximityConfig = Field(
        default_factory=DueDateProximityConfig
    )
    dependency_chain: DependencyChainConfig = Field(
        default_factory=DependencyChainConfig
    )
    habit_streak_bonus: HabitStreakBonusConfig = Field(
        default_factory=HabitStreakBonusConfig
    )
    penalty_invert_weights: PenaltyInvertWeightsConfig = Field(
        default_factory=PenaltyInvertWeightsConfig
    )


class ScoringConfigUpdate(BaseModel):
    """Schema for updating scoring configuration."""

    base_score: float | None = None
    difficulty_multiplier: dict[str, float] | None = None
    duration_multiplier: dict[str, float] | None = None
    priority_multiplier: dict[str, float] | None = None
    age_factor: AgeFactorConfig | None = None
    due_date_proximity: DueDateProximityConfig | None = None
    dependency_chain: DependencyChainConfig | None = None
    habit_streak_bonus: HabitStreakBonusConfig | None = None
    penalty_invert_weights: PenaltyInvertWeightsConfig | None = None
