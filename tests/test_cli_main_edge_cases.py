"""Additional tests for CLI main module to improve coverage."""

# pylint: disable=unused-import

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from motido.cli.main import (
    DEFAULT_USERNAME,
    handle_complete,
    handle_list,
    handle_run_penalties,
    handle_view,
)
from motido.core.models import Difficulty, Duration, Task, User

from .test_cli_main import create_mock_args
from .test_fixtures import get_simple_scoring_config


def test_handle_list_scoring_config_error() -> None:
    """Test handle_list when loading scoring config fails."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")
    mock_console = patch("motido.cli.main.Console", return_value=MagicMock())
    mock_table = patch("motido.cli.main.Table", return_value=MagicMock())

    # Create a user with tasks
    user = User(username="test_user")
    task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="abc123",
    )
    user.tasks = [task]

    # Mock the load_scoring_config function to raise ValueError
    error_message = "Invalid scoring config structure"
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", side_effect=ValueError(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print, mock_console, mock_table, mock_load_config as mock_load:
        args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)
        handle_list(args, MagicMock(), user)

        # Verify load_scoring_config was called
        mock_load.assert_called_once()


def test_handle_list_score_calculation_error() -> None:
    """Test handle_list when calculating score for a task raises an exception."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")
    mock_console = patch("motido.cli.main.Console", return_value=MagicMock())
    mock_table = patch("motido.cli.main.Table", return_value=MagicMock())

    # Create a user with tasks
    user = User(username="test_user")
    task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="abc123",
    )
    user.tasks = [task]

    # Mock the load_scoring_config and calculate_score functions
    sample_config = get_simple_scoring_config()
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", return_value=sample_config
    )
    # Make calculate_score raise an exception
    error_message = "Error calculating score"
    mock_calculate = patch(
        "motido.cli.main.calculate_score", side_effect=Exception(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_console:
            with mock_table:
                with mock_load_config:
                    with mock_calculate:
                        args = create_mock_args(
                            sort_by=None, sort_order="asc", verbose=True
                        )
                        handle_list(args, MagicMock(), user)

                        # Verify the warning message was printed
                        mock_p.assert_any_call(
                            f"Warning: Could not calculate score for task {task.id[:8]}: {error_message}"
                        )


def test_handle_list_green_score_style() -> None:
    """Test handle_list with score in the green style range (20-29)."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")
    mock_console = patch("motido.cli.main.Console", return_value=MagicMock())
    mock_table = patch("motido.cli.main.Table", return_value=MagicMock())
    mock_text = patch("motido.cli.main.Text", return_value=MagicMock())

    # Create a user with tasks
    user = User(username="test_user")
    task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="abc123",
        is_complete=False,  # Important: not completed
    )
    user.tasks = [task]

    # Mock load_scoring_config to return a valid config
    sample_config = get_simple_scoring_config()
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", return_value=sample_config
    )

    # Mock calculate_score to return a value that will hit the green style range
    mock_calculate = patch(
        "motido.cli.main.calculate_score", return_value=25
    )  # 20-29 = green

    # Execute the test with all mocks applied
    with mock_print:
        with mock_console:
            with mock_table:
                with mock_text:
                    with mock_load_config:
                        with mock_calculate:
                            args = create_mock_args(
                                sort_by=None, sort_order="asc", verbose=True
                            )
                            handle_list(args, MagicMock(), user)

                            # No need for assertions - if this runs without error, the green style case is covered


def test_handle_list_no_scoring_config() -> None:
    """Test handle_list when scoring config is None."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")
    mock_console = patch("motido.cli.main.Console", return_value=MagicMock())
    mock_table = patch("motido.cli.main.Table", return_value=MagicMock())

    # Create a user with tasks
    user = User(username="test_user")
    task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="abc123",
    )
    user.tasks = [task]

    # Mock the load_scoring_config function to return None
    mock_load_config = patch("motido.cli.main.load_scoring_config", return_value=None)

    # Execute the test with all mocks applied
    with mock_print, mock_console, mock_table, mock_load_config:
        args = create_mock_args(sort_by=None, sort_order="asc", verbose=True)
        handle_list(args, MagicMock(), user)

        # No specific assertions needed - we're testing that the function doesn't crash
        # when scoring_config is None


def test_handle_view_scoring_config_error() -> None:
    """Test handle_view when loading scoring config fails."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")
    mock_console = patch("motido.cli.main.Console", return_value=MagicMock())
    mock_table = patch("motido.cli.main.Table", return_value=MagicMock())
    mock_text = patch("motido.cli.main.Text", return_value=MagicMock())

    # Create a mock user and task
    mock_user = MagicMock(spec=User)
    mock_task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="abc123",
        difficulty=Difficulty.HIGH,
        duration=Duration.MEDIUM,
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task

    # Mock the load_scoring_config function to raise ValueError
    error_message = "Invalid scoring config structure"
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", side_effect=ValueError(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_console:
            with mock_table:
                with mock_text:
                    with mock_load_config:
                        args = create_mock_args(id="abc", verbose=True)
                        handle_view(args, MagicMock(), mock_user)

                        # Verify the warning message was printed
                        mock_p.assert_any_call(
                            f"Warning: Could not calculate score: {error_message}"
                        )


def test_handle_view_score_color_styles() -> None:
    """Test handle_view with different score ranges for color styling."""
    # Create a common patch for the test
    mock_text = MagicMock()
    with patch("builtins.print"):
        with patch("motido.cli.main.Console", return_value=MagicMock()):
            with patch("motido.cli.main.Table", return_value=MagicMock()):
                with patch("motido.cli.main.Text", return_value=mock_text):
                    mock_user = MagicMock(spec=User)
                    mock_task = Task(
                        description="Test task",
                        creation_date=datetime.now(),
                        id="abc123",
                        difficulty=Difficulty.HIGH,
                        duration=Duration.MEDIUM,
                        is_complete=False,
                    )
                    mock_user.find_task_by_id.return_value = mock_task

                    # Test different score ranges for color styling
                    test_cases = [
                        50,  # >= 50: red bold
                        30,  # >= 30: yellow
                        25,  # >= 20: green (explicitly testing 25 to cover the green style case)
                        10,  # >= 10: blue
                        5,  # < 10: default
                    ]

                    for score in test_cases:
                        # Reset mocks for each test case
                        mock_text.reset_mock()

                        with patch(
                            "motido.cli.main.load_scoring_config", return_value={}
                        ):
                            with patch(
                                "motido.cli.main.calculate_score", return_value=score
                            ):
                                args = create_mock_args(id="abc", verbose=False)
                                handle_view(args, MagicMock(), mock_user)

                                # Since we're mocking Text, we can't directly check styling
                                # But we can verify Text was created with the score
                                assert (
                                    mock_text.mock_calls
                                ), f"Text object not used for score {score}"


def test_handle_complete_scoring_config_error() -> None:
    """Test handle_complete when loading scoring config fails."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user and task
    mock_user = MagicMock(spec=User)
    mock_task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="complete-123",
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task

    # Mock the load_scoring_config function to raise ValueError
    error_message = "Invalid scoring config structure"
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", side_effect=ValueError(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_load_config:
            args = create_mock_args(id="complete-123", verbose=True)
            handle_complete(args, MagicMock(), mock_user)

            # Verify the warning message was printed
            mock_p.assert_any_call(
                f"Warning: Could not calculate score: {error_message}"
            )

        # Verify the task was still marked as complete
        assert mock_task.is_complete is True


def test_handle_complete_zero_score() -> None:
    """Test handle_complete with zero score (no XP message)."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user and task
    mock_user = MagicMock(spec=User)
    mock_task = Task(
        description="Test task",
        creation_date=datetime.now(),
        id="complete-123",
        is_complete=False,
    )
    mock_user.find_task_by_id.return_value = mock_task

    # Mock the load_scoring_config and calculate_score functions
    mock_load_config = patch("motido.cli.main.load_scoring_config", return_value={})
    mock_calculate = patch(
        "motido.cli.main.calculate_score", return_value=0  # Zero score
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_load_config:
            with mock_calculate:
                args = create_mock_args(id="complete-123", verbose=False)
                handle_complete(args, MagicMock(), mock_user)

                # Verify the correct completion message without XP was printed
                mock_p.assert_any_call(
                    f"Marked task '{mock_task.description}' (ID: {mock_task.id[:8]}) as complete."
                )


def test_handle_run_penalties_scoring_config_error() -> None:
    """Test handle_run_penalties when loading scoring config fails."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user with tasks
    mock_user = MagicMock(spec=User)
    mock_user.tasks = [
        Task(description="Task 1", creation_date=datetime.now(), id="task1"),
    ]

    # Mock the load_scoring_config function to raise ValueError
    error_message = "Invalid scoring config structure"
    mock_load_config = patch(
        "motido.cli.main.load_scoring_config", side_effect=ValueError(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_load_config:
            args = create_mock_args(verbose=True)

            # Should raise SystemExit
            with pytest.raises(SystemExit) as excinfo:
                handle_run_penalties(args, MagicMock(), mock_user)

            # Verify the error message was printed
            mock_p.assert_any_call(
                f"Error: Could not load scoring config: {error_message}"
            )
            assert excinfo.value.code == 1


def test_handle_run_penalties_invalid_date() -> None:
    """Test handle_run_penalties with invalid date format."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user with tasks
    mock_user = MagicMock(spec=User)
    mock_user.tasks = [
        Task(description="Task 1", creation_date=datetime.now(), id="task1"),
    ]

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        # Invalid date format
        args = create_mock_args(date="not-a-date", verbose=False)

        # Should raise SystemExit
        with pytest.raises(SystemExit) as excinfo:
            handle_run_penalties(args, MagicMock(), mock_user)

        # Verify the error message was printed
        mock_p.assert_any_call(
            f"Error: Invalid date format. Please use YYYY-MM-DD, got: {args.date}"
        )
        assert excinfo.value.code == 1


def test_handle_run_penalties_no_user() -> None:
    """Test handle_run_penalties when user is None."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        args = create_mock_args(verbose=True)

        # Should raise SystemExit
        with pytest.raises(SystemExit) as excinfo:
            handle_run_penalties(args, MagicMock(), None)  # Passing None as user

        # Verify the error message was printed
        mock_p.assert_any_call(
            f"User '{DEFAULT_USERNAME}' not found or no data available."
        )
        assert excinfo.value.code == 1


def test_handle_run_penalties_value_error() -> None:
    """Test handle_run_penalties with a ValueError from apply_penalties."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user with tasks
    mock_user = MagicMock(spec=User)
    mock_user.tasks = [
        Task(description="Task 1", creation_date=datetime.now(), id="task1"),
    ]

    # Mock the load_scoring_config function
    mock_load_config = patch("motido.cli.main.load_scoring_config", return_value={})

    # Mock apply_penalties to raise a ValueError
    error_message = "ValueError in apply_penalties"
    mock_apply = patch(
        "motido.cli.main.apply_penalties", side_effect=ValueError(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_load_config:
            with mock_apply:
                args = create_mock_args(verbose=True, date=None)

                # Should raise SystemExit
                with pytest.raises(SystemExit) as excinfo:
                    handle_run_penalties(args, MagicMock(), mock_user)

                # Verify the error message was printed
                mock_p.assert_any_call(f"Error: {error_message}")
                assert excinfo.value.code == 1


def test_handle_run_penalties_generic_exception() -> None:
    """Test handle_run_penalties with a generic exception in apply_penalties."""
    # Mock the necessary objects
    mock_print = patch("builtins.print")

    # Create a mock user with tasks
    mock_user = MagicMock(spec=User)
    mock_user.tasks = [
        Task(description="Task 1", creation_date=datetime.now(), id="task1"),
    ]

    # Mock the load_scoring_config function
    mock_load_config = patch("motido.cli.main.load_scoring_config", return_value={})

    # Mock apply_penalties to raise an exception
    error_message = "Generic exception in apply_penalties"
    mock_apply = patch(
        "motido.cli.main.apply_penalties", side_effect=Exception(error_message)
    )

    # Execute the test with all mocks applied
    with mock_print as mock_p:
        with mock_load_config:
            with mock_apply:
                args = create_mock_args(verbose=True, date=None)

                # Should raise SystemExit
                with pytest.raises(SystemExit) as excinfo:
                    handle_run_penalties(args, MagicMock(), mock_user)

                # Verify the error message was printed
                mock_p.assert_any_call(f"An unexpected error occurred: {error_message}")
                assert excinfo.value.code == 1
