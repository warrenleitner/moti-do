# core/utils.py
"""
Core utility functions. Currently minimal.
Could include things like validation, formatting, etc. later.
"""

import uuid
from datetime import datetime, timedelta
from typing import Any

from motido.core.models import Difficulty, Duration, Priority

# This file is intentionally simple for now.
# We could add helper functions here as the application grows.


def generate_uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid.uuid4())


def parse_priority_safely(priority_str: str, task_id: str | None = None) -> Priority:
    """
    Safely converts a string to a Priority enum value.

    Args:
        priority_str: The string representation of the priority
        task_id: Optional task ID for warning message context

    Returns:
        Priority enum value, or Priority.LOW if the string is invalid
    """
    try:
        return Priority(priority_str)
    except ValueError:
        # Handle case where stored priority is invalid
        task_context = f" in task {task_id}" if task_id else ""
        print(
            f"Warning: Invalid priority '{priority_str}'{task_context}. Using default."
        )
        return Priority.LOW


def parse_difficulty_safely(
    difficulty_str: str, task_id: str | None = None
) -> Difficulty:
    """
    Safely converts a string to a Difficulty enum value.

    Args:
        difficulty_str: The string representation of the difficulty
        task_id: Optional task ID for warning message context

    Returns:
        Difficulty enum value, or Difficulty.TRIVIAL if the string is invalid
    """
    try:
        return Difficulty(difficulty_str)
    except ValueError:
        # Handle case where stored difficulty is invalid
        task_context = f" in task {task_id}" if task_id else ""
        print(
            f"Warning: Invalid difficulty '{difficulty_str}'{task_context}. Using default."
        )
        return Difficulty.TRIVIAL


def parse_duration_safely(duration_str: str, task_id: str | None = None) -> Duration:
    """
    Safely converts a string to a Duration enum value.

    Args:
        duration_str: The string representation of the duration
        task_id: Optional task ID for warning message context

    Returns:
        Duration enum value, or Duration.MINUSCULE if the string is invalid
    """
    try:
        return Duration(duration_str)
    except ValueError:
        # Handle case where stored duration is invalid
        task_context = f" in task {task_id}" if task_id else ""
        print(
            f"Warning: Invalid duration '{duration_str}'{task_context}. Using default."
        )
        return Duration.MINUSCULE


# pylint: disable=too-many-return-statements
def parse_date(date_str: str) -> datetime:
    """
    Parse flexible date string formats into datetime object.

    Supports:
    - ISO format: "2025-12-31"
    - Relative: "tomorrow", "today"
    - Named days: "next friday", "next monday"
    - Intervals: "in 3 days", "in 1 week"

    Args:
        date_str: String representation of the date

    Returns:
        datetime object set to midnight of the parsed date

    Raises:
        ValueError: If date string cannot be parsed
    """
    date_str = date_str.lower().strip()

    # Handle ISO format (YYYY-MM-DD)
    try:
        return datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        pass

    # Handle relative dates
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    if date_str == "today":
        return today
    if date_str == "tomorrow":
        return today + timedelta(days=1)
    if date_str == "yesterday":
        return today - timedelta(days=1)

    # Handle "in X days/weeks" format
    if date_str.startswith("in "):
        parts = date_str[3:].split()
        if len(parts) == 2:
            try:
                num = int(parts[0])
                unit = parts[1].rstrip("s")  # Remove plural 's'
                if unit == "day":
                    return today + timedelta(days=num)
                if unit == "week":
                    return today + timedelta(weeks=num)
            except (ValueError, IndexError):
                pass

    # Handle "next <weekday>" format
    if date_str.startswith("next "):
        weekday_str = date_str[5:].strip()
        weekdays = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6,
        }
        if weekday_str in weekdays:
            target_weekday = weekdays[weekday_str]
            current_weekday = today.weekday()
            days_ahead = target_weekday - current_weekday
            if days_ahead <= 0:  # Target day already passed this week
                days_ahead += 7
            return today + timedelta(days=days_ahead)

    raise ValueError(
        f"Unable to parse date '{date_str}'. "
        f"Supported formats: YYYY-MM-DD, today, tomorrow, next friday, in 3 days"
    )


def process_day(
    user: Any, manager: Any, effective_date: Any, scoring_config: Any
) -> int:
    """
    Process penalties for a single day.

    Args:
        user: User object to process penalties for
        manager: DataManager for persisting changes
        effective_date: Date to process penalties for
        scoring_config: Scoring configuration dict

    Returns:
        int: XP change (negative for penalty, 0 for no penalty)
    """
    # Import here to avoid circular dependency (utils -> scoring -> utils)
    # pylint: disable=import-outside-toplevel
    from motido.core.scoring import apply_penalties

    initial_xp: int = user.total_xp
    apply_penalties(user, manager, effective_date, scoring_config, user.tasks)
    xp_change: int = user.total_xp - initial_xp

    # Process recurrences
    _process_recurrences(user, effective_date)

    return xp_change


def _process_recurrences(user: Any, effective_date: Any) -> None:
    """
    Process task recurrences and generate new instances.

    Args:
        user: User object
        effective_date: Date to process recurrences for
    """
    # Import here to avoid circular dependency
    # pylint: disable=import-outside-toplevel
    from motido.core.models import Task
    from motido.core.recurrence import calculate_next_occurrence

    new_tasks: list[Task] = []
    # Create a set of existing (title, due_date) tuples for fast lookup
    existing_instances = {
        (t.title, t.due_date.date() if t.due_date else None) for t in user.tasks
    }

    for task in user.tasks:
        if task.is_habit and task.recurrence_rule:
            next_date = calculate_next_occurrence(task)

            # If next_date is valid and falls on or before the effective date
            if next_date and next_date.date() <= effective_date:
                # Check if this instance already exists
                instance_key = (task.title, next_date.date())

                # Also check in new_tasks to avoid duplicates within the same batch
                already_created = False
                for nt in new_tasks:
                    if (
                        nt.title == task.title
                        and nt.due_date
                        and nt.due_date.date() == next_date.date()
                    ):
                        already_created = True
                        break

                if instance_key not in existing_instances and not already_created:
                    # Create new instance
                    new_instance = Task(
                        title=task.title,
                        priority=task.priority,
                        difficulty=task.difficulty,
                        duration=task.duration,
                        creation_date=datetime.now(),
                        due_date=next_date,
                        is_habit=True,
                        recurrence_rule=task.recurrence_rule,
                        recurrence_type=task.recurrence_type,
                        tags=task.tags.copy(),
                        project=task.project,
                        is_complete=False,
                        streak_current=task.streak_current,  # Carry over streak? Or shared?
                        streak_best=task.streak_best,
                    )
                    new_tasks.append(new_instance)

    for t in new_tasks:
        user.add_task(t)


# Icon auto-generation mappings
# Maps keywords to emoji icons
ICON_MAPPINGS: dict[str, str] = {
    # Exercise & Health
    "exercise": "🏃",
    "workout": "💪",
    "gym": "🏋️",
    "run": "🏃",
    "running": "🏃",
    "yoga": "🧘",
    "meditate": "🧘",
    "meditation": "🧘",
    "sleep": "😴",
    "water": "💧",
    "vitamin": "💊",
    "medicine": "💊",
    "walk": "🚶",
    "stretch": "🤸",
    "swim": "🏊",
    # Work & Productivity
    "meeting": "📅",
    "call": "📞",
    "phone": "📞",
    "email": "📧",
    "mail": "📧",
    "write": "✍️",
    "writing": "✍️",
    "review": "👀",
    "report": "📊",
    "presentation": "📽️",
    "deadline": "⏰",
    "interview": "🎤",
    "standup": "🧍",
    "sync": "🔄",
    # Learning & Education
    "read": "📚",
    "reading": "📚",
    "book": "📖",
    "study": "📖",
    "learn": "🎓",
    "course": "🎓",
    "practice": "📝",
    "homework": "📝",
    "exam": "📝",
    "test": "📝",
    "research": "🔬",
    # Home & Personal
    "clean": "🧹",
    "cleaning": "🧹",
    "cook": "🍳",
    "cooking": "🍳",
    "grocery": "🛒",
    "groceries": "🛒",
    "shopping": "🛒",
    "laundry": "👕",
    "dishes": "🍽️",
    "trash": "🗑️",
    "organize": "📦",
    # Finance
    "bills": "💸",
    "bill": "💸",
    "pay": "💳",
    "payment": "💳",
    "budget": "💰",
    "bank": "🏦",
    "tax": "📑",
    "invoice": "🧾",
    # Health & Appointments
    "doctor": "🏥",
    "dentist": "🦷",
    "appointment": "📋",
    "checkup": "🩺",
    # Social & Events
    "birthday": "🎂",
    "gift": "🎁",
    "party": "🎉",
    "date": "❤️",
    "dinner": "🍽️",
    "lunch": "🍴",
    "breakfast": "🥐",
    "coffee": "☕",
    # Tech & Development
    "code": "💻",
    "coding": "💻",
    "program": "💻",
    "deploy": "🚀",
    "release": "🚀",
    "fix": "🔧",
    "bug": "🐛",
    "debug": "🐛",
    "testing": "🧪",
    "backup": "💾",
    "update": "🔄",
    # Travel
    "travel": "✈️",
    "flight": "✈️",
    "trip": "🧳",
    "vacation": "🏖️",
    "hotel": "🏨",
    "pack": "🧳",
    # Creative
    "design": "🎨",
    "draw": "✏️",
    "drawing": "✏️",
    "paint": "🖌️",
    "photo": "📷",
    "video": "📹",
    "music": "🎵",
    "podcast": "🎙️",
    # Pets
    "dog": "🐕",
    "cat": "🐈",
    "pet": "🐾",
    "vet": "🏥",
    # Plants & Garden
    "water plants": "🌱",
    "garden": "🌻",
    "plant": "🌱",
    # Misc
    "plan": "📋",
    "goal": "🎯",
    "journal": "📓",
    "reflect": "💭",
    "gratitude": "🙏",
    "morning": "🌅",
    "evening": "🌙",
    "night": "🌙",
}


def auto_generate_icon(title: str) -> str | None:
    """
    Generate an icon (emoji) based on task title keywords.

    Searches for keywords in the title and returns the first matching icon.
    Case-insensitive matching.

    Args:
        title: The task title to analyze

    Returns:
        An emoji string if a keyword is found, None otherwise
    """
    title_lower = title.lower()

    # First check for multi-word phrases (like "water plants")
    for keyword, icon in ICON_MAPPINGS.items():
        if " " in keyword and keyword in title_lower:
            return icon

    # Then check for single word keywords
    for keyword, icon in ICON_MAPPINGS.items():
        if " " not in keyword and keyword in title_lower:
            return icon

    return None
