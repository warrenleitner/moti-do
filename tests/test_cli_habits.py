"""Tests for CLI habit commands."""

from argparse import Namespace
from datetime import datetime, timedelta

from pytest_mock import MockerFixture

from motido.cli.main import handle_advance, handle_complete, handle_create
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
        duration="Minuscule",
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
        return_value={},
    )

    # Advance by 1 day
    args = Namespace(verbose=False, to=None)
    handle_advance(args, mock_manager, user)

    # Should have 2 tasks now (original + next day)
    assert len(user.tasks) == 2
    new_task = user.tasks[1]
    assert new_task.title == "Daily Habit"
    assert new_task.due_date is not None
    assert new_task.due_date.date() == (today + timedelta(days=1)).date()


def test_handle_complete_updates_habit_streak(mocker: MockerFixture) -> None:
    """Test that completing a habit task increments its streak."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    # Create a habit task
    habit = Task(
        title="Daily Habit",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        streak_current=0,
        streak_best=0,
    )
    user.add_task(habit)

    # Mock scoring config
    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"base_score": 100},
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=50)
    mocker.patch("motido.cli.main.add_xp")

    args = Namespace(id=habit.id[:8], verbose=False)
    handle_complete(args, mock_manager, user)

    assert habit.is_complete is True
    assert habit.streak_current == 1
    assert habit.streak_best == 1


def test_handle_complete_updates_best_streak(mocker: MockerFixture) -> None:
    """Test that completing a habit updates best streak when current exceeds it."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    # Create a habit task with existing streak
    habit = Task(
        title="Daily Habit",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        streak_current=5,
        streak_best=5,
    )
    user.add_task(habit)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"base_score": 100},
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=50)
    mocker.patch("motido.cli.main.add_xp")

    args = Namespace(id=habit.id[:8], verbose=False)
    handle_complete(args, mock_manager, user)

    assert habit.streak_current == 6
    assert habit.streak_best == 6  # Best updated since current > best


def test_handle_complete_non_habit_no_streak_update(mocker: MockerFixture) -> None:
    """Test that completing a non-habit task does not update streaks."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    # Create a regular task (not a habit)
    task = Task(
        title="Regular Task",
        creation_date=datetime.now(),
        is_habit=False,
        streak_current=0,
        streak_best=0,
    )
    user.add_task(task)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"base_score": 100},
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=50)
    mocker.patch("motido.cli.main.add_xp")

    args = Namespace(id=task.id[:8], verbose=False)
    handle_complete(args, mock_manager, user)

    assert task.is_complete is True
    assert task.streak_current == 0  # No streak update for non-habits
    assert task.streak_best == 0


def test_handle_complete_best_streak_preserved(mocker: MockerFixture) -> None:
    """Test that best streak is not updated when current is less than best."""
    mock_manager = mocker.Mock(spec=DataManager)
    user = User(username="testuser")

    # Create a habit with a broken streak (current was reset)
    habit = Task(
        title="Daily Habit",
        creation_date=datetime.now(),
        is_habit=True,
        recurrence_rule="daily",
        streak_current=0,  # Streak was reset (e.g., missed a day)
        streak_best=10,  # Previous best streak
    )
    user.add_task(habit)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"base_score": 100},
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=50)
    mocker.patch("motido.cli.main.add_xp")

    args = Namespace(id=habit.id[:8], verbose=False)
    handle_complete(args, mock_manager, user)

    assert habit.streak_current == 1  # Started new streak
    assert habit.streak_best == 10  # Best preserved
