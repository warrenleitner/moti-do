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
    task: Task,
    completion_date: Optional[datetime] = None,
) -> Optional[Task]:
    """
    Creates the next occurrence of a habit task.

    Args:
        task: The completed habit task to generate next instance from.
        completion_date: When the task was completed. Defaults to now.
            For FROM_DUE_DATE recurrence, ensures the new instance's
            due_date is after the completion_date.

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

    # Determine effective habit_start_delta:
    # Use explicit value if set, otherwise infer from original start_date/due_date
    effective_delta = task.habit_start_delta
    if effective_delta is None and task.start_date and task.due_date:
        # Infer delta from the original task's dates
        # Include 0 to handle same-day start/due dates
        inferred_delta = (task.due_date - task.start_date).days
        if inferred_delta >= 0:
            effective_delta = inferred_delta

    # Calculate start_date based on effective delta
    start_date = _calculate_start_date(next_due, effective_delta)

    # For FROM_DUE_DATE recurrence, ensure due_date is after completion_date
    if task.recurrence_type == RecurrenceType.FROM_DUE_DATE:
        next_due, start_date = _advance_to_future_start(
            task, next_due, start_date, completion_date, effective_delta
        )

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


def _calculate_start_date(
    due_date: datetime, habit_start_delta: Optional[int]
) -> Optional[datetime]:
    """
    Calculate start_date based on due_date and habit_start_delta.

    Args:
        due_date: The due date for the task.
        habit_start_delta: Days before due date when task should start.
            A delta of 0 means start_date equals due_date.

    Returns:
        The calculated start_date, or None if no delta is set.
    """
    if habit_start_delta is not None and habit_start_delta >= 0:
        return due_date - timedelta(days=habit_start_delta)
    return None


def _advance_to_future_start(
    task: Task,
    next_due: datetime,
    start_date: Optional[datetime],
    completion_date: datetime,
    effective_delta: Optional[int],
) -> tuple[datetime, Optional[datetime]]:
    """
    Advance due_date/start_date forward until due_date is after completion_date.

    For FROM_DUE_DATE recurrence, if the calculated due_date is not after
    the completion_date, keep advancing by the recurrence interval until
    the due date is in the future relative to when the task was completed.

    This ensures that completing a task late still results in a new instance
    with a due date that makes sense (after the completion, not before).

    Args:
        task: The task with recurrence rule.
        next_due: The initially calculated next due date.
        start_date: The initially calculated start date (may be None).
        completion_date: When the previous instance was completed.
        effective_delta: The effective habit_start_delta (explicit or inferred).

    Returns:
        Tuple of (adjusted_due_date, adjusted_start_date).
    """
    # If due date is already after completion date, no adjustment needed
    if next_due > completion_date:
        return next_due, start_date

    # Need to advance - parse the recurrence rule
    try:
        rule_str = _normalize_rule(task.recurrence_rule or "")
        rule = rrulestr(rule_str, dtstart=next_due)

        # Keep advancing until due_date is after completion_date
        while next_due <= completion_date:
            next_occurrence = rule.after(next_due)
            if next_occurrence is None:
                # No more occurrences - return what we have
                break
            next_due = next_occurrence
            start_date = _calculate_start_date(next_due, effective_delta)

    except (ValueError, TypeError):
        # If rule parsing fails, return original values
        pass

    return next_due, start_date


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
