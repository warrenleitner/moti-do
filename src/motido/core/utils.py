# core/utils.py
"""
Core utility functions. Currently minimal.
Could include things like validation, formatting, etc. later.
"""

import uuid
from datetime import date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from motido.core.models import Difficulty, Duration, Priority, RecurrenceType, Task
from motido.core.recurrence import create_next_habit_instance

# This file is intentionally simple for now.
# We could add helper functions here as the application grows.


def get_today_for_timezone(timezone_str: str | None) -> date:
    """
    Get today's date in the specified IANA timezone.

    Falls back to the server's local date when the timezone is ``None``
    or cannot be resolved.

    Args:
        timezone_str: IANA timezone name (e.g. "America/New_York"), or None.

    Returns:
        Today's date in the given timezone.
    """
    if timezone_str:
        try:
            tz = ZoneInfo(timezone_str)
            return datetime.now(tz).date()
        except (KeyError, ValueError):
            pass
    return date.today()


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
    user: Any,
    manager: Any,
    effective_date: Any,
    scoring_config: Any,
    *,
    persist: bool = True,
) -> int:
    """
    Process penalties for a single day.

    Args:
        user: User object to process penalties for
        manager: DataManager for persisting changes
        effective_date: Date to process penalties for
        scoring_config: Scoring configuration dict

    Args:
        persist: Whether to persist changes during processing. When False, the
            caller is responsible for saving the user after processing.

    Returns:
        int: XP change (negative for penalty, 0 for no penalty)
    """
    # Import here to avoid circular dependency (utils -> scoring -> utils)
    # pylint: disable=import-outside-toplevel
    from motido.core.scoring import apply_penalties

    # Auto-clear expired deferrals
    for task in user.tasks:
        if (
            task.defer_until
            and not task.is_complete
            and task.defer_until.date() <= effective_date
        ):
            task.defer_until = None

    initial_xp: int = user.total_xp
    apply_penalties(
        user,
        manager,
        effective_date,
        scoring_config,
        user.tasks,
        persist=persist,
    )
    xp_change: int = user.total_xp - initial_xp

    # Process recurrences
    _process_recurrences(user, effective_date)

    return xp_change


def _process_recurrences(
    user: Any, effective_date: Any
) -> None:  # pylint: disable=too-many-locals
    """
    Process task recurrences and generate new instances.

    Handles two categories of recurring tasks:
    1. FROM_DUE_DATE / STRICT: Chains forward from the task's due_date, creating
       all missing instances up to effective_date.
    2. FROM_COMPLETION: Recovers orphaned tasks (completed with no active child)
       by chaining forward from the last completed instance's due_date to find
       the most recent instance that should exist by effective_date.

    Args:
        user: User object
        effective_date: Date to process recurrences for
    """
    new_tasks: list[Task] = []
    # Create a set of existing (title, due_date) tuples for fast lookup
    existing_instances = {
        (t.title, t.due_date.date() if t.due_date else None) for t in user.tasks
    }
    pending_instances: set[tuple[str, Any]] = set()
    effective_datetime = datetime.combine(effective_date, datetime.min.time())

    # --- Phase 1: FROM_DUE_DATE and STRICT tasks (chain from due_date) ---
    for task in user.tasks:
        if (
            task.is_habit
            and task.recurrence_rule
            and task.recurrence_ended_at is None
            and task.recurrence_type != RecurrenceType.FROM_COMPLETION
        ):
            current = task
            last_due_date = task.due_date.date() if task.due_date else None

            while True:
                next_instance = create_next_habit_instance(
                    current, completion_date=effective_datetime
                )

                if not next_instance or not next_instance.due_date:
                    break

                next_due = next_instance.due_date.date()

                if next_due > effective_date:
                    break

                instance_key = (next_instance.title, next_due)
                already_created = instance_key in existing_instances or (
                    instance_key in pending_instances
                )

                if not already_created:
                    new_tasks.append(next_instance)
                    pending_instances.add(instance_key)

                # Continue advancing the chain to catch up when multiple periods were skipped
                current = next_instance

                if last_due_date == next_due:
                    break

                last_due_date = next_due

    # --- Phase 2: FROM_COMPLETION recovery for orphaned tasks ---
    _recover_orphaned_from_completion(
        user, effective_date, new_tasks, existing_instances, pending_instances
    )

    for t in new_tasks:
        user.add_task(t)


def _recover_orphaned_from_completion(  # pylint: disable=too-many-locals
    user: Any,
    effective_date: Any,
    new_tasks: list[Task],
    existing_instances: set,
    pending_instances: set,
) -> None:
    """
    Recover FROM_COMPLETION habits that are completed but have no active child.

    For each orphaned habit, chains forward from the last completed instance's
    due_date to find the most recent occurrence that should exist by
    effective_date. Only the single most recent instance is created (no
    backfilling of all missed days).

    Args:
        user: User object
        effective_date: Date to process recurrences for
        new_tasks: List to append recovered tasks to (mutated in place)
        existing_instances: Set of (title, due_date) for dedup
        pending_instances: Set of (title, due_date) for dedup (mutated in place)
    """
    # Build set of habit titles that have at least one active (incomplete) instance
    active_habit_titles = {
        t.title
        for t in user.tasks
        if t.is_habit
        and t.recurrence_rule
        and t.recurrence_ended_at is None
        and not t.is_complete
    }
    # Also count titles already being recovered in this pass
    for t in new_tasks:
        if t.is_habit and not t.is_complete:
            active_habit_titles.add(t.title)

    # Find the latest completed instance for each orphaned FROM_COMPLETION habit
    orphaned: dict[str, Task] = {}
    for task in user.tasks:
        if (
            task.is_habit
            and task.is_complete
            and task.recurrence_rule
            and task.recurrence_ended_at is None
            and task.recurrence_type == RecurrenceType.FROM_COMPLETION
            and task.title not in active_habit_titles
        ):
            existing = orphaned.get(task.title)
            if existing is None or (
                task.due_date
                and (not existing.due_date or task.due_date > existing.due_date)
            ):
                orphaned[task.title] = task

    # For each orphaned habit, chain forward to the most recent valid instance
    for task in orphaned.values():
        current = task
        last_valid: Task | None = None

        # Chain forward from the completed task's due_date, advancing through
        # recurrence periods until we pass effective_date. Keep only the last
        # valid instance (the most recent one <= effective_date).
        for _ in range(366):  # Safety limit to prevent infinite loops
            proxy_date = datetime.combine(
                current.due_date.date() if current.due_date else effective_date,
                datetime.min.time(),
            )
            next_instance = create_next_habit_instance(
                current, completion_date=proxy_date
            )

            if not next_instance or not next_instance.due_date:
                break

            next_due = next_instance.due_date.date()

            if next_due > effective_date:
                break

            instance_key = (next_instance.title, next_due)
            if (
                instance_key not in existing_instances
                and instance_key not in pending_instances
            ):
                last_valid = next_instance

            current = next_instance

        if last_valid and last_valid.due_date:
            instance_key = (last_valid.title, last_valid.due_date.date())
            new_tasks.append(last_valid)
            pending_instances.add(instance_key)


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
