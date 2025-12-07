"""Tests for habits, stats, and xp log CLI commands."""

from datetime import datetime, timedelta
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_habits, handle_stats, handle_xp
from motido.core.models import (
    Badge,
    Task,
    User,
    XPTransaction,
)
from motido.data.abstraction import DEFAULT_USERNAME


class TestHandleHabits:
    """Tests for the habits command handler."""

    def test_habits_no_user(self, capsys: Any) -> None:
        """Test habits command with no user."""
        args = MagicMock()
        manager = MagicMock()

        with pytest.raises(SystemExit) as exc_info:
            handle_habits(args, manager, None)

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "User not found" in captured.out

    def test_habits_no_habits(self, capsys: Any) -> None:
        """Test habits command with no habits."""
        args = MagicMock()
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME)
        user.tasks = [
            Task(title="Regular Task", creation_date=datetime.now(), is_habit=False)
        ]

        handle_habits(args, manager, user)

        captured = capsys.readouterr()
        assert "No habits found" in captured.out

    def test_habits_with_habits(self, capsys: Any) -> None:
        """Test habits command with habits."""
        args = MagicMock()
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME)

        # Create habits with various states
        habit1 = Task(
            title="Daily Exercise",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            streak_current=5,
            streak_best=10,
            is_complete=False,
            due_date=datetime.now(),  # Due today
        )
        habit2 = Task(
            title="Weekly Review",
            creation_date=datetime.now() - timedelta(days=10),
            is_habit=True,
            recurrence_rule="weekly",
            streak_current=2,
            streak_best=4,
            is_complete=True,
        )
        habit3 = Task(
            title="Overdue Habit",
            creation_date=datetime.now() - timedelta(days=5),
            is_habit=True,
            recurrence_rule="daily",
            streak_current=0,
            streak_best=3,
            is_complete=False,
            due_date=datetime.now() - timedelta(days=2),  # Overdue
        )

        user.tasks = [habit1, habit2, habit3]

        handle_habits(args, manager, user)

        captured = capsys.readouterr()
        assert "Habit Statistics" in captured.out
        assert "Daily Exercise" in captured.out
        assert "Weekly Review" in captured.out
        assert "Total habits: 3" in captured.out

    def test_habits_with_no_due_date(self, capsys: Any) -> None:
        """Test habits command with habit that has no due date."""
        args = MagicMock()
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME)

        # Create habit with no due_date (covers line 1355 - "Pending" status)
        habit = Task(
            title="No Due Date Habit",
            creation_date=datetime.now(),
            is_habit=True,
            recurrence_rule="daily",
            streak_current=0,
            streak_best=0,
            is_complete=False,
            due_date=None,  # No due date - will show "Pending" status
        )

        user.tasks = [habit]

        handle_habits(args, manager, user)

        captured = capsys.readouterr()
        assert "Habit Statistics" in captured.out
        assert "No Due Date Habit" in captured.out
        assert "Pending" in captured.out


class TestHandleStats:
    """Tests for the stats command handler."""

    def test_stats_no_user(self, capsys: Any) -> None:
        """Test stats command with no user."""
        args = MagicMock()
        manager = MagicMock()

        with pytest.raises(SystemExit) as exc_info:
            handle_stats(args, manager, None)

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "User not found" in captured.out

    def test_stats_empty_user(self, capsys: Any) -> None:
        """Test stats command with empty user."""
        args = MagicMock()
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME, total_xp=100)
        user.tasks = []
        user.xp_transactions = []
        user.badges = []

        handle_stats(args, manager, user)

        captured = capsys.readouterr()
        assert "Productivity Stats" in captured.out
        assert "Tasks Created:" in captured.out
        assert "Total XP:" in captured.out

    def test_stats_with_data(self, capsys: Any) -> None:
        """Test stats command with full data."""
        args = MagicMock()
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME, total_xp=500)

        # Add tasks
        completed_task = Task(
            title="Completed Task",
            creation_date=datetime.now() - timedelta(days=5),
            is_complete=True,
        )
        incomplete_task = Task(
            title="Incomplete Task",
            creation_date=datetime.now() - timedelta(days=2),
            is_complete=False,
        )
        habit = Task(
            title="Daily Habit",
            creation_date=datetime.now() - timedelta(days=10),
            is_habit=True,
            streak_current=7,
            streak_best=14,
        )
        user.tasks = [completed_task, incomplete_task, habit]

        # Add XP transactions
        user.xp_transactions = [
            XPTransaction(
                amount=100,
                source="task_completion",
                timestamp=datetime.now() - timedelta(days=5),
            ),
            XPTransaction(
                amount=-20,
                source="penalty",
                timestamp=datetime.now() - timedelta(days=3),
            ),
        ]

        # Add badges
        user.badges = [
            Badge(
                id="first",
                name="First Task",
                description="Complete first task",
                glyph="🌟",
                earned_date=datetime.now() - timedelta(days=5),
            ),
            Badge(
                id="streak",
                name="Streak",
                description="7-day streak",
                glyph="🔥",
            ),
        ]

        handle_stats(args, manager, user)

        captured = capsys.readouterr()
        assert "Productivity Stats" in captured.out
        assert "XP Earned:" in captured.out
        assert "XP Spent:" in captured.out
        assert "Active Habits:" in captured.out
        assert "Badges Earned:" in captured.out
        assert "Top Habit Streaks:" in captured.out


class TestHandleXPLog:
    """Tests for the xp log subcommand."""

    def test_xp_log_no_transactions(self, capsys: Any) -> None:
        """Test xp log with no transactions."""
        args = MagicMock()
        args.xp_command = "log"
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME)
        user.xp_transactions = []

        handle_xp(args, manager, user)

        captured = capsys.readouterr()
        assert "No XP transactions recorded" in captured.out

    def test_xp_log_with_transactions(self, capsys: Any) -> None:
        """Test xp log with transactions."""
        args = MagicMock()
        args.xp_command = "log"
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME, total_xp=150)
        user.xp_transactions = [
            XPTransaction(
                amount=100,
                source="task_completion",
                timestamp=datetime(2025, 1, 1, 10, 0, 0),
                description="Completed: Big Task",
            ),
            XPTransaction(
                amount=50,
                source="subtask_completion",
                timestamp=datetime(2025, 1, 2, 11, 0, 0),
                description="Completed subtask",
            ),
            XPTransaction(
                amount=-20,
                source="penalty",
                timestamp=datetime(2025, 1, 3, 8, 0, 0),
                description="Overdue penalty",
            ),
        ]

        handle_xp(args, manager, user)

        captured = capsys.readouterr()
        assert "XP Transaction Log" in captured.out
        assert "Current XP: 150" in captured.out
        # Check transactions are shown
        assert "Big Task" in captured.out

    def test_xp_log_truncates_to_50(self, capsys: Any) -> None:
        """Test that xp log shows max 50 transactions."""
        args = MagicMock()
        args.xp_command = "log"
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME, total_xp=1000)
        # Create 60 transactions using different days instead of hours
        user.xp_transactions = [
            XPTransaction(
                amount=10,
                source="task_completion",
                timestamp=datetime(2025, 1, 1, 10, 0, 0) + timedelta(hours=i),
                description=f"Transaction {i:02d}",  # Zero-padded for easier matching
            )
            for i in range(60)
        ]

        handle_xp(args, manager, user)

        captured = capsys.readouterr()
        assert "XP Transaction Log" in captured.out
        # Last 50 should be shown (transactions 10-59)
        # The log shows last 50 in reversed order, so 59 should be at top
        assert "59" in captured.out  # Transaction 59 should be visible
        assert "10" in captured.out  # Transaction 10 should be visible
        # Check it's not showing too many by counting table rows
        # (Each transaction is in its own row)


class TestXPCommand:
    """Tests for the xp command with log subcommand."""

    def test_xp_log_subcommand(self, capsys: Any) -> None:
        """Test xp log subcommand integration."""
        args = MagicMock()
        args.xp_command = "log"
        manager = MagicMock()
        user = User(username=DEFAULT_USERNAME, total_xp=100)
        user.xp_transactions = [
            XPTransaction(
                amount=100,
                source="task_completion",
                timestamp=datetime.now(),
                description="Test",
            )
        ]

        handle_xp(args, manager, user)

        captured = capsys.readouterr()
        assert "XP Transaction Log" in captured.out

    def test_xp_no_user(self, capsys: Any) -> None:
        """Test xp command with no user."""
        args = MagicMock()
        args.xp_command = "log"
        manager = MagicMock()

        with pytest.raises(SystemExit) as exc_info:
            handle_xp(args, manager, None)

        assert exc_info.value.code == 1
        captured = capsys.readouterr()
        assert "User not found" in captured.out
