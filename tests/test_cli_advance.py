"""Tests for the advance CLI command."""

# pylint: disable=redefined-outer-name, protected-access

from datetime import date, datetime
from typing import Any
from unittest.mock import MagicMock

import pytest

from motido.cli.main import handle_advance
from motido.core.models import Task, User
from motido.data.json_manager import JsonDataManager


@pytest.fixture
def mock_advance_user() -> User:
    """Create a user with specific last_processed_date for testing."""
    user = User(
        username="testuser", total_xp=100, last_processed_date=date(2025, 11, 15)
    )
    user.add_task(
        Task(title="Incomplete Task", creation_date=datetime(2025, 11, 10, 12, 0))
    )
    return user


def _create_advance_args(
    verbose: bool = False, to_date: str | None = None
) -> MagicMock:
    """Helper to create args with required attributes for advance command."""
    args = MagicMock()
    args.verbose = verbose
    args.to = to_date
    return args


def test_handle_advance_success(mocker: Any, mock_advance_user: User) -> None:
    """Test advance command successfully advances date by 1 day."""
    # Mock dependencies
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    # Mock the apply_penalties function called inside process_day
    mock_apply = mocker.patch("motido.core.scoring.apply_penalties")
    mock_apply.side_effect = lambda user, mgr, date, config, tasks: setattr(
        user, "total_xp", user.total_xp - 5
    )

    # Create args namespace
    args = _create_advance_args()

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Verify date advanced
    assert mock_advance_user.last_processed_date == date(2025, 11, 16)
    # Verify user was saved
    mock_manager.save_user.assert_called_once_with(mock_advance_user)


def test_handle_advance_verbose_mode(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance command in verbose mode."""
    # Mock dependencies
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mock_apply = mocker.patch("motido.core.scoring.apply_penalties")
    mock_apply.side_effect = lambda user, mgr, dt, config, tasks: setattr(
        user, "total_xp", user.total_xp - 5
    )

    # Create args namespace
    args = _create_advance_args(verbose=True)

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Check verbose output
    captured = capsys.readouterr()
    assert "Advancing from 2025-11-15" in captured.out


def test_handle_advance_with_xp_penalty(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance command displays XP penalty correctly."""
    # Mock dependencies
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 10}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mock_apply = mocker.patch("motido.core.scoring.apply_penalties")
    mock_apply.side_effect = lambda user, mgr, dt, config, tasks: setattr(
        user, "total_xp", user.total_xp - 10
    )

    # Create args namespace
    args = _create_advance_args()

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Check XP display
    captured = capsys.readouterr()
    assert "XP: 100 → 90 (-10)" in captured.out


def test_handle_advance_no_penalty(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance command when no penalty is applied."""
    # Modify user to have no incomplete tasks
    mock_advance_user.tasks = []

    # Mock dependencies
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    # No penalty - apply_penalties doesn't change XP
    mocker.patch("motido.core.scoring.apply_penalties")

    # Create args namespace
    args = _create_advance_args()

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Check output
    captured = capsys.readouterr()
    assert "no penalty" in captured.out.lower()


def test_handle_advance_no_user(capsys: Any) -> None:
    """Test advance command when user is None."""
    mock_manager = MagicMock(spec=JsonDataManager)
    args = _create_advance_args()

    # Call with no user should exit
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, None)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "not found" in captured.out


def test_handle_advance_scoring_config_error(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance command handles scoring config errors."""
    mock_manager = MagicMock(spec=JsonDataManager)
    mocker.patch(
        "motido.cli.main.load_scoring_config", side_effect=ValueError("Config error")
    )

    args = _create_advance_args()

    # Should exit with error
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, mock_advance_user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Could not load scoring config" in captured.out


def test_handle_advance_generic_exception(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance command handles generic exceptions."""
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {"daily_penalty": {"apply_penalty": True}}
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mocker.patch(
        "motido.core.scoring.apply_penalties",
        side_effect=RuntimeError("Unexpected error"),
    )

    args = _create_advance_args()

    # Should exit with error
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, mock_advance_user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "An unexpected error occurred" in captured.out


# --- Skip-to-date Tests ---


def test_handle_advance_to_date_multiple_days(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to skips multiple days."""
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mock_apply = mocker.patch("motido.core.scoring.apply_penalties")
    mock_apply.side_effect = lambda user, mgr, dt, config, tasks: setattr(
        user, "total_xp", user.total_xp - 5
    )

    # Create args with target date (3 days forward)
    args = _create_advance_args(to_date="2025-11-18")

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Verify date advanced to target
    assert mock_advance_user.last_processed_date == date(2025, 11, 18)
    # Verify XP reduced (5 XP per day * 3 days = -15)
    assert mock_advance_user.total_xp == 100 - 15
    # Verify output shows days processed
    captured = capsys.readouterr()
    assert "(3 days)" in captured.out
    assert "XP: 100 → 85 (-15)" in captured.out


def test_handle_advance_to_date_single_day(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to with target exactly 1 day forward."""
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mocker.patch("motido.core.scoring.apply_penalties")

    # Create args with target date (1 day forward)
    args = _create_advance_args(to_date="2025-11-16")

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Verify date advanced to target
    assert mock_advance_user.last_processed_date == date(2025, 11, 16)
    # Single day output should NOT show "(1 days)"
    captured = capsys.readouterr()
    assert "2025-11-15 → 2025-11-16" in captured.out
    assert "days)" not in captured.out


def test_handle_advance_to_date_past_date_error(
    mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to rejects target date in the past."""
    mock_manager = MagicMock(spec=JsonDataManager)

    # Create args with target date in the past
    args = _create_advance_args(to_date="2025-11-10")

    # Should exit with error
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, mock_advance_user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "must be after" in captured.out


def test_handle_advance_to_date_same_date_error(
    mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to rejects target date equal to current date."""
    mock_manager = MagicMock(spec=JsonDataManager)

    # Create args with target date same as current
    args = _create_advance_args(to_date="2025-11-15")

    # Should exit with error
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, mock_advance_user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "must be after" in captured.out


def test_handle_advance_to_date_invalid_format(
    mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to with invalid date format."""
    mock_manager = MagicMock(spec=JsonDataManager)

    # Create args with invalid date format
    args = _create_advance_args(to_date="not-a-date")

    # Should exit with error
    with pytest.raises(SystemExit) as exc_info:
        handle_advance(args, mock_manager, mock_advance_user)

    assert exc_info.value.code == 1
    captured = capsys.readouterr()
    assert "Invalid date format" in captured.out


def test_handle_advance_to_date_verbose(
    mocker: Any, mock_advance_user: User, capsys: Any
) -> None:
    """Test advance --to with verbose mode shows target date."""
    mock_manager = MagicMock(spec=JsonDataManager)
    mock_scoring_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5}
    }
    mocker.patch(
        "motido.cli.main.load_scoring_config", return_value=mock_scoring_config
    )
    mocker.patch("motido.core.scoring.apply_penalties")

    # Create args with target date and verbose
    args = _create_advance_args(verbose=True, to_date="2025-11-17")

    # Call handler
    handle_advance(args, mock_manager, mock_advance_user)

    # Check verbose output includes target
    captured = capsys.readouterr()
    assert "2025-11-17" in captured.out
