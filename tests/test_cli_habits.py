"""Tests for CLI habit commands."""

from argparse import Namespace
from datetime import datetime, timedelta

from pytest_mock import MockerFixture

from motido.cli.main import handle_advance, handle_create
from motido.core.models import RecurrenceType, Task, User
from motido.data.abstraction import DataManager


def test_handle_create_habit(mocker: MockerFixture) -> None:
    """Test creating a habit task."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    args = Namespace(
        title="Daily Habit",
        priority="Low",
        difficulty="Trivial",
        duration="Miniscule",
        habit=True,
        recurrence="daily",
        recurrence_type="Strict",
        verbose=False,
    )

    handle_create(args, mock_manager, user)

    assert len(user.tasks) == 1
    task = user.tasks[0]
    assert task.is_habit is True
    assert task.recurrence_rule == "daily"
    assert task.recurrence_type == RecurrenceType.STRICT
    mock_manager.save_user.assert_called_once()


def test_handle_advance_creates_recurrence(mocker: MockerFixture) -> None:
    """Test that advancing creates new habit instances."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    # Create a daily habit due today
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    habit = Task(
        title="Daily Habit",
        creation_date=today,
        due_date=today,
        is_habit=True,
        recurrence_rule="daily",
        recurrence_type=RecurrenceType.STRICT,
    )
    user.add_task(habit)
    user.last_processed_date = today.date()

    # Mock scoring config
    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"daily_penalty": {"apply_penalty": False}},
    )

    # Advance by 1 day
    args = Namespace(verbose=False)
    handle_advance(args, mock_manager, user)

    # Should have 2 tasks now (original + next day)
    assert len(user.tasks) == 2
    new_task = user.tasks[1]
    assert new_task.title == "Daily Habit"
    assert new_task.due_date is not None
    assert new_task.due_date.date() == (today + timedelta(days=1)).date()
