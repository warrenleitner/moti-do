"""Tests for recurrence logic."""

from datetime import datetime, timedelta

from motido.core.models import RecurrenceType, Task
from motido.core.recurrence import _normalize_rule, calculate_next_occurrence


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
