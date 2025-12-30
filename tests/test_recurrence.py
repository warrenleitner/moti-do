"""Tests for recurrence logic."""

from datetime import datetime, timedelta

from motido.core.models import Priority, RecurrenceType, SubtaskRecurrenceMode, Task
from motido.core.recurrence import (
    _advance_to_future_start,
    _calculate_start_date,
    _normalize_rule,
    calculate_next_occurrence,
    create_next_habit_instance,
)


def test_normalize_rule_simple() -> None:
    """Test normalization of simple keywords."""
    assert _normalize_rule("daily") == "FREQ=DAILY"
    assert _normalize_rule("Weekly") == "FREQ=WEEKLY"
    assert _normalize_rule("MONTHLY") == "FREQ=MONTHLY"


def test_normalize_rule_every_x() -> None:
    """Test normalization of 'every X ...' patterns."""
    assert _normalize_rule("every 3 days") == "FREQ=DAILY;INTERVAL=3"
    assert _normalize_rule("every 2 weeks") == "FREQ=WEEKLY;INTERVAL=2"
    assert _normalize_rule("every 1 month") == "FREQ=MONTHLY;INTERVAL=1"
    assert _normalize_rule("every 1 year") == "FREQ=YEARLY;INTERVAL=1"


def test_calculate_next_occurrence_daily() -> None:
    """Test daily recurrence."""
    start_date = datetime(2023, 1, 1, 12, 0, 0)
    task = Task(
        title="Daily Task",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
    )

    next_date = calculate_next_occurrence(task)
    assert next_date is not None
    assert next_date.date() == (start_date + timedelta(days=1)).date()


def test_calculate_next_occurrence_every_3_days() -> None:
    """Test 'every 3 days' recurrence."""
    start_date = datetime(2023, 1, 1, 12, 0, 0)
    task = Task(
        title="Every 3 Days",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="every 3 days",
        recurrence_type=RecurrenceType.STRICT,
    )

    next_date = calculate_next_occurrence(task)
    assert next_date is not None
    assert next_date.date() == (start_date + timedelta(days=3)).date()


def test_calculate_next_occurrence_from_completion() -> None:
    """Test recurrence from completion date."""
    due_date = datetime(2023, 1, 1, 12, 0, 0)
    completion_date = datetime(2023, 1, 5, 10, 0, 0)  # Completed 4 days late

    task = Task(
        title="From Completion",
        creation_date=due_date,
        due_date=due_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.FROM_COMPLETION,
    )

    next_date = calculate_next_occurrence(task, completion_date=completion_date)
    assert next_date is not None
    # Should be 1 day after completion date
    assert next_date.date() == (completion_date + timedelta(days=1)).date()


def test_calculate_next_occurrence_not_habit() -> None:
    """Test that non-habit tasks return None."""
    task = Task(title="Not a habit", creation_date=datetime.now())
    assert calculate_next_occurrence(task) is None


def test_calculate_next_occurrence_no_rule() -> None:
    """Test that habit tasks without a rule return None."""
    task = Task(title="No rule", creation_date=datetime.now(), is_habit=True)
    assert calculate_next_occurrence(task) is None


def test_calculate_next_occurrence_from_due_date() -> None:
    """Test recurrence from due date."""
    due_date = datetime(2023, 1, 1, 12, 0, 0)
    task = Task(
        title="From Due Date",
        creation_date=due_date,
        due_date=due_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
    )
    next_date = calculate_next_occurrence(task)
    assert next_date is not None
    assert next_date.date() == (due_date + timedelta(days=1)).date()


def test_calculate_next_occurrence_invalid_rule() -> None:
    """Test that invalid rules return None and print error."""
    task = Task(
        title="Invalid Rule",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="invalid_rule_string",
    )
    assert calculate_next_occurrence(task) is None


def test_normalize_rule_invalid_every() -> None:
    """Test that invalid 'every' rules are returned as-is."""
    assert _normalize_rule("every invalid days") == "every invalid days"
    assert _normalize_rule("every 3 invalid") == "every 3 invalid"


def test_parse_every_rule_invalid_int() -> None:
    """Test _parse_every_rule with invalid integer."""
    # pylint: disable=import-outside-toplevel,protected-access
    from motido.core.recurrence import _parse_every_rule

    assert _parse_every_rule("every invalid days") is None


def test_parse_every_rule_invalid_length() -> None:
    """Test _parse_every_rule with invalid length."""
    # pylint: disable=import-outside-toplevel,protected-access
    from motido.core.recurrence import _parse_every_rule

    assert _parse_every_rule("every day") is None  # 2 parts


def test_parse_every_rule_invalid_unit() -> None:
    """Test _parse_every_rule with invalid unit."""
    # pylint: disable=import-outside-toplevel,protected-access
    from motido.core.recurrence import _parse_every_rule

    assert _parse_every_rule("every 3 foobars") is None


# --- Tests for create_next_habit_instance ---


def test_create_next_habit_instance_basic() -> None:
    """Test basic habit instance creation."""
    start_date = datetime(2023, 1, 1, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Daily Task",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
        priority=Priority.HIGH,
        tags=["health", "fitness"],
        project="wellness",
        streak_current=5,
        streak_best=10,
    )

    new_instance = create_next_habit_instance(task, start_date)

    assert new_instance is not None
    assert new_instance.id != task.id  # New unique ID
    assert new_instance.title == task.title
    assert new_instance.priority == task.priority
    assert new_instance.tags == task.tags  # Tags copied
    assert new_instance.project == task.project
    assert new_instance.is_habit is True
    assert new_instance.recurrence_rule == task.recurrence_rule
    assert new_instance.recurrence_type == task.recurrence_type
    assert new_instance.streak_current == 5  # Streak preserved
    assert new_instance.streak_best == 10
    assert new_instance.parent_habit_id == task.id  # Links to parent
    assert new_instance.is_complete is False
    assert new_instance.due_date is not None
    assert new_instance.due_date.date() == (start_date + timedelta(days=1)).date()


def test_create_next_habit_instance_not_habit() -> None:
    """Test that non-habit tasks return None."""
    task = Task(
        title="Regular Task",
        creation_date=datetime.now(),
        is_habit=False,
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is None


def test_create_next_habit_instance_no_rule() -> None:
    """Test that habits without recurrence rule return None."""
    task = Task(
        title="Habit without rule",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule=None,
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is None


def test_create_next_habit_instance_default_completion_date() -> None:
    """Test that completion_date defaults to now."""
    start_date = datetime(2023, 1, 1, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Daily Task",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.FROM_COMPLETION,
    )

    # Call without completion_date - should use now()
    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    # Due date should be tomorrow from now
    assert new_instance.due_date is not None


def test_create_next_habit_instance_subtasks_reset() -> None:
    """Test that subtasks are not carried forward."""
    task = Task(
        id="parent-id",
        title="Task with subtasks",
        creation_date=datetime.now(),
        due_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        subtasks=[{"text": "Subtask 1", "complete": True}],
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    assert new_instance.subtasks == []  # Fresh subtasks


def test_create_next_habit_instance_dependencies_reset() -> None:
    """Test that dependencies are not carried forward."""
    task = Task(
        id="parent-id",
        title="Task with deps",
        creation_date=datetime.now(),
        due_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        dependencies=["other-task-id"],
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    assert new_instance.dependencies == []  # Dependencies reset


def test_create_next_habit_instance_subtasks_always_mode() -> None:
    """Test ALWAYS mode copies all subtasks regardless of completion status."""
    task = Task(
        id="parent-id",
        title="Task with subtasks",
        creation_date=datetime.now(),
        due_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        subtasks=[
            {"text": "Subtask 1", "complete": True},
            {"text": "Subtask 2", "complete": False},
        ],
        subtask_recurrence_mode=SubtaskRecurrenceMode.ALWAYS,
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    assert len(new_instance.subtasks) == 2
    # All subtasks should be reset to incomplete
    assert new_instance.subtasks[0] == {"text": "Subtask 1", "complete": False}
    assert new_instance.subtasks[1] == {"text": "Subtask 2", "complete": False}


def test_create_next_habit_instance_subtasks_partial_mode() -> None:
    """Test PARTIAL mode only copies completed subtasks."""
    task = Task(
        id="parent-id",
        title="Task with subtasks",
        creation_date=datetime.now(),
        due_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        subtasks=[
            {"text": "Subtask 1", "complete": True},
            {"text": "Subtask 2", "complete": False},
            {"text": "Subtask 3", "complete": True},
        ],
        subtask_recurrence_mode=SubtaskRecurrenceMode.PARTIAL,
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    # Only completed subtasks should be copied
    assert len(new_instance.subtasks) == 2
    assert new_instance.subtasks[0] == {"text": "Subtask 1", "complete": False}
    assert new_instance.subtasks[1] == {"text": "Subtask 3", "complete": False}


def test_create_next_habit_instance_subtasks_default_mode() -> None:
    """Test DEFAULT mode does not copy any subtasks."""
    task = Task(
        id="parent-id",
        title="Task with subtasks",
        creation_date=datetime.now(),
        due_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        subtasks=[
            {"text": "Subtask 1", "complete": True},
            {"text": "Subtask 2", "complete": False},
        ],
        subtask_recurrence_mode=SubtaskRecurrenceMode.DEFAULT,
    )

    new_instance = create_next_habit_instance(task)
    assert new_instance is not None
    assert new_instance.subtasks == []


def test_create_next_habit_instance_empty_subtasks_all_modes() -> None:
    """Test that empty subtasks list works for all modes."""
    for mode in SubtaskRecurrenceMode:
        task = Task(
            id="parent-id",
            title="Task without subtasks",
            creation_date=datetime.now(),
            due_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            subtasks=[],
            subtask_recurrence_mode=mode,
        )

        new_instance = create_next_habit_instance(task)
        assert new_instance is not None
        assert new_instance.subtasks == []


# --- Tests for minimum start date logic (FROM_DUE_DATE) ---


def test_from_due_date_skips_past_start_date() -> None:
    """Test FROM_DUE_DATE recurrence skips forward when start_date would be in past.

    Example: Task due Jan 14 with start Jan 1 (13-day delta), monthly recurrence.
    If current date is Feb 2, next due Feb 14 would have start Feb 1 (in past).
    Should skip to March (due March 14, start March 1).
    """
    # Original task: due Jan 14, start Jan 1 (habit_start_delta = 13)
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
        habit_start_delta=13,  # Start 13 days before due = Jan 1
    )

    # Current real date is Feb 2
    current_date = datetime(2024, 2, 2, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    # Should skip February (start Feb 1 < current Feb 2) and go to March
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 3
    assert new_instance.due_date.day == 14
    assert new_instance.start_date is not None
    assert new_instance.start_date.month == 3
    assert new_instance.start_date.day == 1


def test_from_due_date_skips_multiple_periods() -> None:
    """Test that FROM_DUE_DATE skips multiple periods if needed.

    If current date is far in the future, should skip multiple intervals.
    """
    # Task due Jan 14, monthly recurrence
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
        habit_start_delta=13,  # Start 13 days before due
    )

    # Current date is May 10 - should skip Feb, Mar, Apr and land on May
    current_date = datetime(2024, 5, 10, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    # May 1 (start) >= May 10 (current)? No. So should go to June.
    # June 1 (start) >= May 10 (current)? Yes.
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 6
    assert new_instance.due_date.day == 14
    assert new_instance.start_date is not None
    assert new_instance.start_date.month == 6
    assert new_instance.start_date.day == 1


def test_from_due_date_no_skip_when_future() -> None:
    """Test FROM_DUE_DATE doesn't skip when start_date is already in future."""
    # Task due Jan 14, start Jan 1
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
        habit_start_delta=13,
    )

    # Current date is Jan 15 - Feb 1 (start) is in future
    current_date = datetime(2024, 1, 15, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    # Should be February as normal
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 2
    assert new_instance.due_date.day == 14
    assert new_instance.start_date is not None
    assert new_instance.start_date.month == 2
    assert new_instance.start_date.day == 1


def test_from_due_date_no_start_delta_uses_due_date() -> None:
    """Test FROM_DUE_DATE uses due_date for comparison when no habit_start_delta."""
    # Task due Jan 14, no start_date (no delta)
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
        habit_start_delta=None,  # No start_date
    )

    # Current date is Feb 20 - Feb 14 (due) is in past
    current_date = datetime(2024, 2, 20, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    # Feb 14 < Feb 20, so should skip to March 14
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 3
    assert new_instance.due_date.day == 14
    assert new_instance.start_date is None


def test_from_completion_does_not_skip() -> None:
    """Test that FROM_COMPLETION recurrence does NOT skip past dates.

    FROM_COMPLETION calculates from completion date, so the result
    should always be in the future relative to completion.
    """
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    completion_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.FROM_COMPLETION,
        habit_start_delta=13,
    )

    # Even if current_date is way in the future, FROM_COMPLETION
    # should use completion_date as reference
    current_date = datetime(2024, 5, 1, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=completion_date, current_date=current_date
    )

    assert new_instance is not None
    # FROM_COMPLETION: next due = completion + 1 month = Feb 14
    # This is NOT adjusted because we only adjust FROM_DUE_DATE
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 2
    assert new_instance.due_date.day == 14


def test_strict_does_not_skip() -> None:
    """Test that STRICT recurrence does NOT skip past dates."""
    due_date = datetime(2024, 1, 14, 12, 0, 0)
    task = Task(
        id="parent-id",
        title="Monthly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="monthly",
        recurrence_type=RecurrenceType.STRICT,
        habit_start_delta=13,
    )

    # Even if current_date is in the future, STRICT should not skip
    current_date = datetime(2024, 5, 1, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    # STRICT uses due_date as reference, next = Feb 14
    # This is NOT adjusted because we only adjust FROM_DUE_DATE
    assert new_instance.due_date is not None
    assert new_instance.due_date.month == 2
    assert new_instance.due_date.day == 14


def test_from_due_date_weekly_recurrence() -> None:
    """Test FROM_DUE_DATE skipping works with weekly recurrence."""
    # Task due Monday Jan 8, start Friday Jan 5 (3-day delta)
    due_date = datetime(2024, 1, 8, 12, 0, 0)  # Monday
    task = Task(
        id="parent-id",
        title="Weekly Task",
        creation_date=datetime(2024, 1, 1),
        due_date=due_date,
        is_habit=True,
        recurrence_rule="weekly",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
        habit_start_delta=3,  # Start 3 days before (Friday)
    )

    # Current date is Jan 20 (Saturday)
    # Next due would be Jan 15, start Jan 12 - both in past
    # Should skip to Jan 22 (due), start Jan 19
    current_date = datetime(2024, 1, 20, 12, 0, 0)

    new_instance = create_next_habit_instance(
        task, completion_date=due_date, current_date=current_date
    )

    assert new_instance is not None
    assert new_instance.due_date is not None
    # Jan 15 start=Jan 12 < Jan 20, skip
    # Jan 22 start=Jan 19 < Jan 20, skip
    # Jan 29 start=Jan 26 >= Jan 20, use this
    assert new_instance.due_date.day == 29
    assert new_instance.start_date is not None
    assert new_instance.start_date.day == 26


# --- Tests for helper functions ---


def test_calculate_start_date_with_delta() -> None:
    """Test _calculate_start_date with a positive delta."""
    due_date = datetime(2024, 1, 15, 12, 0, 0)
    result = _calculate_start_date(due_date, 5)
    assert result == datetime(2024, 1, 10, 12, 0, 0)


def test_calculate_start_date_no_delta() -> None:
    """Test _calculate_start_date with None delta."""
    due_date = datetime(2024, 1, 15, 12, 0, 0)
    result = _calculate_start_date(due_date, None)
    assert result is None


def test_calculate_start_date_zero_delta() -> None:
    """Test _calculate_start_date with zero delta."""
    due_date = datetime(2024, 1, 15, 12, 0, 0)
    result = _calculate_start_date(due_date, 0)
    assert result is None


def test_advance_to_future_start_invalid_rule() -> None:
    """Test _advance_to_future_start handles invalid rule gracefully."""
    task = Task(
        id="parent-id",
        title="Task",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="invalid_rule_that_cannot_be_parsed",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
    )
    next_due = datetime(2024, 1, 15, 12, 0, 0)
    start_date = datetime(2024, 1, 10, 12, 0, 0)
    current_date = datetime(2024, 2, 1, 12, 0, 0)

    # Should return original values when rule is invalid
    result_due, result_start = _advance_to_future_start(
        task, next_due, start_date, current_date
    )

    # Original values returned when parsing fails
    assert result_due == next_due
    assert result_start == start_date


def test_advance_to_future_start_finite_rule_exhausted() -> None:
    """Test _advance_to_future_start when recurrence rule runs out of occurrences."""
    # Use a rule with COUNT=1 - only one occurrence allowed
    task = Task(
        id="parent-id",
        title="Task",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="FREQ=DAILY;COUNT=1",
        recurrence_type=RecurrenceType.FROM_DUE_DATE,
    )
    # Initial due date is Jan 15, start date is Jan 10
    next_due = datetime(2024, 1, 15, 12, 0, 0)
    start_date = datetime(2024, 1, 10, 12, 0, 0)
    # Current date is way in the future - rule will exhaust before we reach it
    current_date = datetime(2024, 12, 1, 12, 0, 0)

    result_due, result_start = _advance_to_future_start(
        task, next_due, start_date, current_date
    )

    # When rule exhausts, we get the last computed values
    # COUNT=1 means only Jan 16 after Jan 15, then None
    # The function should break out of loop and return last computed values
    assert result_due is not None
    assert result_start is not None
