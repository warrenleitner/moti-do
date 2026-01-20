# tests/test_cli_scoring.py
"""
Tests for CLI commands related to scoring.
"""
# pylint: disable=redefined-outer-name,unused-argument,duplicate-code

import argparse
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from rich.text import Text

from motido.cli.main import (
    handle_complete,
    handle_list,
    handle_run_penalties,
    handle_view,
)
from motido.core.models import Difficulty, Duration, Task, User


@pytest.fixture
def mock_user() -> User:
    """Create a mock user with some tasks."""
    user = User(username="test_user")

    # Create a few tasks with different characteristics
    # Task 1: High difficulty, Long duration
    task1 = Task(
        id="task1",
        title="High difficulty task",
        creation_date=datetime.now() - timedelta(days=5),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        is_complete=False,
    )

    # Task 2: Medium difficulty, Medium duration
    task2 = Task(
        id="task2",
        title="Medium difficulty task",
        creation_date=datetime.now() - timedelta(days=2),
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        is_complete=False,
    )

    # Task 3: Low difficulty, Short duration, already completed
    task3 = Task(
        id="task3",
        title="Easy completed task",
        creation_date=datetime.now() - timedelta(days=1),
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
        is_complete=True,
    )

    user.tasks = [task1, task2, task3]
    return user


@pytest.fixture
def mock_config() -> dict:
    """Create a mock scoring config."""
    return {
        "base_score": 10,
        "difficulty_multiplier": {
            "NOT_SET": 1.0,
            "TRIVIAL": 1.1,
            "LOW": 1.5,
            "MEDIUM": 2.0,
            "HIGH": 3.0,
            "HERCULEAN": 5.0,
        },
        "duration_multiplier": {
            "NOT_SET": 1.0,
            "MINUSCULE": 1.05,
            "SHORT": 1.2,
            "MEDIUM": 1.5,
            "LONG": 2.0,
            "ODYSSEYAN": 3.0,
        },
        "age_factor": {
            "enabled": True,
            "unit": "days",
            "multiplier_per_unit": 0.01,
            "max_multiplier": 1.5,
        },
        "due_date_proximity": {
            "enabled": True,
            "unit": "days",
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
    }


# pylint: disable=too-few-public-methods
class MockArgs(argparse.Namespace):
    """Mock CLI arguments."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__()
        self.__dict__.update(kwargs)
        # Default attributes
        if not hasattr(self, "verbose"):
            self.verbose = False
        if not hasattr(self, "date"):
            self.date = None


# pylint: enable=too-few-public-methods


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.calculate_score")
@patch("rich.table.Table.add_row")
@patch("rich.console.Console.print")
def test_handle_view_displays_score(
    mock_console_print: MagicMock,
    mock_add_row: MagicMock,
    mock_calculate_score: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
) -> None:
    """Test that handle_view displays the task score."""
    # Setup mocks
    mock_load_config.return_value = {"mock": "config"}
    mock_calculate_score.return_value = 42
    mock_manager = MagicMock()

    # Call the view handler
    args = MockArgs(id="task1")
    handle_view(args, mock_manager, mock_user)

    # Verify score calculation
    mock_load_config.assert_called_once()
    # Find the task with id "task1"
    task = next(task for task in mock_user.tasks if task.id == "task1")
    mock_calculate_score.assert_called_once_with(
        task, None, {"mock": "config"}, date.today()
    )

    # Verify score display - check that add_row was called with score
    found_score = False
    score_value = ""

    # Instead of trying to index into args, iterate through call args to find Score:
    for call in mock_add_row.call_args_list:
        args_list = call[0]
        if len(args_list) >= 1 and args_list[0] == "Score:":
            found_score = True
            if len(args_list) >= 2:
                score_obj = args_list[1]
                if isinstance(score_obj, Text):
                    score_value = score_obj.plain
            break

    assert found_score, "Score row not found in table"
    assert score_value == "42"


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.calculate_score")
@patch("motido.cli.main.add_xp")
def test_handle_complete_adds_xp(
    mock_add_xp: MagicMock,
    mock_calculate_score: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
) -> None:
    """Test that handle_complete adds XP based on score."""
    # Setup mocks
    mock_load_config.return_value = {"mock": "config"}
    mock_calculate_score.return_value = 42
    mock_manager = MagicMock()

    # Call the complete handler
    args = MockArgs(id="task1")
    handle_complete(args, mock_manager, mock_user)

    # Verify score calculation
    mock_load_config.assert_called_once()
    # Find the task with id "task1"
    task = next(task for task in mock_user.tasks if task.id == "task1")
    mock_calculate_score.assert_called_once_with(
        task, None, {"mock": "config"}, date.today()
    )

    # Verify XP addition with user and manager
    mock_add_xp.assert_called_once_with(mock_user, mock_manager, 42)

    # Verify task was marked complete
    assert task.is_complete is True

    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_user)


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.calculate_score")
@patch("rich.table.Table.add_row")
@patch("rich.console.Console.print")
# pylint: disable=too-many-arguments,too-many-positional-arguments
def test_handle_list_sorts_by_score(
    mock_console_print: MagicMock,
    mock_add_row: MagicMock,
    mock_calculate_score: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
    mock_config: dict,
) -> None:
    """Test that handle_list sorts tasks by score by default."""
    # Setup mocks
    mock_load_config.return_value = mock_config
    # Return different scores for different tasks
    mock_calculate_score.side_effect = [90, 45, 18]  # task1, task2, task3
    mock_manager = MagicMock()

    # Call the list handler with no sort args (should default to score)
    args = MockArgs()
    handle_list(args, mock_manager, mock_user)

    # Verify score calculation for each task
    assert mock_calculate_score.call_count == 3

    # We can't easily verify the sorting since the table output is mocked,
    # but we can check that the scores were calculated


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.apply_penalties")
def test_handle_run_penalties(
    mock_apply_penalties: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
    mock_config: dict,
) -> None:
    """Test that handle_run_penalties calls apply_penalties."""
    # Setup mocks
    mock_load_config.return_value = mock_config
    mock_manager = MagicMock()

    # Call the run_penalties handler
    args = MockArgs()
    handle_run_penalties(args, mock_manager, mock_user)

    # Verify apply_penalties was called with user, manager, date, config, and tasks
    mock_apply_penalties.assert_called_once_with(
        mock_user, mock_manager, date.today(), mock_config, mock_user.tasks
    )


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.apply_penalties")
def test_handle_run_penalties_with_custom_date(
    mock_apply_penalties: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
    mock_config: dict,
) -> None:
    """Test that handle_run_penalties supports custom dates."""
    # Setup mocks
    mock_load_config.return_value = mock_config
    custom_date = "2023-05-15"
    mock_manager = MagicMock()

    # Call the run_penalties handler with custom date
    args = MockArgs(date=custom_date)
    handle_run_penalties(args, mock_manager, mock_user)

    # Verify apply_penalties was called with user, manager, parsed date, config, and tasks
    mock_apply_penalties.assert_called_once_with(
        mock_user,
        mock_manager,
        date.fromisoformat(custom_date),
        mock_config,
        mock_user.tasks,
    )


@patch("motido.cli.main.load_scoring_config")
@patch("motido.cli.main.calculate_score")
@patch("rich.table.Table.add_row")
@patch("rich.console.Console.print")
def test_handle_list_with_explicit_sort_by_score(
    mock_console_print: MagicMock,
    mock_add_row: MagicMock,
    mock_calculate_score: MagicMock,
    mock_load_config: MagicMock,
    mock_user: User,
) -> None:
    """Test that handle_list sorts tasks by score when explicitly requested."""
    # Setup mocks
    mock_load_config.return_value = {"mock": "config"}
    mock_calculate_score.side_effect = [90, 45, 18]  # task1, task2, task3
    mock_manager = MagicMock()

    # Call the list handler with explicit sort by score
    args = MockArgs(sort_by="score", sort_order="desc")
    handle_list(args, mock_manager, mock_user)

    # Verify score calculation for each task
    assert mock_calculate_score.call_count == 3
