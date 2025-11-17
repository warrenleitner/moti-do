"""Additional tests for the scoring module to improve coverage."""

import json
from datetime import date, datetime, timedelta
from unittest.mock import MagicMock, mock_open, patch

import pytest

from motido.core.models import Difficulty, Duration, Task, User
from motido.core.scoring import (
    add_xp,
    apply_penalties,
    calculate_score,
    get_last_penalty_check_date,
    load_scoring_config,
    set_last_penalty_check_date,
)

from .test_fixtures import get_default_scoring_config, get_simple_scoring_config

# --- Test Configuration Validation ---


def test_load_scoring_config_invalid_difficulty_multiplier() -> None:
    """Test load_scoring_config with invalid difficulty_multiplier type."""
    invalid_config = get_default_scoring_config()
    invalid_config["difficulty_multiplier"] = "not a dictionary"  # Invalid type

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'difficulty_multiplier' must be a dictionary" in str(excinfo.value)


def test_load_scoring_config_invalid_multiplier_values() -> None:
    """Test load_scoring_config with invalid multiplier values."""
    invalid_config = get_simple_scoring_config()
    invalid_config["difficulty_multiplier"] = {
        "NOT_SET": 1.0,
        "TRIVIAL": 0.5,  # Invalid: < 1.0
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "All multipliers in 'difficulty_multiplier' must be numeric and >= 1.0"
        in str(excinfo.value)
    )


def test_load_scoring_config_invalid_age_factor_type() -> None:
    """Test load_scoring_config with invalid age_factor type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["age_factor"] = "not a dictionary"  # Invalid type

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'age_factor' must be a dictionary" in str(excinfo.value)


def test_load_scoring_config_missing_age_factor_keys() -> None:
    """Test load_scoring_config with missing age_factor keys."""
    invalid_config = get_simple_scoring_config()
    invalid_config["age_factor"] = {"unit": "days"}  # Missing multiplier_per_unit

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'age_factor' must contain 'unit' and 'multiplier_per_unit' keys" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_age_factor_unit() -> None:
    """Test load_scoring_config with invalid age_factor unit."""
    invalid_config = get_simple_scoring_config()
    invalid_config["age_factor"] = {
        "unit": "months",
        "multiplier_per_unit": 0.01,
    }  # Invalid unit

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'age_factor.unit' must be either 'days' or 'weeks'" in str(excinfo.value)


def test_load_scoring_config_invalid_age_factor_multiplier() -> None:
    """Test load_scoring_config with invalid age_factor multiplier value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["age_factor"] = {
        "unit": "days",
        "multiplier_per_unit": -0.01,
    }  # Negative value

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'age_factor.multiplier_per_unit' must be a non-negative number" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_daily_penalty_type() -> None:
    """Test load_scoring_config with invalid daily_penalty type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["daily_penalty"] = "not a dictionary"  # Invalid type

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'daily_penalty' must be a dictionary" in str(excinfo.value)


def test_load_scoring_config_missing_daily_penalty_apply_key() -> None:
    """Test load_scoring_config with missing daily_penalty apply_penalty key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["daily_penalty"] = {"penalty_points": 5}  # Missing apply_penalty

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'daily_penalty' must contain 'apply_penalty' key" in str(excinfo.value)


def test_load_scoring_config_invalid_daily_penalty_apply_type() -> None:
    """Test load_scoring_config with invalid daily_penalty apply_penalty type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["daily_penalty"] = {
        "apply_penalty": "yes",  # String, not bool
        "penalty_points": 5,
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'daily_penalty.apply_penalty' must be a boolean" in str(excinfo.value)


def test_load_scoring_config_missing_daily_penalty_points_key() -> None:
    """Test load_scoring_config with missing daily_penalty penalty_points key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["daily_penalty"] = {"apply_penalty": True}  # Missing penalty_points

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'daily_penalty' must contain 'penalty_points' key" in str(excinfo.value)


def test_load_scoring_config_invalid_daily_penalty_points_value() -> None:
    """Test load_scoring_config with invalid daily_penalty penalty_points value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["daily_penalty"] = {
        "apply_penalty": True,
        "penalty_points": -5,  # Negative value
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'daily_penalty.penalty_points' must be a non-negative number" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_due_date_proximity_type() -> None:
    """Test load_scoring_config with invalid due_date_proximity type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = "not a dictionary"  # Invalid type

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'due_date_proximity' must be a dictionary" in str(excinfo.value)


def test_load_scoring_config_missing_due_date_proximity_enabled_key() -> None:
    """Test load_scoring_config with missing due_date_proximity enabled key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "overdue_multiplier_per_day": 0.5,
        "approaching_threshold_days": 14,
        "approaching_multiplier_per_day": 0.1,
    }  # Missing enabled

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'due_date_proximity' must contain 'enabled' key" in str(excinfo.value)


def test_load_scoring_config_invalid_due_date_proximity_enabled_type() -> None:
    """Test load_scoring_config with invalid due_date_proximity enabled type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": "yes",  # String, not bool
        "overdue_multiplier_per_day": 0.5,
        "approaching_threshold_days": 14,
        "approaching_multiplier_per_day": 0.1,
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'due_date_proximity.enabled' must be a boolean" in str(excinfo.value)


def test_load_scoring_config_missing_overdue_multiplier_per_day_key() -> None:
    """Test load_scoring_config with missing overdue_multiplier_per_day key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "approaching_threshold_days": 14,
        "approaching_multiplier_per_day": 0.1,
    }  # Missing overdue_multiplier_per_day

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'due_date_proximity' must contain 'overdue_multiplier_per_day' key" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_overdue_multiplier_per_day_value() -> None:
    """Test load_scoring_config with invalid overdue_multiplier_per_day value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "overdue_multiplier_per_day": -0.5,  # Negative value
        "approaching_threshold_days": 14,
        "approaching_multiplier_per_day": 0.1,
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "'due_date_proximity.overdue_multiplier_per_day' must be a non-negative number"
        in str(excinfo.value)
    )


def test_load_scoring_config_missing_approaching_threshold_days_key() -> None:
    """Test load_scoring_config with missing approaching_threshold_days key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "overdue_multiplier_per_day": 0.5,
        "approaching_multiplier_per_day": 0.1,
    }  # Missing approaching_threshold_days

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'due_date_proximity' must contain 'approaching_threshold_days' key" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_approaching_threshold_days_value() -> None:
    """Test load_scoring_config with invalid approaching_threshold_days value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "overdue_multiplier_per_day": 0.5,
        "approaching_threshold_days": -14,  # Negative value
        "approaching_multiplier_per_day": 0.1,
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "'due_date_proximity.approaching_threshold_days' must be a non-negative number"
        in str(excinfo.value)
    )


def test_load_scoring_config_missing_approaching_multiplier_per_day_key() -> None:
    """Test load_scoring_config with missing approaching_multiplier_per_day key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "overdue_multiplier_per_day": 0.5,
        "approaching_threshold_days": 14,
    }  # Missing approaching_multiplier_per_day

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "'due_date_proximity' must contain 'approaching_multiplier_per_day' key"
        in str(excinfo.value)
    )


def test_load_scoring_config_invalid_approaching_multiplier_per_day_value() -> None:
    """Test load_scoring_config with invalid approaching_multiplier_per_day value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["due_date_proximity"] = {
        "enabled": True,
        "overdue_multiplier_per_day": 0.5,
        "approaching_threshold_days": 14,
        "approaching_multiplier_per_day": -0.1,  # Negative value
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "'due_date_proximity.approaching_multiplier_per_day' must be a non-negative number"
        in str(excinfo.value)
    )


def test_load_scoring_config_invalid_start_date_aging_type() -> None:
    """Test load_scoring_config with invalid start_date_aging type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["start_date_aging"] = "not a dictionary"  # Invalid type

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'start_date_aging' must be a dictionary" in str(excinfo.value)


def test_load_scoring_config_missing_start_date_aging_enabled_key() -> None:
    """Test load_scoring_config with missing start_date_aging enabled key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["start_date_aging"] = {
        "bonus_points_per_day": 0.5,
    }  # Missing enabled

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'start_date_aging' must contain 'enabled' key" in str(excinfo.value)


def test_load_scoring_config_invalid_start_date_aging_enabled_type() -> None:
    """Test load_scoring_config with invalid start_date_aging enabled type."""
    invalid_config = get_simple_scoring_config()
    invalid_config["start_date_aging"] = {
        "enabled": "yes",  # String, not bool
        "bonus_points_per_day": 0.5,
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'start_date_aging.enabled' must be a boolean" in str(excinfo.value)


def test_load_scoring_config_missing_bonus_points_per_day_key() -> None:
    """Test load_scoring_config with missing bonus_points_per_day key."""
    invalid_config = get_simple_scoring_config()
    invalid_config["start_date_aging"] = {
        "enabled": True,
    }  # Missing bonus_points_per_day

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "'start_date_aging' must contain 'bonus_points_per_day' key" in str(
        excinfo.value
    )


def test_load_scoring_config_invalid_bonus_points_per_day_value() -> None:
    """Test load_scoring_config with invalid bonus_points_per_day value."""
    invalid_config = get_simple_scoring_config()
    invalid_config["start_date_aging"] = {
        "enabled": True,
        "bonus_points_per_day": -0.5,  # Negative value
    }

    with patch("json.load", return_value=invalid_config):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert (
        "'start_date_aging.bonus_points_per_day' must be a non-negative number"
        in str(excinfo.value)
    )


def test_load_scoring_config_ioerror() -> None:
    """Test load_scoring_config handling of IOError."""
    with patch("builtins.open", side_effect=IOError("File not found")):
        with pytest.raises(ValueError) as excinfo:
            load_scoring_config()

    assert "Error reading scoring config file" in str(excinfo.value)


def test_load_scoring_config_json_decode_error() -> None:
    """Test load_scoring_config handling of JSONDecodeError."""
    with patch("json.load", side_effect=json.JSONDecodeError("Invalid JSON", "", 0)):
        with patch("builtins.open", mock_open()):
            with pytest.raises(ValueError) as excinfo:
                load_scoring_config()

    assert "Invalid JSON in scoring config file" in str(excinfo.value)


# --- Test Score Calculation Edge Cases ---


def test_calculate_score_with_green_style_range() -> None:
    """Test calculate_score with score in the 20-29 range (green style)."""
    config = get_simple_scoring_config()
    # Modify for green style test
    config["base_score"] = 20  # Set base score to 20 to test green style range
    config["field_presence_bonus"] = {"title": 0}
    config["difficulty_multiplier"] = {
        "NOT_SET": 1.0,
        "TRIVIAL": 1.0,  # Set to 1.0 to maintain base score of 20
    }
    config["duration_multiplier"] = {
        "NOT_SET": 1.0,
        "MINISCULE": 1.0,  # Set to 1.0 to maintain base score of 20
    }
    config["age_factor"] = {"unit": "days", "multiplier_per_unit": 0.0}  # No age factor

    task = Task(
        title="Task in green score range",
        creation_date=datetime.now(),
        id="green-score-task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINISCULE,
    )

    score = calculate_score(task, config, date.today())
    assert score == 20  # Should be in the green range (20-29)


def test_add_xp_with_negative_points() -> None:
    """Test add_xp with negative points (penalty)."""
    # Create mock user and manager
    mock_user = User(username="testuser", total_xp=100)
    mock_manager = MagicMock()

    with patch("builtins.print") as mock_print:
        add_xp(mock_user, mock_manager, -10)
        # Verify XP was deducted
        assert mock_user.total_xp == 90
        # Verify user was saved
        mock_manager.save_user.assert_called_once_with(mock_user)
        # Verify print message
        mock_print.assert_called_once_with(
            "Deducted 10 XP points as penalty. Total XP: 90"
        )


# --- Test Last Penalty Check ---


def test_get_last_penalty_check_date_file_not_exists() -> None:
    """Test get_last_penalty_check_date when file doesn't exist."""
    with patch("os.path.exists", return_value=False):
        result = get_last_penalty_check_date()
        assert result is None


def test_get_last_penalty_check_date_ioerror() -> None:
    """Test get_last_penalty_check_date handling IOError."""
    with patch("os.path.exists", return_value=True):
        with patch("builtins.open", side_effect=IOError("Cannot read file")):
            result = get_last_penalty_check_date()
            assert result is None


def test_get_last_penalty_check_date_valueerror() -> None:
    """Test get_last_penalty_check_date handling ValueError (invalid date)."""
    with patch("os.path.exists", return_value=True):
        with patch("builtins.open", mock_open(read_data="invalid-date")):
            result = get_last_penalty_check_date()
            assert result is None


def test_set_last_penalty_check_date_success() -> None:
    """Test set_last_penalty_check_date successful execution."""
    test_date = date(2023, 5, 15)
    mock_file = mock_open()

    with patch("os.makedirs"), patch("builtins.open", mock_file):
        set_last_penalty_check_date(test_date)

        # Verify the file was opened for writing
        mock_file.assert_called_once()
        # Verify the date was written in ISO format
        mock_file().write.assert_called_once_with(test_date.isoformat())


def test_set_last_penalty_check_date_ioerror() -> None:
    """Test set_last_penalty_check_date handling IOError."""
    with patch("os.makedirs"):
        with patch("builtins.open", side_effect=IOError("Cannot write file")):
            with pytest.raises(IOError) as excinfo:
                set_last_penalty_check_date(date.today())
            assert "Error saving last penalty check date" in str(excinfo.value)


# --- Test Apply Penalties Function ---


def test_apply_penalties_disabled() -> None:
    """Test apply_penalties when penalties are disabled."""
    config = get_simple_scoring_config()
    config["daily_penalty"] = {"apply_penalty": False, "penalty_points": 5}  # Disabled

    tasks = [
        Task(title="Task 1", creation_date=datetime.now(), id="task1"),
        Task(title="Task 2", creation_date=datetime.now(), id="task2"),
    ]

    # Create mock user and manager
    mock_user = User(username="testuser")
    mock_manager = MagicMock()

    # No exception should be raised, and function should return early
    apply_penalties(mock_user, mock_manager, date.today(), config, tasks)
    # No assertions needed as we're just testing that no exception occurs


def test_apply_penalties_last_check_is_today() -> None:
    """Test apply_penalties when last check is today (should do nothing)."""
    config = get_simple_scoring_config()

    tasks = [
        Task(title="Task 1", creation_date=datetime.now(), id="task1"),
        Task(title="Task 2", creation_date=datetime.now(), id="task2"),
    ]

    # Create mock user and manager
    mock_user = User(username="testuser")
    mock_manager = MagicMock()

    today = date.today()

    with patch("motido.core.scoring.get_last_penalty_check_date", return_value=today):
        with patch("motido.core.scoring.add_xp") as mock_add_xp:
            # Function should return early without calling add_xp
            apply_penalties(mock_user, mock_manager, today, config, tasks)
            mock_add_xp.assert_not_called()


def test_apply_penalties_last_check_is_future() -> None:
    """Test apply_penalties when last check is in the future (should do nothing)."""
    config = get_simple_scoring_config()

    tasks = [
        Task(title="Task 1", creation_date=datetime.now(), id="task1"),
        Task(title="Task 2", creation_date=datetime.now(), id="task2"),
    ]

    # Create mock user and manager
    mock_user = User(username="testuser")
    mock_manager = MagicMock()

    today = date.today()
    tomorrow = today + timedelta(days=1)

    with patch(
        "motido.core.scoring.get_last_penalty_check_date", return_value=tomorrow
    ):
        with patch("motido.core.scoring.add_xp") as mock_add_xp:
            # Function should return early without calling add_xp
            apply_penalties(mock_user, mock_manager, today, config, tasks)
            mock_add_xp.assert_not_called()
