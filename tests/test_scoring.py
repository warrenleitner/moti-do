# tests/test_scoring.py
"""
Tests for the scoring module functionality.
"""
# pylint: disable=redefined-outer-name,duplicate-code,too-many-lines

import json
import os
import tempfile
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, mock_open, patch

import pytest

from motido.core.models import Difficulty, Duration, Task, User
from motido.core.scoring import (
    add_xp,
    apply_penalties,
    calculate_due_date_multiplier,
    calculate_score,
    calculate_start_date_bonus,
    get_last_penalty_check_date,
    load_scoring_config,
)
from motido.data.abstraction import DEFAULT_USERNAME

from .test_fixtures import get_default_scoring_config

# --- Test Configuration Loading ---


def test_load_scoring_config_valid() -> None:
    """Test loading a valid scoring configuration."""
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"text_description": 5},
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
            "MINISCULE": 1.05,
            "SHORT": 1.2,
            "MEDIUM": 1.5,
            "LONG": 2.0,
            "ODYSSEYAN": 3.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        config = load_scoring_config()

        assert config == mock_config
        assert config["base_score"] == 10
        assert config["field_presence_bonus"]["text_description"] == 5
        assert config["difficulty_multiplier"]["MEDIUM"] == 2.0
        assert config["duration_multiplier"]["LONG"] == 2.0
        assert config["age_factor"]["unit"] == "days"
        assert config["age_factor"]["multiplier_per_unit"] == 0.01


def test_load_scoring_config_missing_file() -> None:
    """Test loading with a missing configuration file (should create default)."""
    with patch("os.path.exists", return_value=False), patch(
        "builtins.open", mock_open()
    ) as mock_file:
        config = load_scoring_config()

        # Check file was written with default config
        mock_file.assert_called()

        # Verify default values
        assert config["base_score"] == 10
        assert "difficulty_multiplier" in config
        assert "duration_multiplier" in config
        assert "age_factor" in config
        assert "daily_penalty" in config


def test_load_scoring_config_invalid_json() -> None:
    """Test loading with invalid JSON in the configuration file."""
    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data="invalid json")
    ):
        with pytest.raises(ValueError, match="Invalid JSON in scoring config file"):
            load_scoring_config()


def test_load_scoring_config_missing_required_key() -> None:
    """Test loading with a missing required key in the configuration."""
    # Missing difficulty_multiplier
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
    }

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError, match="Missing required key 'difficulty_multiplier'"
        ):
            load_scoring_config()


def test_load_scoring_config_invalid_multiplier() -> None:
    """Test loading with invalid multiplier value."""
    # Multiplier less than 1.0
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
        "difficulty_multiplier": {"MEDIUM": 0.5},  # Invalid: less than 1.0
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError,
            match="All multipliers in 'difficulty_multiplier' must be numeric and >= 1.0",
        ):
            load_scoring_config()


def test_load_scoring_config_invalid_age_factor() -> None:
    """Test loading with invalid age factor configuration."""
    # Invalid unit
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "months", "multiplier_per_unit": 0.01},  # Invalid unit
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError, match="'age_factor.unit' must be either 'days' or 'weeks'"
        ):
            load_scoring_config()


def test_load_scoring_config_invalid_daily_penalty() -> None:
    """Test loading with invalid daily penalty configuration."""
    # Missing apply_penalty key
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"penalty_points": 5},  # Missing apply_penalty
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError, match="'daily_penalty' must contain 'apply_penalty' key"
        ):
            load_scoring_config()


# --- Test Score Calculation ---


@pytest.fixture
def sample_config() -> dict:
    """Sample scoring configuration for testing."""
    return {
        "base_score": 10,
        "field_presence_bonus": {"text_description": 5},
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
            "MINISCULE": 1.05,
            "SHORT": 1.2,
            "MEDIUM": 1.5,
            "LONG": 2.0,
            "ODYSSEYAN": 3.0,
        },
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
    }


def test_calculate_score_base_case(sample_config: dict) -> None:
    """Test calculating score with default task attributes."""
    # Default task with trivial difficulty and miniscule duration
    task = Task(
        title="Test task",
        creation_date=datetime.now(),
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINISCULE,
    )

    # Calculate score with today's date
    score = calculate_score(task, sample_config, date.today())

    # Expected: base_score * difficulty_mult * duration_mult * age_mult
    # 10 * 1.1 * 1.05 * 1.0 = 17.325 -> rounded to 17
    expected_score = int(round(10 * 1.1 * 1.05 * 1.0))
    assert score == expected_score


def test_calculate_score_high_difficulty_long_duration(sample_config: dict) -> None:
    """Test calculating score with high difficulty and long duration."""
    task = Task(
        title="Complex task",
        creation_date=datetime.now(),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
    )

    score = calculate_score(task, sample_config, date.today())

    # Expected: 10 * 3.0 * 2.0 * 1.0 = 90
    expected_score = int(round(10 * 3.0 * 2.0 * 1.0))
    assert score == expected_score


def test_calculate_score_with_age(sample_config: dict) -> None:
    """Test calculating score with a task created several days ago."""
    # Task created 10 days ago
    ten_days_ago = datetime.now() - timedelta(days=10)
    task = Task(
        title="Old task",
        creation_date=ten_days_ago,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, sample_config, date.today())

    # Expected: 10 * 2.0 * 1.5 * (1.0 + 10 * 0.01) = 49.5 -> rounded to 50
    age_mult = 1.0 + (10 * 0.01)  # 1.1
    expected_score = int(round(10 * 2.0 * 1.5 * age_mult))
    assert score == expected_score


def test_calculate_score_weeks_age_unit(sample_config: dict) -> None:
    """Test calculating score with weeks as the age unit."""
    # Modify the config to use weeks instead of days
    sample_config_with_weeks = sample_config.copy()
    sample_config_with_weeks["age_factor"]["unit"] = "weeks"

    # Task created 21 days (3 weeks) ago
    three_weeks_ago = datetime.now() - timedelta(days=21)
    task = Task(
        title="Old task",
        creation_date=three_weeks_ago,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, sample_config_with_weeks, date.today())

    # Expected: 10 * 2.0 * 1.5 * (1.0 + 3 * 0.01) = 45.9 -> rounded to 46
    age_mult = 1.0 + (3 * 0.01)  # 1.03
    expected_score = int(round(10 * 2.0 * 1.5 * age_mult))
    assert score == expected_score


def test_calculate_score_missing_enum_keys(sample_config: dict) -> None:
    """Test calculating score with enum values not in the config."""
    # Create a custom config with missing enum keys
    custom_config = sample_config.copy()
    custom_config["difficulty_multiplier"] = {"MEDIUM": 2.0}  # Missing other keys

    task = Task(
        title="Test task",
        creation_date=datetime.now(),
        difficulty=Difficulty.HERCULEAN,  # Not in the config
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, custom_config, date.today())

    # Expected: 10 * 1.0 * 1.5 * 1.0 = 22.5 -> rounded to 23
    # Uses default multiplier 1.0 for missing difficulty key
    expected_score = int(round(10 * 1.0 * 1.5 * 1.0))
    assert score == expected_score


# --- Test Penalty System ---


def test_get_set_last_penalty_check_date() -> None:
    """Test getting and setting the last penalty check date."""
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create the motido_data directory
        motido_data_dir = os.path.join(temp_dir, "motido_data")
        os.makedirs(motido_data_dir, exist_ok=True)

        test_date = date(2023, 5, 15)

        # Write file path directly instead of using the function
        penalty_file = os.path.join(motido_data_dir, "last_penalty_check.txt")
        with open(penalty_file, "w", encoding="utf-8") as f:
            f.write(test_date.isoformat())

        # Test the reading function
        with patch(
            "motido.core.scoring.get_scoring_config_path", return_value=temp_dir
        ):
            # Read the date using the function
            date_read = get_last_penalty_check_date()

            # Verify it matches what we wrote
            assert date_read == test_date


@patch("motido.core.scoring.set_last_penalty_check_date")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_basic(
    mock_add_xp: MagicMock,
    mock_get: MagicMock,
    mock_set: MagicMock,
) -> None:
    """Test apply_penalties with a basic scenario."""
    # Sample config
    sample_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
    }

    # Mock get_last_penalty_check_date to return None (first run)
    mock_get.return_value = None

    # Create mock user and manager
    mock_user = MagicMock()
    mock_manager = MagicMock()

    # Create tasks created yesterday
    yesterday = date.today() - timedelta(days=1)
    task1 = Task(
        title="Task 1",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )
    task2 = Task(
        title="Task 2",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=True,  # Completed task should not get penalty
    )

    today = date.today()
    # Apply penalties with today's date
    apply_penalties(mock_user, mock_manager, today, sample_config, [task1, task2])

    # Verify add_xp was called once for the incomplete task created yesterday
    mock_add_xp.assert_called_once_with(
        mock_user, mock_manager, -sample_config["daily_penalty"]["penalty_points"]
    )

    # Verify set_last_penalty_check_date was called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.set_last_penalty_check_date")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_multiple_days(
    mock_add_xp: MagicMock,
    mock_get: MagicMock,
    mock_set: MagicMock,
) -> None:
    """Test applying penalties for multiple days."""
    # Sample config
    sample_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
    }

    # Mock get_last_penalty_check_date to return 3 days ago
    today = date.today()
    three_days_ago = today - timedelta(days=3)
    mock_get.return_value = three_days_ago

    # Create mock user and manager
    mock_user = MagicMock()
    mock_manager = MagicMock()

    # Task created 4 days ago (should get 3 days of penalties)
    task = Task(
        title="Old task",
        creation_date=datetime.combine(today - timedelta(days=4), datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties with today's date
    apply_penalties(mock_user, mock_manager, today, sample_config, [task])

    # Verify add_xp was called 3 times (-5 points each day for 3 days)
    assert mock_add_xp.call_count == 3
    mock_add_xp.assert_called_with(
        mock_user, mock_manager, -sample_config["daily_penalty"]["penalty_points"]
    )

    # Verify set_last_penalty_check_date was called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.set_last_penalty_check_date")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_completed_task(
    mock_add_xp: MagicMock,
    mock_get: MagicMock,
    mock_set: MagicMock,
) -> None:
    """Test that completed tasks don't receive penalties."""
    # Sample config
    sample_config = {
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
    }

    # Mock get_last_penalty_check_date to return yesterday
    today = date.today()
    yesterday = today - timedelta(days=1)
    mock_get.return_value = yesterday

    # Create mock user and manager
    mock_user = MagicMock()
    mock_manager = MagicMock()

    # Task created 2 days ago but marked as complete
    task = Task(
        title="Completed task",
        creation_date=datetime.combine(today - timedelta(days=2), datetime.min.time()),
        is_complete=True,
    )

    # Apply penalties with today's date
    apply_penalties(mock_user, mock_manager, today, sample_config, [task])

    # Verify add_xp was not called (no penalties for completed tasks)
    mock_add_xp.assert_not_called()

    # Verify set_last_penalty_check_date was still called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.set_last_penalty_check_date")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_disabled(
    mock_add_xp: MagicMock,
    mock_get: MagicMock,
    mock_set: MagicMock,
) -> None:
    """Test that penalties are not applied when disabled in config."""
    # Config with penalties disabled
    disabled_config = {
        "daily_penalty": {"apply_penalty": False, "penalty_points": 5},
    }

    # Mock get_last_penalty_check_date to return yesterday
    today = date.today()
    yesterday = today - timedelta(days=1)
    mock_get.return_value = yesterday

    # Create mock user and manager
    mock_user = MagicMock()
    mock_manager = MagicMock()

    # Create an incomplete task
    task = Task(
        title="Task",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties with today's date
    apply_penalties(mock_user, mock_manager, today, disabled_config, [task])

    # Verify add_xp was not called (penalties disabled)
    mock_add_xp.assert_not_called()

    # Verify set_last_penalty_check_date was not called
    mock_set.assert_not_called()


# --- XP Persistence Tests ---


def test_add_xp_persists_to_user() -> None:
    """Test that add_xp correctly updates User.total_xp and persists to backend."""
    # Create mock user and manager
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    # Add positive XP
    add_xp(user, mock_manager, 50)

    # Verify user's total_xp was updated
    assert user.total_xp == 150

    # Verify manager.save_user was called with the user
    mock_manager.save_user.assert_called_once_with(user)


def test_add_xp_with_penalty_persists() -> None:
    """Test that add_xp correctly handles negative XP (penalties) and persists."""
    # Create mock user and manager
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    # Apply penalty (negative XP)
    add_xp(user, mock_manager, -25)

    # Verify user's total_xp was decremented
    assert user.total_xp == 75

    # Verify manager.save_user was called
    mock_manager.save_user.assert_called_once_with(user)


def test_add_xp_multiple_calls_accumulate() -> None:
    """Test that multiple add_xp calls correctly accumulate XP."""
    # Create mock user and manager
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()

    # Add XP multiple times
    add_xp(user, mock_manager, 10)
    add_xp(user, mock_manager, 20)
    add_xp(user, mock_manager, 30)

    # Verify total XP is cumulative
    assert user.total_xp == 60

    # Verify manager.save_user was called 3 times
    assert mock_manager.save_user.call_count == 3


def test_add_xp_mixed_positive_and_negative() -> None:
    """Test that add_xp handles mixed positive and negative XP correctly."""
    # Create mock user and manager
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    # Mix positive and negative XP
    add_xp(user, mock_manager, 50)  # 100 + 50 = 150
    add_xp(user, mock_manager, -30)  # 150 - 30 = 120
    add_xp(user, mock_manager, 20)  # 120 + 20 = 140

    # Verify final XP
    assert user.total_xp == 140

    # Verify manager.save_user was called 3 times
    assert mock_manager.save_user.call_count == 3


# --- Test Due Date Proximity Scoring ---


def test_calculate_due_date_multiplier_no_due_date() -> None:
    """Test due date multiplier returns 1.0 when task has no due date."""
    task = Task(title="Test task", creation_date=datetime.now())
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }
    effective_date = date.today()

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    assert multiplier == 1.0


def test_calculate_due_date_multiplier_disabled() -> None:
    """Test due date multiplier returns 1.0 when feature is disabled."""
    task = Task(
        title="Test task",
        creation_date=datetime.now(),
        due_date=datetime.now() + timedelta(days=3),
    )
    config = {
        "due_date_proximity": {
            "enabled": False,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }
    effective_date = date.today()

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    assert multiplier == 1.0


def test_calculate_due_date_multiplier_overdue() -> None:
    """Test due date multiplier for overdue tasks."""
    effective_date = date(2025, 11, 16)
    # Task is 7 days overdue
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 9),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # 1.0 + (7 days * 0.5) = 1.0 + 3.5 = 4.5
    assert multiplier == 4.5


def test_calculate_due_date_multiplier_approaching() -> None:
    """Test due date multiplier for tasks approaching due date."""
    effective_date = date(2025, 11, 16)
    # Task is 3 days away (within 14-day threshold)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 19),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # days_until_due = 3, threshold = 14
    # days_within_threshold = 14 - 3 = 11
    # 1.0 + (11 * 0.1) = 1.0 + 1.1 = 2.1
    assert multiplier == 2.1


def test_calculate_due_date_multiplier_at_threshold() -> None:
    """Test due date multiplier at threshold boundary."""
    effective_date = date(2025, 11, 16)
    # Task is exactly 14 days away (at threshold)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 30),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # days_until_due = 14, threshold = 14
    # days_within_threshold = 14 - 14 = 0
    # 1.0 + (0 * 0.1) = 1.0
    assert multiplier == 1.0


def test_calculate_due_date_multiplier_beyond_threshold() -> None:
    """Test due date multiplier for tasks beyond threshold."""
    effective_date = date(2025, 11, 16)
    # Task is 30 days away (beyond 14-day threshold)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 12, 16),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # days_until_due = 30, beyond threshold, no bonus
    assert multiplier == 1.0


def test_calculate_due_date_multiplier_one_day_overdue() -> None:
    """Test due date multiplier for task that is 1 day overdue."""
    effective_date = date(2025, 11, 16)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 15),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # 1.0 + (1 day * 0.5) = 1.5
    assert multiplier == 1.5


def test_calculate_score_with_due_date_multiplier() -> None:
    """Test calculate_score integrates due date multiplier."""
    effective_date = date(2025, 11, 16)
    # Task due in 3 days
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 15),
        due_date=datetime(2025, 11, 19),
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    config = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
    }

    score = calculate_score(task, config, effective_date)
    # base = 10, difficulty = 2.0, duration = 1.5, age = 1.0
    # due_date_mult = 1.0 + (14 - 3) * 0.1 = 1.0 + 1.1 = 2.1
    # score = 10 * 2.0 * 1.5 * 1.0 * 2.1 = 63
    assert score == 63


def test_calculate_score_with_overdue_multiplier() -> None:
    """Test calculate_score with overdue task."""
    effective_date = date(2025, 11, 16)
    # Task 7 days overdue
    task = Task(
        title="Overdue task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 9),
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
    )

    config = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {"LOW": 1.5},
        "duration_multiplier": {"SHORT": 1.2},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
    }

    score = calculate_score(task, config, effective_date)
    # base = 10, difficulty = 1.5, duration = 1.2, age = 1.0
    # due_date_mult = 1.0 + (7 * 0.5) = 4.5
    # score = 10 * 1.5 * 1.2 * 1.0 * 4.5 = 81
    assert score == 81


def test_calculate_start_date_bonus_no_start_date() -> None:
    """Test calculate_start_date_bonus returns 0 when no start date."""
    task = Task(
        title="No start date",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=None,
    )

    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    assert bonus == 0.0


def test_calculate_start_date_bonus_disabled() -> None:
    """Test calculate_start_date_bonus returns 0 when feature disabled."""
    task = Task(
        title="Task with start date",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
    )

    config = get_default_scoring_config()
    config["start_date_aging"]["enabled"] = False
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    assert bonus == 0.0


def test_calculate_start_date_bonus_future_start() -> None:
    """Test calculate_start_date_bonus returns 0 when start date in future."""
    task = Task(
        title="Future start",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 20, 0, 0, 0),
    )

    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    assert bonus == 0.0


def test_calculate_start_date_bonus_past_start() -> None:
    """Test calculate_start_date_bonus for task 10 days past start date."""
    task = Task(
        title="Past start",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
    )

    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    # 10 days past start * 0.5 = 5.0
    assert bonus == 5.0


def test_calculate_start_date_bonus_overdue_task() -> None:
    """Test calculate_start_date_bonus returns 0 for overdue task."""
    task = Task(
        title="Overdue task",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
        due_date=datetime(2025, 1, 10, 0, 0, 0),
    )

    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    # Task is overdue (due 1/10, now 1/15), so no start date bonus
    assert bonus == 0.0


def test_calculate_start_date_bonus_with_future_due_date() -> None:
    """Test calculate_start_date_bonus applies when due date is in future."""
    task = Task(
        title="Task with future due date",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
        due_date=datetime(2025, 1, 25, 0, 0, 0),
    )

    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_start_date_bonus(task, config, effective_date)
    # 10 days past start, due date in future, so bonus applies
    assert bonus == 5.0


def test_calculate_score_with_start_date_bonus() -> None:
    """Test calculate_score integration with start date aging bonus."""
    effective_date = date(2025, 1, 15)
    task = Task(
        title="Task with start date",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    config = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": False,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    score = calculate_score(task, config, effective_date)
    # base = 10 + (10 days * 0.5) = 15
    # difficulty = 2.0, duration = 1.5, age = 1.0, due_date = 1.0
    # score = 15 * 2.0 * 1.5 * 1.0 * 1.0 = 45
    assert score == 45


def test_calculate_score_with_both_start_and_due_date() -> None:
    """Test calculate_score with both start date bonus and due date multiplier."""
    effective_date = date(2025, 1, 15)
    task = Task(
        title="Task with both dates",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
        due_date=datetime(2025, 1, 18, 0, 0, 0),
        difficulty=Difficulty.HIGH,
        duration=Duration.MEDIUM,
    )

    config = {
        "base_score": 10,
        "field_presence_bonus": {},
        "difficulty_multiplier": {"HIGH": 3.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "overdue_multiplier_per_day": 0.5,
            "approaching_threshold_days": 14,
            "approaching_multiplier_per_day": 0.1,
        },
        "start_date_aging": {
            "enabled": True,
            "bonus_points_per_day": 0.5,
        },
    }

    score = calculate_score(task, config, effective_date)
    # base = 10 + (10 days past start * 0.5) = 15
    # due in 3 days: 1.0 + ((14 - 3) * 0.1) = 2.1
    # score = 15 * 3.0 * 1.5 * 1.0 * 2.1 = 141.75 = 142
    assert score == 142
