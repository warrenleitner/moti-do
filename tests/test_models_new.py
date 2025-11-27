"""Tests for new models: XPTransaction, Badge, SubtaskRecurrenceMode."""

from datetime import datetime

import pytest

from motido.core.models import Badge, SubtaskRecurrenceMode, XPTransaction


class TestXPTransaction:
    """Tests for XPTransaction dataclass."""

    def test_create_xp_transaction_task_completion(self) -> None:
        """Test creating a task completion transaction."""
        trans = XPTransaction(
            amount=50,
            source="task_completion",
            timestamp=datetime(2025, 1, 1, 12, 0, 0),
            task_id="task-123",
            description="Completed task: Write tests",
        )
        assert trans.amount == 50
        assert trans.source == "task_completion"
        assert trans.task_id == "task-123"
        assert trans.description == "Completed task: Write tests"
        assert trans.timestamp == datetime(2025, 1, 1, 12, 0, 0)
        assert trans.id  # Auto-generated UUID

    def test_create_xp_transaction_penalty(self) -> None:
        """Test creating a penalty transaction."""
        trans = XPTransaction(
            amount=-10,
            source="penalty",
            timestamp=datetime(2025, 1, 2, 8, 0, 0),
            description="Daily penalty for overdue task",
        )
        assert trans.amount == -10
        assert trans.source == "penalty"
        assert trans.task_id is None
        assert trans.description == "Daily penalty for overdue task"

    def test_create_xp_transaction_withdrawal(self) -> None:
        """Test creating a withdrawal transaction."""
        trans = XPTransaction(
            amount=-100,
            source="withdrawal",
            timestamp=datetime(2025, 1, 3, 15, 30, 0),
            description="Manual withdrawal",
        )
        assert trans.amount == -100
        assert trans.source == "withdrawal"

    def test_create_xp_transaction_default_description(self) -> None:
        """Test that empty description is allowed."""
        trans = XPTransaction(
            amount=25,
            source="subtask_completion",
            timestamp=datetime.now(),
        )
        assert trans.description == ""

    def test_xp_transaction_unique_ids(self) -> None:
        """Test that each transaction gets a unique ID."""
        trans1 = XPTransaction(
            amount=10, source="task_completion", timestamp=datetime.now()
        )
        trans2 = XPTransaction(
            amount=20, source="task_completion", timestamp=datetime.now()
        )
        assert trans1.id != trans2.id


class TestBadge:
    """Tests for Badge dataclass."""

    def test_create_badge_unearned(self) -> None:
        """Test creating an unearned badge."""
        badge = Badge(
            id="first_task",
            name="Getting Started",
            description="Complete your first task",
            glyph="🌟",
        )
        assert badge.id == "first_task"
        assert badge.name == "Getting Started"
        assert badge.description == "Complete your first task"
        assert badge.glyph == "🌟"
        assert badge.earned_date is None
        assert not badge.is_earned()

    def test_create_badge_earned(self) -> None:
        """Test creating an earned badge."""
        earned_date = datetime(2025, 1, 15, 10, 0, 0)
        badge = Badge(
            id="streak_7",
            name="Week Warrior",
            description="Maintain a 7-day streak",
            glyph="🔥",
            earned_date=earned_date,
        )
        assert badge.earned_date == earned_date
        assert badge.is_earned()

    def test_badge_is_earned_method(self) -> None:
        """Test the is_earned method explicitly."""
        badge = Badge(
            id="test",
            name="Test Badge",
            description="Test",
            glyph="🏆",
        )
        assert badge.is_earned() is False

        badge.earned_date = datetime.now()
        assert badge.is_earned() is True


class TestSubtaskRecurrenceMode:
    """Tests for SubtaskRecurrenceMode enum."""

    def test_enum_values(self) -> None:
        """Test that enum has correct values."""
        assert SubtaskRecurrenceMode.DEFAULT.value == "default"
        assert SubtaskRecurrenceMode.PARTIAL.value == "partial"
        assert SubtaskRecurrenceMode.ALWAYS.value == "always"

    def test_enum_is_string(self) -> None:
        """Test that enum values are strings."""
        assert isinstance(SubtaskRecurrenceMode.DEFAULT.value, str)
        # str() on the enum returns the full repr, use .value for just the string
        assert SubtaskRecurrenceMode.DEFAULT.value == "default"

    def test_enum_from_string(self) -> None:
        """Test creating enum from string value."""
        assert SubtaskRecurrenceMode("default") == SubtaskRecurrenceMode.DEFAULT
        assert SubtaskRecurrenceMode("partial") == SubtaskRecurrenceMode.PARTIAL
        assert SubtaskRecurrenceMode("always") == SubtaskRecurrenceMode.ALWAYS

    def test_invalid_enum_value(self) -> None:
        """Test that invalid value raises ValueError."""
        with pytest.raises(ValueError):
            SubtaskRecurrenceMode("invalid")
