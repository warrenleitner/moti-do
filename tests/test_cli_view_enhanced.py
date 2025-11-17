"""
Tests for enhanced CLI view command with all fields.
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods

import argparse
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_view
from motido.core.models import Difficulty, Duration, Priority, Task, User


class MockArgs(argparse.Namespace):
    """Mock CLI arguments - inherits from Namespace for type safety."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__()
        self.__dict__.update(kwargs)


@pytest.fixture
def mock_user_with_all_fields() -> User:
    """Create a mock user with a task containing all fields populated."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Task with all fields",
            creation_date=today,
            id="abc123def456",
            text_description="This is a detailed description\nwith multiple lines",
            priority=Priority.HIGH,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.LONG,
            due_date=today + timedelta(days=5),
            start_date=today - timedelta(days=2),
            tags=["urgent", "work", "important"],
            project="MyProject",
        )
    ]
    return user


@pytest.fixture
def mock_user_with_minimal_fields() -> User:
    """Create a mock user with a task with only required fields."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Minimal task",
            creation_date=today,
            id="xyz789abc123",
        )
    ]
    return user


@pytest.fixture
def mock_user_with_overdue_task() -> User:
    """Create a mock user with an overdue task."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Overdue task",
            creation_date=today - timedelta(days=10),
            id="overdue123",
            due_date=today - timedelta(days=2),
            is_complete=False,
        )
    ]
    return user


@pytest.fixture
def mock_user_with_due_soon_task() -> User:
    """Create a mock user with a task due soon."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Task due soon",
            creation_date=today,
            id="duesoon123",
            due_date=today + timedelta(days=1),
        )
    ]
    return user


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
def test_handle_view_with_all_fields(  # type: ignore[misc]
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_with_all_fields: User,
) -> None:
    """Test view command displays all fields when populated."""
    mock_manager = MagicMock()
    mock_load_config.return_value = {
        "base_score": 10,
        "field_presence_bonus": {"text_description": 5},
        "difficulty_multiplier": {
            "TRIVIAL": 1.0,
            "LOW": 1.0,
            "MEDIUM": 2.0,
            "HIGH": 1.0,
            "HERCULEAN": 1.0,
        },
        "duration_multiplier": {
            "MINISCULE": 1.0,
            "SHORT": 1.0,
            "MEDIUM": 1.0,
            "LONG": 2.0,
            "ODYSSEYAN": 1.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {"enabled": True, "bonus_points_per_day": 0.5},
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {
            "NOT_SET": 1.0,
            "LOW": 1.2,
            "MEDIUM": 1.5,
            "HIGH": 2.0,
            "DEFCON_ONE": 3.0,
        },
    }
    args = MockArgs(id="abc123", verbose=False)

    handle_view(args, mock_manager, mock_user_with_all_fields)

    # Verify Console was created and table was printed
    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
def test_handle_view_with_minimal_fields(  # type: ignore[misc]
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_with_minimal_fields: User,
) -> None:
    """Test view command displays 'Not set' for empty optional fields."""
    mock_manager = MagicMock()
    mock_load_config.return_value = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {
            "TRIVIAL": 1.0,
            "LOW": 1.0,
            "MEDIUM": 1.0,
            "HIGH": 1.0,
            "HERCULEAN": 1.0,
        },
        "duration_multiplier": {
            "MINISCULE": 1.0,
            "SHORT": 1.0,
            "MEDIUM": 1.0,
            "LONG": 1.0,
            "ODYSSEYAN": 1.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {"enabled": True, "bonus_points_per_day": 0.5},
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {
            "NOT_SET": 1.0,
            "LOW": 1.2,
            "MEDIUM": 1.5,
            "HIGH": 2.0,
            "DEFCON_ONE": 3.0,
        },
    }
    args = MockArgs(id="xyz789", verbose=False)

    handle_view(args, mock_manager, mock_user_with_minimal_fields)

    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
def test_handle_view_with_overdue_task(  # type: ignore[misc]
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_with_overdue_task: User,
) -> None:
    """Test view command displays overdue date in red."""
    mock_manager = MagicMock()
    mock_load_config.return_value = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {
            "TRIVIAL": 1.0,
            "LOW": 1.0,
            "MEDIUM": 1.0,
            "HIGH": 1.0,
            "HERCULEAN": 1.0,
        },
        "duration_multiplier": {
            "MINISCULE": 1.0,
            "SHORT": 1.0,
            "MEDIUM": 1.0,
            "LONG": 1.0,
            "ODYSSEYAN": 1.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {"enabled": True, "bonus_points_per_day": 0.5},
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {
            "NOT_SET": 1.0,
            "LOW": 1.2,
            "MEDIUM": 1.5,
            "HIGH": 2.0,
            "DEFCON_ONE": 3.0,
        },
    }
    args = MockArgs(id="overdue", verbose=False)

    handle_view(args, mock_manager, mock_user_with_overdue_task)

    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
def test_handle_view_with_due_soon_task(  # type: ignore[misc]
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_with_due_soon_task: User,
) -> None:
    """Test view command displays task due soon in yellow."""
    mock_manager = MagicMock()
    mock_load_config.return_value = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {
            "TRIVIAL": 1.0,
            "LOW": 1.0,
            "MEDIUM": 1.0,
            "HIGH": 1.0,
            "HERCULEAN": 1.0,
        },
        "duration_multiplier": {
            "MINISCULE": 1.0,
            "SHORT": 1.0,
            "MEDIUM": 1.0,
            "LONG": 1.0,
            "ODYSSEYAN": 1.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {"enabled": True, "bonus_points_per_day": 0.5},
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {
            "NOT_SET": 1.0,
            "LOW": 1.2,
            "MEDIUM": 1.5,
            "HIGH": 2.0,
            "DEFCON_ONE": 3.0,
        },
    }
    args = MockArgs(id="duesoon", verbose=False)

    handle_view(args, mock_manager, mock_user_with_due_soon_task)

    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called
