"""
Logic for calculating task recurrences.
"""

import uuid
from datetime import datetime, timedelta
from typing import Optional, cast

from dateutil.rrule import rrulestr

from motido.core.models import RecurrenceType, SubtaskRecurrenceMode, Task


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


def create_next_habit_instance(
    task: Task, completion_date: Optional[datetime] = None
) -> Optional[Task]:
    """
    Creates the next occurrence of a habit task.

    Args:
        task: The completed habit task to generate next instance from.
        completion_date: When the task was completed. Defaults to now.

    Returns:
        A new Task instance for the next occurrence, or None if not applicable.
    """
    if not task.is_habit:
        return None

    if completion_date is None:
        completion_date = datetime.now()

    next_due = calculate_next_occurrence(task, completion_date)
    if not next_due:
        return None

    # Calculate start_date based on habit_start_delta if set
    start_date = None
    if task.habit_start_delta is not None and task.habit_start_delta > 0:
        start_date = next_due - timedelta(days=task.habit_start_delta)

    # Calculate subtasks based on subtask_recurrence_mode
    new_subtasks = _calculate_recurring_subtasks(task)

    # Create new task copying relevant fields from parent
    new_task = Task(
        id=str(uuid.uuid4()),
        title=task.title,
        creation_date=datetime.now(),
        priority=task.priority,
        difficulty=task.difficulty,
        duration=task.duration,
        due_date=next_due,
        start_date=start_date,
        text_description=task.text_description,
        icon=task.icon,
        tags=task.tags.copy(),
        project=task.project,
        is_habit=True,
        recurrence_rule=task.recurrence_rule,
        recurrence_type=task.recurrence_type,
        habit_start_delta=task.habit_start_delta,  # Carry forward the delta
        streak_current=task.streak_current,  # Carry forward the streak
        streak_best=task.streak_best,
        subtasks=new_subtasks,
        dependencies=[],  # Dependencies don't carry forward
        history=[],  # New history for new instance
        is_complete=False,
        parent_habit_id=task.id,  # Link to parent
        subtask_recurrence_mode=task.subtask_recurrence_mode,  # Carry forward mode
    )

    return new_task


def _calculate_recurring_subtasks(task: Task) -> list:
    """
    Calculate which subtasks should be included in the next habit instance
    based on the subtask_recurrence_mode setting.

    Args:
        task: The completed habit task to calculate subtasks for.

    Returns:
        List of subtask dictionaries for the new instance.
    """
    if not task.subtasks:
        return []

    mode = task.subtask_recurrence_mode

    if mode == SubtaskRecurrenceMode.ALWAYS:
        # Copy all subtasks with complete set to False
        return [{"text": s["text"], "complete": False} for s in task.subtasks]

    if mode == SubtaskRecurrenceMode.PARTIAL:
        # Only carry over subtasks that were completed
        return [
            {"text": s["text"], "complete": False}
            for s in task.subtasks
            if s.get("complete", False)
        ]

    # DEFAULT mode: No subtasks carried over (fresh start)
    return []


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
