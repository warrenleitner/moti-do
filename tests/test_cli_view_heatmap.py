"""Tests for the heatmap view functionality."""

from argparse import Namespace
from datetime import date, datetime, timedelta
from io import StringIO
from typing import Any
from unittest.mock import MagicMock

import pytest
from rich.console import Console

from motido.cli.main import handle_view
from motido.cli.views import _render_heatmap_row, render_heatmap
from motido.core.models import Task, User
from motido.data.abstraction import DataManager

# pylint: disable=redefined-outer-name


@pytest.fixture
def mock_console() -> MagicMock:
    """Provides a mocked Rich Console."""
    return MagicMock()


@pytest.fixture
def string_console() -> Console:
    """Provides a Console that writes to a string buffer."""
    return Console(file=StringIO(), force_terminal=True)


@pytest.fixture
def user_with_habits() -> User:
    """Provides a User with habit tasks."""
    user = User(username="testuser")
    now = datetime.now()

    # Create a habit with some completed instances
    habit = Task(
        id="habit-001",
        title="Daily Exercise",
        creation_date=now - timedelta(days=30),
        is_habit=True,
        recurrence_rule="daily",
        due_date=now,
    )

    # Completed instance from yesterday
    instance1 = Task(
        id="habit-002",
        title="Daily Exercise",
        creation_date=now - timedelta(days=1),
        is_habit=True,
        parent_habit_id="habit-001",
        due_date=now - timedelta(days=1),
        is_complete=True,
    )

    # Completed instance from 3 days ago
    instance2 = Task(
        id="habit-003",
        title="Daily Exercise",
        creation_date=now - timedelta(days=3),
        is_habit=True,
        parent_habit_id="habit-001",
        due_date=now - timedelta(days=3),
        is_complete=True,
    )

    user.tasks = [habit, instance1, instance2]
    return user


# --- Render function tests ---


def test_render_heatmap_with_habit(
    user_with_habits: User, mock_console: MagicMock
) -> None:
    """Test rendering heatmap for a specific habit."""
    render_heatmap(user_with_habits.tasks, "habit-001", mock_console, weeks=4)
    # Should have printed multiple lines
    assert mock_console.print.call_count > 5


def test_render_heatmap_all_habits(
    user_with_habits: User, mock_console: MagicMock
) -> None:
    """Test rendering heatmap for all habits."""
    render_heatmap(user_with_habits.tasks, None, mock_console, weeks=4)
    assert mock_console.print.call_count > 5


def test_render_heatmap_not_found(mock_console: MagicMock) -> None:
    """Test rendering heatmap for nonexistent habit."""
    render_heatmap([], "nonexistent", mock_console, weeks=4)
    mock_console.print.assert_called()
    # Should print error message
    call_args = mock_console.print.call_args_list
    assert any("not found" in str(call) for call in call_args)


def test_render_heatmap_no_habits(mock_console: MagicMock) -> None:
    """Test rendering heatmap when no habits exist."""
    now = datetime.now()
    tasks = [Task(id="task-1", title="Regular task", creation_date=now)]
    render_heatmap(tasks, None, mock_console, weeks=4)
    mock_console.print.assert_called()
    # Should print warning message
    call_args = mock_console.print.call_args_list
    assert any("No habits" in str(call) for call in call_args)


def test_render_heatmap_with_real_console(
    user_with_habits: User, string_console: Console
) -> None:
    """Test rendering heatmap with real Console to cover helper functions."""
    render_heatmap(user_with_habits.tasks, None, string_console, weeks=4)
    # Get the output
    output = string_console.file.getvalue()  # type: ignore[attr-defined]
    assert "Daily Exercise" in output
    assert "Heatmap" in output


def test_render_heatmap_completed_habit_itself(string_console: Console) -> None:
    """Test heatmap shows completion when habit itself is complete."""
    now = datetime.now()
    habit = Task(
        id="habit-001",
        title="Completed Habit",
        creation_date=now - timedelta(days=5),
        is_habit=True,
        due_date=now - timedelta(days=2),
        is_complete=True,
    )
    tasks = [habit]
    render_heatmap(tasks, None, string_console, weeks=4)
    output = string_console.file.getvalue()  # type: ignore[attr-defined]
    assert "Completed Habit" in output


# --- CLI handler integration tests ---


def test_handle_view_heatmap(user_with_habits: User, capsys: Any) -> None:
    """Test handle_view with heatmap mode."""
    mock_manager = MagicMock(spec=DataManager)
    args = Namespace(
        view_mode="heatmap",
        habit_id=None,
        weeks=4,
        status="all",
        project=None,
        tag=None,
        verbose=False,
    )

    handle_view(args, mock_manager, user_with_habits)

    captured = capsys.readouterr()
    assert "Heatmap" in captured.out


def test_handle_view_heatmap_with_habit_id(user_with_habits: User, capsys: Any) -> None:
    """Test handle_view with heatmap mode and specific habit."""
    mock_manager = MagicMock(spec=DataManager)
    args = Namespace(
        view_mode="heatmap",
        habit_id="habit-001",
        weeks=4,
        status="all",
        project=None,
        tag=None,
        verbose=False,
    )

    handle_view(args, mock_manager, user_with_habits)

    captured = capsys.readouterr()
    assert "Daily Exercise" in captured.out


def test_handle_view_heatmap_no_user(capsys: Any) -> None:
    """Test handle_view with no user."""
    mock_manager = MagicMock(spec=DataManager)
    args = Namespace(view_mode="heatmap", habit_id=None, weeks=4, verbose=False)

    with pytest.raises(SystemExit):
        handle_view(args, mock_manager, None)

    captured = capsys.readouterr()
    assert "not found" in captured.out


# --- _render_heatmap_row function tests ---


def test_render_heatmap_row_future_dates() -> None:
    """Test _render_heatmap_row handles future dates correctly."""
    # Use a fixed "today" to ensure we hit the future date branch
    # Set "today" to a Monday (weekday=0)
    # Then rendering Sunday (day_idx=6) of the same week will be in the future
    fixed_today = date(2025, 12, 1)  # This is a Monday

    # Start from the same week as our fixed today
    start_date = fixed_today

    # Use an empty completion set
    completion_dates: set[date] = set()

    # Render a row for Sunday (day_idx=6)
    # Since fixed_today is Monday, Sunday of this week is Dec 7 which is > Dec 1
    row = _render_heatmap_row(
        day_idx=6,  # Sunday
        day_name="Sun",
        start_date=start_date,
        weeks=1,  # Just render 1 week
        today=fixed_today,
        completion_dates=completion_dates,
    )

    # The row should contain the day name and the future date indicator (·)
    row_str = str(row)
    assert "Sun" in row_str
    assert "·" in row_str  # Future date shows as dim dot
