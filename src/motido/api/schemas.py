# motido/api/schemas.py
"""
Pydantic schemas for API request/response validation.
These mirror the core models but are optimized for JSON serialization.
"""

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

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
    duration: str = "Miniscule"
    due_date: datetime | None = None
    start_date: datetime | None = None
    icon: str | None = None
    tags: list[str] = Field(default_factory=list)
    project: str | None = None
    is_habit: bool = False
    recurrence_rule: str | None = None
    recurrence_type: str | None = None
    habit_start_delta: int | None = None


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
    is_complete: bool | None = None


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

    class Config:
        """Pydantic config."""

        from_attributes = True


# === Tag Schemas ===
class TagBase(BaseModel):
    """Base schema for tag data."""

    name: str
    color: str = "#808080"


class TagCreate(TagBase):
    """Schema for creating a tag."""

    pass


class TagResponse(TagBase):
    """Schema for tag response."""

    id: str

    class Config:
        """Pydantic config."""

        from_attributes = True


# === Project Schemas ===
class ProjectBase(BaseModel):
    """Base schema for project data."""

    name: str
    color: str = "#4A90D9"


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""

    pass


class ProjectResponse(ProjectBase):
    """Schema for project response."""

    id: str

    class Config:
        """Pydantic config."""

        from_attributes = True


# === XP Transaction Schemas ===
class XPTransactionSchema(BaseModel):
    """Schema for XP transaction data."""

    id: str
    amount: int
    source: str
    timestamp: datetime
    task_id: str | None = None
    description: str = ""

    class Config:
        """Pydantic config."""

        from_attributes = True


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

    class Config:
        """Pydantic config."""

        from_attributes = True


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
