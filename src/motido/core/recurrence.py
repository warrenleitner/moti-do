"""
Logic for calculating task recurrences.
"""

from datetime import datetime
from typing import Optional, cast

from dateutil.rrule import rrulestr

from motido.core.models import RecurrenceType, Task


def calculate_next_occurrence(
    task: Task, completion_date: Optional[datetime] = None
) -> Optional[datetime]:
    """
    Calculates the next occurrence date for a habit task.

    Args:
        task: The task to calculate next occurrence for.
        completion_date: The date the task was completed (used for FROM_COMPLETION type).

    Returns:
        The next due date, or None if no recurrence rule or invalid rule.
    """
    if not task.is_habit or not task.recurrence_rule:
        return None

    # Determine the reference date based on recurrence type
    if task.recurrence_type == RecurrenceType.FROM_COMPLETION and completion_date:
        reference_date = completion_date
    elif task.recurrence_type == RecurrenceType.FROM_DUE_DATE and task.due_date:
        reference_date = task.due_date
    else:
        # Default/Strict: Use due date if available, else creation/now
        reference_date = task.due_date if task.due_date else datetime.now()

    try:
        rule_str = _normalize_rule(task.recurrence_rule)

        # Create rrule object
        # We pass dtstart as the reference date so the series starts from there
        rule = rrulestr(rule_str, dtstart=reference_date)

        # Get the next occurrence after the reference date
        next_date = rule.after(reference_date)
        return cast(Optional[datetime], next_date)

    except (ValueError, TypeError) as e:
        print(f"Error calculating recurrence for task {task.id[:8]}: {e}")
        return None


def _normalize_rule(rule: str) -> str:
    """Normalizes simple rule strings to rrule format."""
    rule_lower = rule.lower()

    simple_map = {
        "daily": "FREQ=DAILY",
        "weekly": "FREQ=WEEKLY",
        "monthly": "FREQ=MONTHLY",
        "yearly": "FREQ=YEARLY",
    }

    if rule_lower in simple_map:
        return simple_map[rule_lower]

    # If it starts with "every", try to parse simple "every X days/weeks"
    if rule_lower.startswith("every "):
        parsed = _parse_every_rule(rule_lower)
        if parsed:
            return parsed

    return rule  # Assume it's already in rrule format or let rrulestr handle/fail


def _parse_every_rule(rule_lower: str) -> Optional[str]:
    """Parses 'every X units' rules."""
    # pylint: disable=too-many-return-statements
    parts = rule_lower.split()
    if len(parts) != 3:
        return None

    try:
        interval = int(parts[1])
    except ValueError:
        return None

    unit = parts[2]
    if unit.startswith("day"):
        return f"FREQ=DAILY;INTERVAL={interval}"
    if unit.startswith("week"):
        return f"FREQ=WEEKLY;INTERVAL={interval}"
    if unit.startswith("month"):
        return f"FREQ=MONTHLY;INTERVAL={interval}"
    if unit.startswith("year"):
        return f"FREQ=YEARLY;INTERVAL={interval}"
    return None  # pragma: no cover
