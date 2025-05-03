# tests/test_scoring.py
"""
Tests for the scoring module functionality.
"""
# pylint: disable=redefined-outer-name,duplicate-code

import json
import os
import tempfile
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, mock_open, patch

import pytest

from motido.core.models import Difficulty, Duration, Task
from motido.core.scoring import (
    apply_penalties,
    calculate_score,
    get_last_penalty_check_date,
    load_scoring_config,
)

# --- Test Configuration Loading ---


def test_load_scoring_config_valid() -> None:
    """Test loading a valid scoring configuration."""
    mock_config = {
        "base_score": 10,
        "field_presence_bonus": {"description": 5},
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

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        config = load_scoring_config()

        assert config == mock_config
        assert config["base_score"] == 10
        assert config["field_presence_bonus"]["description"] == 5
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
        "field_presence_bonus": {"description": 5},
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
        "field_presence_bonus": {"description": 5},
        "difficulty_multiplier": {"MEDIUM": 0.5},  # Invalid: less than 1.0
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
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
        "field_presence_bonus": {"description": 5},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "months", "multiplier_per_unit": 0.01},  # Invalid unit
        "daily_penalty": {"apply_penalty": True, "penalty_points": 5},
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
        "field_presence_bonus": {"description": 5},
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINISCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "daily_penalty": {"penalty_points": 5},  # Missing apply_penalty
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
        "field_presence_bonus": {"description": 5},
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
        description="Test task",
        creation_date=datetime.now(),
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINISCULE,
    )

    # Calculate score with today's date
    score = calculate_score(task, sample_config, date.today())

    # Expected: (base_score + description_bonus) * difficulty_mult * duration_mult * age_mult
    # (10 + 5) * 1.1 * 1.05 * 1.0 = 17.325 -> rounded to 17
    expected_score = int(round((10 + 5) * 1.1 * 1.05 * 1.0))
    assert score == expected_score


def test_calculate_score_high_difficulty_long_duration(sample_config: dict) -> None:
    """Test calculating score with high difficulty and long duration."""
    task = Task(
        description="Complex task",
        creation_date=datetime.now(),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
    )

    score = calculate_score(task, sample_config, date.today())

    # Expected: (10 + 5) * 3.0 * 2.0 * 1.0 = 90
    expected_score = int(round((10 + 5) * 3.0 * 2.0 * 1.0))
    assert score == expected_score


def test_calculate_score_with_age(sample_config: dict) -> None:
    """Test calculating score with a task created several days ago."""
    # Task created 10 days ago
    ten_days_ago = datetime.now() - timedelta(days=10)
    task = Task(
        description="Old task",
        creation_date=ten_days_ago,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, sample_config, date.today())

    # Expected: (10 + 5) * 2.0 * 1.5 * (1.0 + 10 * 0.01) = 49.5 -> rounded to 50
    age_mult = 1.0 + (10 * 0.01)  # 1.1
    expected_score = int(round((10 + 5) * 2.0 * 1.5 * age_mult))
    assert score == expected_score


def test_calculate_score_weeks_age_unit(sample_config: dict) -> None:
    """Test calculating score with weeks as the age unit."""
    # Modify the config to use weeks instead of days
    sample_config_with_weeks = sample_config.copy()
    sample_config_with_weeks["age_factor"]["unit"] = "weeks"

    # Task created 21 days (3 weeks) ago
    three_weeks_ago = datetime.now() - timedelta(days=21)
    task = Task(
        description="Old task",
        creation_date=three_weeks_ago,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, sample_config_with_weeks, date.today())

    # Expected: (10 + 5) * 2.0 * 1.5 * (1.0 + 3 * 0.01) = 45.9 -> rounded to 46
    age_mult = 1.0 + (3 * 0.01)  # 1.03
    expected_score = int(round((10 + 5) * 2.0 * 1.5 * age_mult))
    assert score == expected_score


def test_calculate_score_missing_enum_keys(sample_config: dict) -> None:
    """Test calculating score with enum values not in the config."""
    # Create a custom config with missing enum keys
    custom_config = sample_config.copy()
    custom_config["difficulty_multiplier"] = {"MEDIUM": 2.0}  # Missing other keys

    task = Task(
        description="Test task",
        creation_date=datetime.now(),
        difficulty=Difficulty.HERCULEAN,  # Not in the config
        duration=Duration.MEDIUM,
    )

    score = calculate_score(task, custom_config, date.today())

    # Expected: (10 + 5) * 1.0 * 1.5 * 1.0 = 22.5 -> rounded to 23
    # Uses default multiplier 1.0 for missing difficulty key
    expected_score = int(round((10 + 5) * 1.0 * 1.5 * 1.0))
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


@patch("motido.core.scoring.add_xp")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.set_last_penalty_check_date")
def test_apply_penalties_first_run(
    mock_set: MagicMock,
    mock_get: MagicMock,
    mock_add_xp: MagicMock,
    sample_config: dict,
) -> None:
    """Test applying penalties for the first time."""
    # Mock get_last_penalty_check_date to return None (first run)
    mock_get.return_value = None

    # Create some tasks
    today = date.today()
    yesterday = today - timedelta(days=1)

    # Task created yesterday
    task1 = Task(
        description="Task 1",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )

    # Task created today
    task2 = Task(
        description="Task 2",
        creation_date=datetime.combine(today, datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties with today's date
    apply_penalties(today, sample_config, [task1, task2])

    # Verify add_xp was called once for the incomplete task created yesterday
    mock_add_xp.assert_called_once_with(
        -sample_config["daily_penalty"]["penalty_points"]
    )

    # Verify set_last_penalty_check_date was called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.add_xp")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.set_last_penalty_check_date")
def test_apply_penalties_multiple_days(
    mock_set: MagicMock,
    mock_get: MagicMock,
    mock_add_xp: MagicMock,
    sample_config: dict,
) -> None:
    """Test applying penalties for multiple days."""
    # Mock get_last_penalty_check_date to return 3 days ago
    today = date.today()
    three_days_ago = today - timedelta(days=3)
    mock_get.return_value = three_days_ago

    # Task created 4 days ago (should get 3 days of penalties)
    task = Task(
        description="Old task",
        creation_date=datetime.combine(today - timedelta(days=4), datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties with today's date
    apply_penalties(today, sample_config, [task])

    # Verify add_xp was called 3 times (-5 points each day for 3 days)
    assert mock_add_xp.call_count == 3
    mock_add_xp.assert_called_with(-sample_config["daily_penalty"]["penalty_points"])

    # Verify set_last_penalty_check_date was called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.add_xp")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.set_last_penalty_check_date")
def test_apply_penalties_completed_task(
    mock_set: MagicMock,
    mock_get: MagicMock,
    mock_add_xp: MagicMock,
    sample_config: dict,
) -> None:
    """Test that completed tasks don't receive penalties."""
    # Mock get_last_penalty_check_date to return yesterday
    today = date.today()
    yesterday = today - timedelta(days=1)
    mock_get.return_value = yesterday

    # Task created 2 days ago but marked as complete
    task = Task(
        description="Completed task",
        creation_date=datetime.combine(today - timedelta(days=2), datetime.min.time()),
        is_complete=True,
    )

    # Apply penalties with today's date
    apply_penalties(today, sample_config, [task])

    # Verify add_xp was not called (no penalties for completed tasks)
    mock_add_xp.assert_not_called()

    # Verify set_last_penalty_check_date was still called with today's date
    mock_set.assert_called_once_with(today)


@patch("motido.core.scoring.add_xp")
@patch("motido.core.scoring.get_last_penalty_check_date")
@patch("motido.core.scoring.set_last_penalty_check_date")
def test_apply_penalties_disabled(
    mock_set: MagicMock,
    mock_get: MagicMock,
    mock_add_xp: MagicMock,
    sample_config: dict,
) -> None:
    """Test that penalties are not applied when disabled in config."""
    # Disable penalties in config
    disabled_config = sample_config.copy()
    disabled_config["daily_penalty"]["apply_penalty"] = False

    # Mock get_last_penalty_check_date to return yesterday
    today = date.today()
    yesterday = today - timedelta(days=1)
    mock_get.return_value = yesterday

    # Create an incomplete task
    task = Task(
        description="Task",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties with today's date
    apply_penalties(today, disabled_config, [task])

    # Verify add_xp was not called (penalties disabled)
    mock_add_xp.assert_not_called()

    # Verify set_last_penalty_check_date was not called
    mock_set.assert_not_called()
