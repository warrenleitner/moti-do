"""Tests for habit start delta functionality."""

from argparse import Namespace
from datetime import datetime, timedelta
from typing import Any
from unittest.mock import ANY

from pytest_mock import MockerFixture

from motido.cli import main as cli_main
from motido.core.models import Task, User
from motido.core.recurrence import create_next_habit_instance


class TestCreateWithStartDelta:
    """Tests for creating habits with start delta."""

    def test_create_habit_with_start_delta(self, mocker: MockerFixture) -> None:
        """Test creating a habit with --start-delta flag."""
        mock_manager = mocker.MagicMock()
        mock_task_class = mocker.patch("motido.cli.main.Task")
        mock_task = mocker.MagicMock()
        mock_task.id = "habit123"
        mock_task_class.return_value = mock_task

        user = User(username="testuser")

        args = Namespace(
            title="Exercise",
            priority=None,
            difficulty=None,
            duration=None,
            habit=True,
            recurrence="daily",
            recurrence_type=None,
            start_delta=3,
            no_auto_icon=True,
            verbose=False,
        )

        cli_main.handle_create(args, mock_manager, user)

        mock_task_class.assert_called_once_with(
            title="Exercise",
            priority=ANY,
            difficulty=ANY,
            duration=ANY,
            creation_date=ANY,
            is_habit=True,
            recurrence_rule="daily",
            recurrence_type=None,
            habit_start_delta=3,
            icon=None,
        )

    def test_create_task_with_start_delta_warns(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that --start-delta on non-habit warns and is ignored."""
        mock_manager = mocker.MagicMock()
        mock_task_class = mocker.patch("motido.cli.main.Task")
        mock_task = mocker.MagicMock()
        mock_task.id = "task123"
        mock_task_class.return_value = mock_task

        user = User(username="testuser")

        args = Namespace(
            title="Regular task",
            priority=None,
            difficulty=None,
            duration=None,
            habit=False,
            recurrence=None,
            recurrence_type=None,
            start_delta=3,
            no_auto_icon=True,
            verbose=False,
        )

        cli_main.handle_create(args, mock_manager, user)
        captured = capsys.readouterr()

        # Should warn about start-delta on non-habit
        assert "Warning: --start-delta is only applicable to habits" in captured.out

        # habit_start_delta should be None in the Task call
        mock_task_class.assert_called_once_with(
            title="Regular task",
            priority=ANY,
            difficulty=ANY,
            duration=ANY,
            creation_date=ANY,
            is_habit=False,
            recurrence_rule=None,
            recurrence_type=None,
            habit_start_delta=None,
            icon=None,
        )


class TestEditWithStartDelta:
    """Tests for editing habit start delta."""

    def test_edit_habit_start_delta(self, mocker: MockerFixture, capsys: Any) -> None:
        """Test editing habit_start_delta on a habit."""
        mock_manager = mocker.MagicMock()

        habit = Task(
            title="Daily exercise",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            habit_start_delta=None,
            id="habit123abc",
        )

        user = User(username="testuser")
        user.tasks = [habit]

        args = Namespace(
            id="habit123",
            title=None,
            priority=None,
            difficulty=None,
            duration=None,
            start_delta=5,
            verbose=False,
        )

        cli_main.handle_edit(args, mock_manager, user)
        captured = capsys.readouterr()

        assert habit.habit_start_delta == 5
        assert "Start delta: None days -> 5 days" in captured.out
        mock_manager.save_user.assert_called_once()

    def test_edit_start_delta_on_non_habit_warns(
        self, mocker: MockerFixture, capsys: Any
    ) -> None:
        """Test that editing start_delta on non-habit warns and doesn't update."""
        mock_manager = mocker.MagicMock()

        task = Task(
            title="Regular task",
            creation_date=datetime.now(),
            is_habit=False,
            id="task123abc",
        )

        user = User(username="testuser")
        user.tasks = [task]

        args = Namespace(
            id="task123",
            title=None,
            priority=None,
            difficulty=None,
            duration=None,
            start_delta=5,
            verbose=False,
        )

        cli_main.handle_edit(args, mock_manager, user)
        captured = capsys.readouterr()

        # Should warn
        assert "Warning: --start-delta is only applicable to habits" in captured.out
        # Should not save (no changes made)
        mock_manager.save_user.assert_not_called()


class TestRecurrenceWithStartDelta:
    """Tests for recurrence with habit_start_delta."""

    def test_next_instance_has_calculated_start_date(self) -> None:
        """Test that next habit instance has start_date based on delta."""
        habit = Task(
            title="Exercise",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            habit_start_delta=3,
            due_date=datetime.now(),
        )

        next_instance = create_next_habit_instance(habit)

        assert next_instance is not None
        assert next_instance.habit_start_delta == 3
        assert next_instance.start_date is not None
        assert next_instance.due_date is not None
        # start_date should be 3 days before due_date
        expected_start = next_instance.due_date - timedelta(days=3)
        assert next_instance.start_date == expected_start

    def test_next_instance_no_start_date_without_delta(self) -> None:
        """Test that next habit instance has no start_date without delta."""
        habit = Task(
            title="Exercise",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            habit_start_delta=None,
            due_date=datetime.now(),
        )

        next_instance = create_next_habit_instance(habit)

        assert next_instance is not None
        assert next_instance.habit_start_delta is None
        assert next_instance.start_date is None

    def test_next_instance_zero_delta_no_start_date(self) -> None:
        """Test that delta=0 doesn't calculate start_date."""
        habit = Task(
            title="Exercise",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            habit_start_delta=0,
            due_date=datetime.now(),
        )

        next_instance = create_next_habit_instance(habit)

        assert next_instance is not None
        # delta=0 means no advance notice needed
        assert next_instance.start_date is None
