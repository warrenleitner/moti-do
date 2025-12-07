"""
Tests for enhanced CLI list command with new fields.
"""

# pylint: disable=redefined-outer-name,unused-argument,too-few-public-methods

import argparse
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import handle_list
from motido.core.models import Difficulty, Duration, Priority, Task, User


class MockArgs(argparse.Namespace):
    """Mock CLI arguments - inherits from Namespace for type safety."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__()
        self.__dict__.update(kwargs)


@pytest.fixture
def mock_user_with_all_fields() -> User:
    """Create a mock user with tasks containing all fields populated."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Task with all fields",
            creation_date=today,
            id="uuid-001",
            priority=Priority.HIGH,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.MEDIUM,
            due_date=today + timedelta(days=5),
            start_date=today - timedelta(days=2),
            tags=["urgent", "work"],
            project="MyProject",
        ),
        Task(
            title="Overdue task",
            creation_date=today - timedelta(days=10),
            id="uuid-002",
            priority=Priority.DEFCON_ONE,
            difficulty=Difficulty.HIGH,
            duration=Duration.LONG,
            due_date=today - timedelta(days=2),
            start_date=today - timedelta(days=12),
            tags=["late"],
            project="OldProject",
        ),
        Task(
            title="Task due soon",
            creation_date=today,
            id="uuid-003",
            priority=Priority.MEDIUM,
            difficulty=Difficulty.LOW,
            duration=Duration.SHORT,
            due_date=today + timedelta(days=1),
            start_date=today,
            tags=["urgent"],
            project="ActiveProject",
        ),
    ]
    return user


@pytest.fixture
def mock_user_partial_fields() -> User:
    """Create a mock user with tasks where some have optional fields, some don't."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Task with due date only",
            creation_date=today,
            id="uuid-101",
            due_date=today + timedelta(days=5),
        ),
        Task(
            title="Task with tags only",
            creation_date=today,
            id="uuid-102",
            tags=["tag1", "tag2"],
        ),
        Task(
            title="Task with project only",
            creation_date=today,
            id="uuid-103",
            project="SomeProject",
        ),
        Task(
            title="Task with start date",
            creation_date=today,
            id="uuid-104",
            start_date=today - timedelta(days=3),
        ),
        Task(
            title="Task with no optional fields",
            creation_date=today,
            id="uuid-105",
        ),
    ]
    return user


@pytest.fixture
def mock_user_no_optional_fields() -> User:
    """Create a mock user with tasks without any optional fields."""
    user = User(username="test_user")
    today = datetime.now()
    user.tasks = [
        Task(
            title="Simple task 1",
            creation_date=today,
            id="uuid-201",
        ),
        Task(
            title="Simple task 2",
            creation_date=today,
            id="uuid-202",
        ),
    ]
    return user


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
@patch("builtins.print")
def test_handle_list_with_all_fields(  # type: ignore[misc]
    mock_print: MagicMock,
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_with_all_fields: User,
) -> None:
    """Test list command displays all optional columns when fields are populated."""
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
    }
    args = MockArgs(verbose=False)

    handle_list(args, mock_manager, mock_user_with_all_fields)

    # Verify Console was created and table was printed
    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called

    # Verify the total tasks message was printed
    mock_print.assert_called_with("Total tasks: 3")


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
@patch("builtins.print")
def test_handle_list_with_partial_fields(  # type: ignore[misc]
    mock_print: MagicMock,
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_partial_fields: User,
) -> None:
    """Test list command with mix of tasks with and without optional fields."""
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
    }
    args = MockArgs(verbose=False)

    handle_list(args, mock_manager, mock_user_partial_fields)

    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called
    mock_print.assert_called_with("Total tasks: 5")


@patch("motido.cli.main.Console")
@patch("motido.cli.main.load_scoring_config")
@patch("builtins.print")
def test_handle_list_without_optional_fields(  # type: ignore[misc]
    mock_print: MagicMock,
    mock_load_config: MagicMock,
    mock_console: MagicMock,
    mock_user_no_optional_fields: User,
) -> None:
    """Test list command when no tasks have optional fields."""
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
    }
    args = MockArgs(verbose=False)

    handle_list(args, mock_manager, mock_user_no_optional_fields)

    # Should not add optional columns
    assert mock_console.called
    console_instance = mock_console.return_value
    assert console_instance.print.called
    mock_print.assert_called_with("Total tasks: 2")
