"""Tests for core utility functions."""

import uuid
from datetime import datetime, timedelta
from typing import List

import pytest

from motido.core.models import Difficulty, Duration, Priority, RecurrenceType, Task
from motido.core.utils import (
    generate_uuid,
    parse_difficulty_safely,
    parse_duration_safely,
    parse_priority_safely,
)

# import pytest # W0611: Unused import


def test_generate_uuid_returns_string() -> None:
    """Test that generate_uuid returns a string."""
    new_id = generate_uuid()
    assert isinstance(new_id, str)


def test_generate_uuid_format() -> None:
    """Test that generate_uuid returns a string in UUID format."""
    new_id = generate_uuid()
    # Basic check for UUID format (length 36, dashes in correct places)
    assert len(new_id) == 36
    assert new_id[8] == "-"
    assert new_id[13] == "-"
    assert new_id[18] == "-"
    assert new_id[23] == "-"
    # More robust check: try parsing it as a UUID
    uuid.UUID(new_id, version=4)  # This will raise ValueError if invalid


def test_generate_uuid_uniqueness() -> None:
    """Test that subsequent calls to generate_uuid return different IDs."""
    id1 = generate_uuid()
    id2 = generate_uuid()
    assert id1 != id2


def test_parse_priority_safely_valid_priority() -> None:
    """Test that parse_priority_safely correctly converts a valid priority string."""
    priority = parse_priority_safely("High")
    assert priority == Priority.HIGH


def test_parse_priority_safely_invalid_priority(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that parse_priority_safely returns LOW for invalid priority strings."""
    # Mock print function to avoid printing to console during test
    monkeypatch.setattr("builtins.print", lambda *args: None)

    priority = parse_priority_safely("InvalidPriority")
    assert priority == Priority.LOW


def test_parse_priority_safely_with_task_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that parse_priority_safely includes task ID in warning."""
    # Setup a mock to capture print calls
    printed_messages: List[str] = []
    monkeypatch.setattr(
        "builtins.print", lambda *args, **kwargs: printed_messages.append(args[0])
    )

    priority = parse_priority_safely("InvalidPriority", "test-task-id")
    assert priority == Priority.LOW
    assert any("in task test-task-id" in msg for msg in printed_messages)


def test_parse_difficulty_safely_valid_difficulty() -> None:
    """Test that parse_difficulty_safely correctly converts a valid difficulty string."""
    difficulty = parse_difficulty_safely("High")
    assert difficulty == Difficulty.HIGH


def test_parse_difficulty_safely_invalid_difficulty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that parse_difficulty_safely returns TRIVIAL for invalid difficulty strings."""
    monkeypatch.setattr("builtins.print", lambda *args: None)

    difficulty = parse_difficulty_safely("InvalidDifficulty")
    assert difficulty == Difficulty.TRIVIAL


def test_parse_difficulty_safely_with_task_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that parse_difficulty_safely includes task ID in warning."""
    printed_messages: List[str] = []
    monkeypatch.setattr(
        "builtins.print", lambda *args, **kwargs: printed_messages.append(args[0])
    )

    difficulty = parse_difficulty_safely("InvalidDifficulty", "test-task-id")
    assert difficulty == Difficulty.TRIVIAL
    assert any("in task test-task-id" in msg for msg in printed_messages)


def test_parse_duration_safely_valid_duration() -> None:
    """Test that parse_duration_safely correctly converts a valid duration string."""
    duration = parse_duration_safely("Long")
    assert duration == Duration.LONG


def test_parse_duration_safely_invalid_duration(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Test that parse_duration_safely returns MINUSCULE for invalid duration strings."""
    monkeypatch.setattr("builtins.print", lambda *args: None)

    duration = parse_duration_safely("InvalidDuration")
    assert duration == Duration.MINUSCULE


def test_parse_duration_safely_with_task_id(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test that parse_duration_safely includes task ID in warning."""
    printed_messages: List[str] = []
    monkeypatch.setattr(
        "builtins.print", lambda *args, **kwargs: printed_messages.append(args[0])
    )

    duration = parse_duration_safely("InvalidDuration", "test-task-id")
    assert duration == Duration.MINUSCULE
    assert any("in task test-task-id" in msg for msg in printed_messages)


def test_process_recurrences_duplicate_prevention() -> None:
    """Test that _process_recurrences prevents duplicate task generation."""
    # pylint: disable=import-outside-toplevel,protected-access
    from motido.core.utils import _process_recurrences

    start_date = datetime(2023, 1, 1)
    task1 = Task(
        title="Recurring Task",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
    )
    task2 = Task(
        title="Recurring Task",
        creation_date=start_date,
        due_date=start_date,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
    )

    # Mock user
    class MockUser:
        """Mock user for testing recurrence processing."""

        # pylint: disable=too-few-public-methods

        def __init__(self) -> None:
            self.tasks = [task1, task2]
            self.added_tasks: List[Task] = []

        def add_task(self, task: Task) -> None:
            """Mock add_task method."""
            self.added_tasks.append(task)

    user = MockUser()
    effective_date = (start_date + timedelta(days=1)).date()

    _process_recurrences(user, effective_date)

    # Should only create ONE new task
    assert len(user.added_tasks) == 1
    assert user.added_tasks[0].title == "Recurring Task"
