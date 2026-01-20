# tests/test_scoring.py
"""
Tests for the scoring module functionality.
"""
# pylint: disable=redefined-outer-name,duplicate-code,too-many-lines

import json
import os
import tempfile
from datetime import date, datetime, timedelta
from typing import Any, Dict
from unittest.mock import MagicMock, mock_open, patch

import pytest

from motido.core.models import (
    Difficulty,
    Duration,
    Priority,
    Project,
    Tag,
    Task,
    User,
    XPTransaction,
)
from motido.core.scoring import (
    add_xp,
    apply_penalties,
    build_scoring_config_with_user_multipliers,
    calculate_dependency_chain_bonus,
    calculate_due_date_multiplier,
    calculate_penalty_score,
    calculate_score,
    calculate_start_date_bonus,
    calculate_task_scores,
    get_last_penalty_check_date,
    get_penalty_multiplier,
    load_scoring_config,
    merge_config_with_defaults,
    save_scoring_config,
    withdraw_xp,
)
from motido.data.abstraction import DEFAULT_USERNAME

from .test_fixtures import get_default_scoring_config, get_simple_scoring_config


def _component_value(base_score: float, delta: float, weight: float) -> float:
    """Helper to mirror additive component math."""
    return base_score * weight * max(0.0, delta)


# pylint: disable-next=too-many-locals
def manual_expected_score(
    task: Task,
    config: Dict[str, Any],
    effective_date: date,
    all_tasks: Dict[str, Task] | None = None,
) -> int:
    """Lightweight reproduction of the additive scoring formula for tests."""
    config = merge_config_with_defaults(config)

    base_score = float(config["base_score"])
    weights = config.get("component_weights", {})

    additive_base = base_score
    additive_base += calculate_start_date_bonus(task, config, effective_date)

    if task.is_habit and config.get("habit_streak_bonus", {}).get("enabled", False):
        streak_bonus_per_day = config["habit_streak_bonus"].get(
            "bonus_per_streak_day", 1.0
        )
        max_streak_bonus = config["habit_streak_bonus"].get("max_bonus", 50.0)
        additive_base += min(
            task.streak_current * streak_bonus_per_day, max_streak_bonus
        )

    priority_mult = float(
        config.get("priority_multiplier", {}).get(task.priority.name, 1.0)
    )
    difficulty_mult = float(
        config["difficulty_multiplier"].get(task.difficulty.name, 1.0)
    )
    duration_mult = float(config["duration_multiplier"].get(task.duration.name, 1.0))

    task_age_days = (effective_date - task.creation_date.date()).days
    age_config = config["age_factor"]
    unit_length = 7 if age_config["unit"] == "weeks" else 1
    task_age_units = max(0, task_age_days // unit_length)
    age_mult = 1.0
    if age_config.get("enabled", True):
        raw_age_mult = 1.0 + task_age_units * float(age_config["multiplier_per_unit"])
        age_mult = min(
            float(age_config.get("max_multiplier", 1.0)),
            max(1.0, raw_age_mult),
        )

    due_mult = calculate_due_date_multiplier(task, config, effective_date)

    tag_mult = 1.0
    if task.tags:
        for tag in task.tags:
            if tag in config["tag_multipliers"]:
                tag_mult *= float(config["tag_multipliers"][tag])

    project_mult = 1.0
    if task.project and task.project in config["project_multipliers"]:
        project_mult = float(config["project_multipliers"][task.project])

    total = additive_base
    total += _component_value(
        base_score,
        priority_mult - 1,
        weights.get("priority", 1.0),
    )
    total += _component_value(
        base_score,
        difficulty_mult - 1,
        weights.get("difficulty", 1.0),
    )
    total += _component_value(
        base_score,
        duration_mult - 1,
        weights.get("duration", 1.0),
    )
    total += _component_value(base_score, age_mult - 1, weights.get("age", 1.0))
    total += _component_value(base_score, due_mult - 1, weights.get("due_date", 1.0))
    total += _component_value(base_score, tag_mult - 1, weights.get("tag", 1.0))
    total += _component_value(base_score, project_mult - 1, weights.get("project", 1.0))

    if all_tasks is not None:
        total += calculate_dependency_chain_bonus(
            task, all_tasks, config, effective_date
        )

    return int(round(total))


# --- Test Configuration Loading ---


def test_load_scoring_config_valid() -> None:
    """Test loading a valid scoring configuration."""
    mock_config = get_default_scoring_config()

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        config = load_scoring_config()

        assert config == mock_config
        assert config["base_score"] == 10
        assert config["difficulty_multiplier"]["MEDIUM"] == 1.45
        assert config["duration_multiplier"]["LONG"] == 1.8
        assert config["age_factor"]["unit"] == "days"
        assert config["age_factor"]["multiplier_per_unit"] == 0.025


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
        assert "due_date_proximity" in config


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
        "duration_multiplier": {"MINUSCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {"NOT_SET": 1.0},
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
        "difficulty_multiplier": {"MEDIUM": 0.5},  # Invalid: less than 1.0
        "duration_multiplier": {"MINUSCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
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
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINUSCULE": 1.05},
        "age_factor": {"unit": "months", "multiplier_per_unit": 0.01},  # Invalid unit
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
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

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError, match="'age_factor.unit' must be either 'days' or 'weeks'"
        ):
            load_scoring_config()


def test_load_scoring_config_invalid_max_multiplier() -> None:
    """Max multiplier must be at least 1.0 when provided."""
    mock_config = get_default_scoring_config()
    mock_config["due_date_proximity"]["max_multiplier"] = 0.5

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError,
            match="due_date_proximity\\.max_multiplier.*>= 1.0",
        ):
            load_scoring_config()


def test_load_scoring_config_invalid_component_weights_type() -> None:
    """Component weight map must be a dictionary when provided."""
    mock_config = get_default_scoring_config()
    mock_config["component_weights"] = ["priority", "difficulty"]

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(ValueError, match="component_weights.*must be a dictionary"):
            load_scoring_config()


def test_load_scoring_config_invalid_multiplier_per_unit() -> None:
    """Test loading with invalid multiplier_per_unit value."""
    mock_config = {
        "base_score": 10,
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MINUSCULE": 1.05},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": -0.1,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
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

    with patch("os.path.exists", return_value=True), patch(
        "builtins.open", mock_open(read_data=json.dumps(mock_config))
    ):
        with pytest.raises(
            ValueError,
            match="'due_date_proximity.multiplier_per_unit' must be a non-negative number",
        ):
            load_scoring_config()


# --- Test Save Scoring Configuration ---


def test_save_scoring_config_valid() -> None:
    """Test saving a valid scoring configuration."""
    config = {
        "base_score": 15,
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
        "priority_multiplier": {"MEDIUM": 1.5},
    }

    with patch("builtins.open", mock_open()) as mock_file:
        save_scoring_config(config)
        mock_file.assert_called_once()


def test_save_scoring_config_missing_required_key() -> None:
    """Test saving config with missing required key raises error."""
    config = {
        "base_score": 10,
        # Missing other required keys
    }

    with pytest.raises(ValueError, match="Missing required key"):
        save_scoring_config(config)


def test_save_scoring_config_adds_optional_defaults() -> None:
    """Test saving config adds default values for optional keys."""
    config = {
        "base_score": 10,
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "priority_multiplier": {"MEDIUM": 1.5},
        # No tag_multipliers, project_multipliers, habit_streak_bonus,
        # component_weights, or penalty_invert_weights
    }

    with patch("builtins.open", mock_open()) as mock_file:
        save_scoring_config(config)
        mock_file.assert_called_once()
        # The function should have added defaults
        assert "tag_multipliers" in config
        assert "project_multipliers" in config
        assert "habit_streak_bonus" in config
        assert "component_weights" in config
        assert "penalty_invert_weights" in config


def test_save_scoring_config_io_error() -> None:
    """Test saving config with IO error raises ValueError."""
    config = {
        "base_score": 10,
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.01},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {"enabled": True, "dependent_score_percentage": 0.1},
        "priority_multiplier": {"MEDIUM": 1.5},
    }

    with patch("builtins.open", side_effect=IOError("Permission denied")):
        with pytest.raises(ValueError, match="Error writing scoring config file"):
            save_scoring_config(config)


# --- Test Score Calculation ---


@pytest.fixture
def sample_config() -> Dict[str, Any]:
    """Sample scoring configuration for testing."""
    return get_simple_scoring_config()


def test_calculate_score_base_case(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with default task attributes."""
    # Default task with trivial difficulty and minuscule duration
    task = Task(
        title="Test task",
        creation_date=datetime.now(),
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    effective_date = date.today()
    score = calculate_score(task, None, sample_config, effective_date)
    expected_score = manual_expected_score(task, sample_config, effective_date)
    assert score == expected_score


def test_calculate_score_high_difficulty_long_duration(
    sample_config: Dict[str, Any],
) -> None:
    """Test calculating score with high difficulty and long duration."""
    task = Task(
        title="Complex task",
        creation_date=datetime.now(),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
    )

    effective_date = date.today()
    score = calculate_score(task, None, sample_config, effective_date)
    expected_score = manual_expected_score(task, sample_config, effective_date)
    assert score == expected_score


def test_calculate_score_with_age(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with a task created several days ago."""
    # Task created 10 days ago
    ten_days_ago = datetime.now() - timedelta(days=10)
    task = Task(
        title="Old task",
        creation_date=ten_days_ago,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )

    effective_date = date.today()
    score = calculate_score(task, None, sample_config, effective_date)
    expected_score = manual_expected_score(task, sample_config, effective_date)
    assert score == expected_score


def test_calculate_score_weeks_age_unit(sample_config: Dict[str, Any]) -> None:
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

    effective_date = date.today()
    score = calculate_score(task, None, sample_config_with_weeks, effective_date)
    expected_score = manual_expected_score(
        task, sample_config_with_weeks, effective_date
    )
    assert score == expected_score


def test_calculate_score_missing_enum_keys(sample_config: Dict[str, Any]) -> None:
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

    effective_date = date.today()
    score = calculate_score(task, None, custom_config, effective_date)
    expected_score = manual_expected_score(task, custom_config, effective_date)
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
            "motido.core.scoring.get_scoring_config_path",
            return_value=os.path.join(temp_dir, "scoring_config.json"),
        ):
            # Read the date using the function
            date_read = get_last_penalty_check_date()

            # Verify it matches what we wrote
            assert date_read == test_date


@patch("motido.core.scoring.calculate_score")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_basic(
    mock_add_xp: MagicMock,
    mock_calculate_score: MagicMock,
) -> None:
    """Test apply_penalties with a basic scenario.

    Note: apply_penalties now processes only a single day (effective_date).
    The caller is responsible for iterating over multiple days if needed.
    """
    # Sample config
    sample_config: Dict[str, Any] = {
        "difficulty_multiplier": {"NOT_SET": 1.0},
        "duration_multiplier": {"NOT_SET": 1.0},
    }

    # Mock calculate_score
    mock_calculate_score.return_value = 20

    # Create mock user and manager
    mock_user = MagicMock()
    mock_user.vacation_mode = False
    mock_manager = MagicMock()

    # Create tasks created yesterday
    yesterday = date.today() - timedelta(days=1)
    task1 = Task(
        title="Task 1",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        due_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )
    task2 = Task(
        title="Task 2",
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        due_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=True,  # Completed task should not get penalty
    )

    today = date.today()
    # Apply penalties with today's date (single day)
    apply_penalties(mock_user, mock_manager, today, sample_config, [task1, task2])

    # Verify add_xp was called once for the incomplete task created yesterday
    mock_add_xp.assert_called_once()
    call_args = mock_add_xp.call_args
    merged_config = merge_config_with_defaults(sample_config)
    expected_penalty = -int(round(calculate_penalty_score(task1, merged_config, today)))
    assert call_args[0][:3] == (mock_user, mock_manager, expected_penalty)
    assert call_args[1]["source"] == "penalty"
    assert call_args[1]["task_id"] == task1.id
    assert "Penalty for incomplete" in call_args[1]["description"]
    assert call_args[1]["game_date"] == today


@patch("motido.core.scoring.calculate_score")
@patch("motido.core.scoring.add_xp")
def test_apply_penalties_multiple_days(
    mock_add_xp: MagicMock,
    mock_calculate_score: MagicMock,
) -> None:
    """Test applying penalties for multiple days by calling apply_penalties multiple times.

    Note: apply_penalties now processes only a single day at a time.
    The caller is responsible for iterating over multiple days.
    """
    # Sample config
    sample_config: Dict[str, Any] = {
        "difficulty_multiplier": {"NOT_SET": 1.0},
        "duration_multiplier": {"NOT_SET": 1.0},
    }

    # Mock calculate_score
    mock_calculate_score.return_value = 15

    # Create mock user and manager
    mock_user = MagicMock()
    mock_user.vacation_mode = False
    mock_manager = MagicMock()

    today = date.today()
    three_days_ago = today - timedelta(days=3)

    # Create task created before the penalty period
    task = Task(
        title="Task 1",
        creation_date=datetime.combine(three_days_ago, datetime.min.time()),
        due_date=datetime.combine(three_days_ago, datetime.min.time()),
        is_complete=False,
    )

    # Apply penalties for 3 days by calling the function for each day
    # (This is how the caller should iterate over multiple days)
    for days_back in range(2, -1, -1):  # 2, 1, 0 days ago
        penalty_date = today - timedelta(days=days_back)
        apply_penalties(mock_user, mock_manager, penalty_date, sample_config, [task])

    # Verify add_xp was called 3 times (10 XP each day with inverted multipliers)
    # NOT_SET (1.0): penalty_mult = 5.0 * 5.0 = 25, penalty = 10 * 25 / 25 = 10
    assert mock_add_xp.call_count == 3

    # Check the last call has the expected args for today's date
    call_args = mock_add_xp.call_args
    merged_config = merge_config_with_defaults(sample_config)
    expected_penalty = -int(round(calculate_penalty_score(task, merged_config, today)))
    assert call_args[0][:3] == (mock_user, mock_manager, expected_penalty)
    assert call_args[1]["source"] == "penalty"
    assert call_args[1]["task_id"] == task.id
    assert call_args[1]["game_date"] == today


@patch("motido.core.scoring.add_xp")
def test_apply_penalties_completed_task(
    mock_add_xp: MagicMock,
) -> None:
    """Test that completed tasks don't receive penalties."""
    # Sample config
    sample_config: Dict[str, Any] = {
        "difficulty_multiplier": {"NOT_SET": 1.0},
        "duration_multiplier": {"NOT_SET": 1.0},
    }

    today = date.today()

    # Create mock user and manager
    mock_user = MagicMock()
    mock_user.vacation_mode = False
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


# --- Inverted Penalty Multiplier Tests ---


def test_get_penalty_multiplier_trivial_has_highest() -> None:
    """Test that trivial/minuscule tasks have the highest penalty multiplier."""
    config: Dict[str, Any] = {
        "difficulty_multiplier": {
            "TRIVIAL": 1.1,
            "HERCULEAN": 5.0,
        },
        "duration_multiplier": {
            "MINUSCULE": 1.05,
            "ODYSSEYAN": 3.0,
        },
    }

    # Easiest task: TRIVIAL + MINUSCULE
    trivial_mult = get_penalty_multiplier(
        Difficulty.TRIVIAL, Duration.MINUSCULE, config
    )
    # Hardest task: HERCULEAN + ODYSSEYAN
    herculean_mult = get_penalty_multiplier(
        Difficulty.HERCULEAN, Duration.ODYSSEYAN, config
    )

    # Trivial should have higher penalty intensity
    assert trivial_mult > herculean_mult
    assert pytest.approx(trivial_mult, rel=0.1) == 1.95
    assert herculean_mult == 0.0


def test_get_penalty_multiplier_ratio() -> None:
    """Test that penalty multiplier ratio between easiest and hardest is ~8x."""
    config: Dict[str, Any] = {
        "difficulty_multiplier": {
            "TRIVIAL": 1.1,
            "HERCULEAN": 5.0,
        },
        "duration_multiplier": {
            "MINUSCULE": 1.05,
            "ODYSSEYAN": 3.0,
        },
    }

    trivial_mult = get_penalty_multiplier(
        Difficulty.TRIVIAL, Duration.MINUSCULE, config
    )
    herculean_mult = get_penalty_multiplier(
        Difficulty.HERCULEAN, Duration.ODYSSEYAN, config
    )

    assert trivial_mult > herculean_mult
    assert pytest.approx(trivial_mult, rel=0.1) == 1.95


def test_get_penalty_multiplier_medium_in_between() -> None:
    """Test that medium difficulty/duration has middle penalty value."""
    config: Dict[str, Any] = {
        "difficulty_multiplier": {
            "TRIVIAL": 1.1,
            "MEDIUM": 2.0,
            "HERCULEAN": 5.0,
        },
        "duration_multiplier": {
            "MINUSCULE": 1.05,
            "MEDIUM": 1.5,
            "ODYSSEYAN": 3.0,
        },
    }

    trivial_mult = get_penalty_multiplier(
        Difficulty.TRIVIAL, Duration.MINUSCULE, config
    )
    medium_mult = get_penalty_multiplier(Difficulty.MEDIUM, Duration.MEDIUM, config)
    herculean_mult = get_penalty_multiplier(
        Difficulty.HERCULEAN, Duration.ODYSSEYAN, config
    )

    # Medium should be between trivial (highest) and herculean (lowest)
    assert trivial_mult > medium_mult > herculean_mult


def test_get_penalty_multiplier_zero_when_no_inversion_headroom() -> None:
    """Penalty multiplier is zero when all multipliers are neutral."""
    config = get_default_scoring_config()
    config["difficulty_multiplier"] = {
        name: 1.0 for name in config["difficulty_multiplier"]
    }
    config["duration_multiplier"] = {
        name: 1.0 for name in config["duration_multiplier"]
    }

    penalty_mult = get_penalty_multiplier(Difficulty.MEDIUM, Duration.MEDIUM, config)

    assert penalty_mult == 0.0


@patch("motido.core.scoring.calculate_score")
@patch("motido.core.scoring.add_xp")
# pylint: disable-next=too-many-locals
def test_apply_penalties_inverted_trivial_vs_herculean(
    mock_add_xp: MagicMock,
    mock_calculate_score: MagicMock,
) -> None:
    """Test that trivial tasks get higher penalties than herculean tasks."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "difficulty_multiplier": {
            "TRIVIAL": 1.1,
            "HERCULEAN": 5.0,
        },
        "duration_multiplier": {
            "MINUSCULE": 1.05,
            "ODYSSEYAN": 3.0,
        },
    }

    mock_calculate_score.return_value = 20
    mock_user = MagicMock()
    mock_user.vacation_mode = False
    mock_manager = MagicMock()

    yesterday = date.today() - timedelta(days=1)
    today = date.today()

    # Create trivial task
    trivial_task = Task(
        title="Easy Task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        due_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )

    # Create herculean task
    herculean_task = Task(
        title="Hard Task",
        difficulty=Difficulty.HERCULEAN,
        duration=Duration.ODYSSEYAN,
        creation_date=datetime.combine(yesterday, datetime.min.time()),
        due_date=datetime.combine(yesterday, datetime.min.time()),
        is_complete=False,
    )

    # Apply penalty to trivial task
    apply_penalties(mock_user, mock_manager, today, config, [trivial_task])
    trivial_penalty_call = mock_add_xp.call_args
    trivial_penalty = abs(trivial_penalty_call[0][2])

    mock_add_xp.reset_mock()

    # Apply penalty to herculean task
    apply_penalties(mock_user, mock_manager, today, config, [herculean_task])
    herculean_penalty_call = mock_add_xp.call_args
    herculean_penalty = abs(herculean_penalty_call[0][2])

    # Trivial task should have HIGHER penalty than herculean
    assert trivial_penalty > herculean_penalty
    merged_config = merge_config_with_defaults(config)
    expected_trivial = int(
        round(calculate_penalty_score(trivial_task, merged_config, today))
    )
    expected_herculean = int(
        round(calculate_penalty_score(herculean_task, merged_config, today))
    )
    assert trivial_penalty == expected_trivial
    assert herculean_penalty == expected_herculean


# --- Penalty Score and Net Score Tests ---


def test_calculate_penalty_score_no_penalty_for_future_task() -> None:
    """Test that tasks not yet due have 0 penalty score."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "difficulty_multiplier": {"TRIVIAL": 1.1},
        "duration_multiplier": {"MINUSCULE": 1.05},
    }

    tomorrow = date.today() + timedelta(days=1)
    task = Task(
        title="Future Task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        due_date=datetime.combine(tomorrow, datetime.min.time()),
        creation_date=datetime.now(),
        is_complete=False,
    )

    penalty = calculate_penalty_score(task, config, date.today())
    assert penalty == 0.0


def test_calculate_penalty_score_no_penalty_for_completed_task() -> None:
    """Test that completed tasks have 0 penalty score."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "difficulty_multiplier": {"TRIVIAL": 1.1},
        "duration_multiplier": {"MINUSCULE": 1.05},
    }

    yesterday = date.today() - timedelta(days=1)
    task = Task(
        title="Completed Task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        due_date=datetime.combine(yesterday, datetime.min.time()),
        creation_date=datetime.combine(
            yesterday - timedelta(days=1), datetime.min.time()
        ),
        is_complete=True,
    )

    penalty = calculate_penalty_score(task, config, date.today())
    assert penalty == 0.0


def test_calculate_penalty_score_for_overdue_task() -> None:
    """Test that overdue tasks have positive penalty score."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "difficulty_multiplier": {"TRIVIAL": 1.1},
        "duration_multiplier": {"MINUSCULE": 1.05},
    }

    yesterday = date.today() - timedelta(days=1)
    task = Task(
        title="Overdue Task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        due_date=datetime.combine(yesterday, datetime.min.time()),
        creation_date=datetime.combine(
            yesterday - timedelta(days=1), datetime.min.time()
        ),
        is_complete=False,
    )

    penalty = calculate_penalty_score(task, config, date.today())
    assert penalty > 0
    # Expected: (6-1.1)*(6-1.05) = 4.9 * 4.95 ≈ 24.3 -> 10 * 24.3 / 25 ≈ 9.7
    assert penalty >= 5


def test_calculate_penalty_score_inverts_base_weight() -> None:
    """Test penalty base weight inversion uses reciprocal when enabled."""
    config = get_default_scoring_config()
    config["base_score"] = 10
    config["penalty_invert_weights"] = {
        key: True for key in config["penalty_invert_weights"]
    }
    config["component_weights"]["base"] = 2.0
    config["due_date_proximity"]["enabled"] = False
    config["age_factor"]["multiplier_per_unit"] = 0.0
    config["difficulty_multiplier"] = {
        name: 1.0 for name in config["difficulty_multiplier"]
    }
    config["duration_multiplier"] = {
        name: 1.0 for name in config["duration_multiplier"]
    }
    config["priority_multiplier"] = {
        name: 1.0 for name in config["priority_multiplier"]
    }

    task = Task(
        title="Due today",
        creation_date=datetime(2025, 1, 1),
        due_date=datetime(2025, 1, 1),
    )
    effective_date = date(2025, 1, 1)

    penalty = calculate_penalty_score(task, config, effective_date)
    assert penalty == pytest.approx(5.0)


def test_calculate_penalty_score_base_weight_fallback() -> None:
    """Test penalty base weight falls back when base weight is non-positive."""
    config = get_default_scoring_config()
    config["base_score"] = 10
    config["penalty_invert_weights"] = {
        key: True for key in config["penalty_invert_weights"]
    }
    config["component_weights"]["base"] = 0.0
    config["due_date_proximity"]["enabled"] = False
    config["age_factor"]["multiplier_per_unit"] = 0.0
    config["difficulty_multiplier"] = {
        name: 1.0 for name in config["difficulty_multiplier"]
    }
    config["duration_multiplier"] = {
        name: 1.0 for name in config["duration_multiplier"]
    }
    config["priority_multiplier"] = {
        name: 1.0 for name in config["priority_multiplier"]
    }

    task = Task(
        title="Due today",
        creation_date=datetime(2025, 1, 1),
        due_date=datetime(2025, 1, 1),
    )
    effective_date = date(2025, 1, 1)

    penalty = calculate_penalty_score(task, config, effective_date)
    assert penalty == pytest.approx(10.0)


def test_calculate_penalty_score_uses_base_weight_when_not_inverted() -> None:
    """Test penalty base weight uses component weight when inversion is disabled."""
    config = get_default_scoring_config()
    config["base_score"] = 10
    config["penalty_invert_weights"] = {
        key: False for key in config["penalty_invert_weights"]
    }
    config["component_weights"]["base"] = 2.0
    config["due_date_proximity"]["enabled"] = False
    config["age_factor"]["multiplier_per_unit"] = 0.0
    config["difficulty_multiplier"] = {
        name: 1.0 for name in config["difficulty_multiplier"]
    }
    config["duration_multiplier"] = {
        name: 1.0 for name in config["duration_multiplier"]
    }
    config["priority_multiplier"] = {
        name: 1.0 for name in config["priority_multiplier"]
    }

    task = Task(
        title="Due today",
        creation_date=datetime(2025, 1, 1),
        due_date=datetime(2025, 1, 1),
    )
    effective_date = date(2025, 1, 1)

    penalty = calculate_penalty_score(task, config, effective_date)
    assert penalty == pytest.approx(20.0)


@patch("motido.core.scoring.calculate_score")
def test_calculate_task_scores_net_score_equals_xp_plus_penalty(
    mock_calculate_score: MagicMock,
) -> None:
    """Test that net_score = xp_score + penalty_score."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "difficulty_multiplier": {"TRIVIAL": 1.1},
        "duration_multiplier": {"MINUSCULE": 1.05},
    }

    mock_calculate_score.return_value = 50.0  # Mock XP score

    yesterday = date.today() - timedelta(days=1)
    task = Task(
        title="Due Task",
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        due_date=datetime.combine(yesterday, datetime.min.time()),
        creation_date=datetime.combine(
            yesterday - timedelta(days=1), datetime.min.time()
        ),
        is_complete=False,
    )

    xp_score, penalty_score, net_score = calculate_task_scores(
        task, {task.id: task}, config, date.today()
    )

    assert xp_score == 50.0
    assert penalty_score > 0
    assert net_score == xp_score + penalty_score


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


def test_add_xp_daily_aggregate_earned() -> None:
    """Test that multiple positive XP additions on same day aggregate into one entry."""
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()
    test_date = date(2025, 1, 15)

    # Add positive XP multiple times on the same game_date
    add_xp(user, mock_manager, 50, game_date=test_date)
    add_xp(user, mock_manager, 30, game_date=test_date)
    add_xp(user, mock_manager, 20, game_date=test_date)

    # Verify total XP
    assert user.total_xp == 100

    # Verify only ONE daily_earned entry was created (aggregated)
    assert len(user.xp_transactions) == 1
    transaction = user.xp_transactions[0]
    assert transaction.source == "daily_earned"
    assert transaction.amount == 100
    assert transaction.game_date == test_date
    assert "Earned 100 XP" in transaction.description


def test_add_xp_daily_aggregate_lost() -> None:
    """Test that multiple penalties on same day aggregate into one daily_lost entry."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()
    test_date = date(2025, 1, 15)

    # Add penalties (negative XP) multiple times on the same game_date
    add_xp(user, mock_manager, -20, game_date=test_date)
    add_xp(user, mock_manager, -15, game_date=test_date)
    add_xp(user, mock_manager, -10, game_date=test_date)

    # Verify total XP (100 - 45 = 55)
    assert user.total_xp == 55

    # Verify only ONE daily_lost entry was created (aggregated)
    assert len(user.xp_transactions) == 1
    transaction = user.xp_transactions[0]
    assert transaction.source == "daily_lost"
    assert transaction.amount == -45
    assert transaction.game_date == test_date
    assert "Lost 45 XP" in transaction.description


def test_add_xp_separate_entries_for_different_dates() -> None:
    """Test that XP on different dates creates separate entries."""
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()

    date1 = date(2025, 1, 15)
    date2 = date(2025, 1, 16)

    # Add XP on different dates
    add_xp(user, mock_manager, 50, game_date=date1)
    add_xp(user, mock_manager, 30, game_date=date2)

    # Verify two separate entries
    assert len(user.xp_transactions) == 2

    # Both should be daily_earned but with different dates
    dates = {t.game_date for t in user.xp_transactions}
    assert dates == {date1, date2}


def test_add_xp_separate_earned_and_lost_same_day() -> None:
    """Test that earned and lost XP on same day are tracked separately."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()
    test_date = date(2025, 1, 15)

    # Add positive and negative XP on the same day
    add_xp(user, mock_manager, 50, game_date=test_date)  # earned
    add_xp(user, mock_manager, -20, game_date=test_date)  # lost

    # Verify total XP
    assert user.total_xp == 130

    # Verify TWO entries: one daily_earned, one daily_lost
    assert len(user.xp_transactions) == 2


def test_add_xp_existing_entry_creates_dirty_set_when_missing() -> None:
    """Test that add_xp creates dirty tracking when entry exists but set is missing."""
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()
    test_date = date(2025, 1, 15)

    # Simulate a user loaded from storage: has transactions but no dirty set attribute.
    user.xp_transactions.append(
        XPTransaction(
            amount=10,
            source="daily_earned",
            timestamp=datetime.now(),
            description="Earned 10 XP on 2025-01-15",
            game_date=test_date,
        )
    )

    assert not hasattr(user, "_dirty_xp_transaction_ids")

    add_xp(user, mock_manager, 5, game_date=test_date)

    dirty_ids = getattr(user, "_dirty_xp_transaction_ids")
    assert isinstance(dirty_ids, set)
    assert user.xp_transactions[0].id in dirty_ids


def test_apply_penalties_skips_undated_and_future_due_tasks_and_persists() -> None:
    """Test due_date filters and that persistence occurs once when penalties apply."""
    mock_user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()
    today = date.today()
    yesterday = today - timedelta(days=1)

    config = load_scoring_config()

    base_creation = datetime.combine(yesterday - timedelta(days=1), datetime.min.time())

    task_no_due = Task(
        title="No due date",
        creation_date=base_creation,
        is_complete=False,
        due_date=None,
    )

    task_future_due = Task(
        title="Future due",
        creation_date=base_creation,
        is_complete=False,
        due_date=datetime.combine(today + timedelta(days=1), datetime.min.time()),
    )

    task_due_yesterday = Task(
        title="Overdue",
        creation_date=base_creation,
        is_complete=False,
        due_date=datetime.combine(yesterday, datetime.min.time()),
    )

    apply_penalties(
        mock_user,
        mock_manager,
        today,
        config,
        [task_no_due, task_future_due, task_due_yesterday],
        persist=True,
    )

    # add_xp is called with persist=False inside apply_penalties; persistence is one final save.
    mock_manager.save_user.assert_called_once_with(mock_user)

    assert len(mock_user.xp_transactions) == 1
    assert mock_user.xp_transactions[0].source == "daily_lost"


def test_add_xp_with_game_date_parameter() -> None:
    """Test that game_date parameter is properly stored in transaction."""
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()
    test_date = date(2025, 6, 15)

    add_xp(user, mock_manager, 100, game_date=test_date)

    assert len(user.xp_transactions) == 1
    assert user.xp_transactions[0].game_date == test_date


def test_add_xp_defaults_to_today_when_no_game_date() -> None:
    """Test that game_date defaults to today when not provided."""
    user = User(username=DEFAULT_USERNAME, total_xp=0)
    mock_manager = MagicMock()

    add_xp(user, mock_manager, 100)

    assert len(user.xp_transactions) == 1
    assert user.xp_transactions[0].game_date == date.today()


# --- Test Due Date Proximity Scoring ---


def test_calculate_due_date_multiplier_no_due_date() -> None:
    """Test due date multiplier returns 1.0 when task has no due date."""
    task = Task(title="Test task", creation_date=datetime.now())
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
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
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": False,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
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
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # 1.0 + (7 days * 0.1) = 1.7
    assert multiplier == pytest.approx(1.7)


def test_calculate_due_date_multiplier_approaching() -> None:
    """Test due date multiplier for tasks approaching due date."""
    effective_date = date(2025, 11, 16)
    # Task is 3 days away (within 14-day threshold)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 19),
    )
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # max window=10 days, proximity=7, 1.0 + (7 * 0.1) = 1.7
    assert multiplier == pytest.approx(1.7)


def test_calculate_due_date_multiplier_at_threshold() -> None:
    """Test due date multiplier at threshold boundary."""
    effective_date = date(2025, 11, 16)
    # Task is exactly 10 days away (at max window)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 26),
    )
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # max window=10 days, at boundary -> 1.0
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
    config: Dict[str, Any] = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
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
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    # 1.0 + (1 day * 0.1) = 1.1
    assert multiplier == 1.1


def test_calculate_due_date_multiplier_zero_multiplier_per_unit() -> None:
    """Test due date multiplier returns 1.0 when multiplier is zero."""
    effective_date = date(2025, 11, 16)
    task = Task(
        title="Test task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 15),
    )
    config = {
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.0,
            "max_multiplier": 2.0,
        }
    }

    multiplier = calculate_due_date_multiplier(task, config, effective_date)
    assert multiplier == 1.0


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
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        },
    }

    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


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
        "difficulty_multiplier": {"LOW": 1.5},
        "duration_multiplier": {"SHORT": 1.2},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.1,
            "max_multiplier": 2.0,
        },
    }

    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


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
    config["due_date_proximity"]["enabled"] = False
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


def test_calculate_start_date_bonus_max_multiplier_one() -> None:
    """Test start date bonus returns 0 when max_multiplier is 1.0."""
    task = Task(
        title="Past start",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        start_date=datetime(2025, 1, 5, 0, 0, 0),
    )

    config = get_default_scoring_config()
    config["due_date_proximity"]["max_multiplier"] = 1.0
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
    # 10 days past start * (base_score * 0.02) = 2.0
    assert bonus == 2.0


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
    assert bonus == 2.0


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
        "difficulty_multiplier": {"MEDIUM": 2.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
        "tag_multipliers": {},
        "project_multipliers": {},
    }

    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


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
        "difficulty_multiplier": {"HIGH": 3.0},
        "duration_multiplier": {"MEDIUM": 1.5},
        "age_factor": {"unit": "days", "multiplier_per_unit": 0.0},
        "due_date_proximity": {
            "enabled": True,
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.1,
        },
        "tag_multipliers": {},
        "project_multipliers": {},
    }

    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


def test_calculate_score_with_priority_low() -> None:
    """Test score calculation with LOW priority multiplier."""
    config = get_default_scoring_config()

    task = Task(
        title="Low priority task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    effective_date = datetime(2025, 1, 1).date()
    expected_score = manual_expected_score(task, config, effective_date)
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_score


def test_calculate_score_with_priority_medium() -> None:
    """Test score calculation with MEDIUM priority multiplier."""
    config = get_default_scoring_config()

    task = Task(
        title="Medium priority task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


def test_calculate_score_with_priority_high() -> None:
    """Test score calculation with HIGH priority multiplier."""
    config = get_default_scoring_config()

    task = Task(
        title="High priority task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.HIGH,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


def test_calculate_score_with_priority_defcon_one() -> None:
    """Test score calculation with DEFCON_ONE priority multiplier."""
    config = get_default_scoring_config()

    task = Task(
        title="Defcon One priority task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.DEFCON_ONE,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


def test_calculate_score_with_all_multipliers_active() -> None:
    """Test score with priority, difficulty, duration, age, due_date, tag, project all active."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}
    config["project_multipliers"] = {"CriticalProject": 1.2}

    task = Task(
        title="All multipliers task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.HIGH,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.LONG,
        due_date=datetime(2025, 1, 8),  # 7 days away
        tags=["urgent"],
        project="CriticalProject",
    )

    effective_date = date(2025, 1, 1)
    score = calculate_score(task, None, config, effective_date)
    expected_score = manual_expected_score(task, config, effective_date)
    assert score == expected_score


def test_calculate_score_habit_streak_bonus(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with habit streak bonus."""
    task = Task(
        title="Habit task",
        creation_date=datetime.now(),
        is_habit=True,
        streak_current=10,
    )

    effective_date = date.today()
    score = calculate_score(task, None, sample_config, effective_date)
    expected_score = manual_expected_score(task, sample_config, effective_date)
    assert score == expected_score


def test_calculate_score_habit_streak_max_bonus(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with habit streak bonus capped at max."""
    task = Task(
        title="Habit task",
        creation_date=datetime.now(),
        is_habit=True,
        streak_current=100,  # Should be capped at 50
    )

    effective_date = date.today()
    score = calculate_score(task, None, sample_config, effective_date)
    expected_score = manual_expected_score(task, sample_config, effective_date)
    assert score == expected_score


def test_calculate_score_in_progress_bonus(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with 'In Progress' bonus."""
    today = date.today()
    task = Task(
        title="In Progress task",
        creation_date=datetime.now(),
        start_date=datetime.combine(today, datetime.min.time()),  # Started today
        is_complete=False,
    )

    score = calculate_score(task, None, sample_config, today)
    expected_score = manual_expected_score(task, sample_config, today)
    assert score == expected_score


def test_calculate_score_next_up_bonus(sample_config: Dict[str, Any]) -> None:
    """Test calculating score with 'Next Up' bonus."""
    today = date.today()
    task = Task(
        title="Next Up task",
        creation_date=datetime.now(),
        due_date=datetime.combine(today + timedelta(days=2), datetime.min.time()),
        is_complete=False,
    )

    score = calculate_score(task, None, sample_config, today)
    expected_score = manual_expected_score(task, sample_config, today)
    assert score == expected_score


# --- Test Withdraw XP ---


def test_withdraw_xp_success() -> None:
    """Test successful XP withdrawal."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    result = withdraw_xp(user, mock_manager, 50)

    assert result is True
    assert user.total_xp == 50
    mock_manager.save_user.assert_called_once_with(user)


def test_withdraw_xp_creates_transaction() -> None:
    """Test that withdraw_xp creates an XP transaction."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    result = withdraw_xp(user, mock_manager, 30)

    assert result is True
    assert len(user.xp_transactions) == 1
    assert user.xp_transactions[0].amount == -30
    assert user.xp_transactions[0].source == "withdrawal"


def test_withdraw_xp_without_xp_transactions_attr() -> None:
    """Test withdraw_xp creates xp_transactions attribute if missing."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    # Simulate a legacy user object without xp_transactions attribute
    del user.xp_transactions
    assert not hasattr(user, "xp_transactions")

    mock_manager = MagicMock()
    result = withdraw_xp(user, mock_manager, 25)

    assert result is True
    assert user.total_xp == 75
    # Should have created the xp_transactions list and added a transaction
    assert hasattr(user, "xp_transactions")
    assert len(user.xp_transactions) == 1
    assert user.xp_transactions[0].amount == -25


def test_withdraw_xp_insufficient_funds() -> None:
    """Test XP withdrawal fails with insufficient funds."""
    user = User(username=DEFAULT_USERNAME, total_xp=40)
    mock_manager = MagicMock()

    result = withdraw_xp(user, mock_manager, 50)

    assert result is False
    assert user.total_xp == 40
    mock_manager.save_user.assert_not_called()


def test_withdraw_xp_invalid_amount() -> None:
    """Test XP withdrawal raises error for non-positive amount."""
    user = User(username=DEFAULT_USERNAME, total_xp=100)
    mock_manager = MagicMock()

    with pytest.raises(ValueError, match="Withdrawal amount must be positive"):
        withdraw_xp(user, mock_manager, -10)

    with pytest.raises(ValueError, match="Withdrawal amount must be positive"):
        withdraw_xp(user, mock_manager, 0)


def test_apply_penalties_vacation_mode() -> None:
    """Test that penalties are skipped when vacation mode is enabled."""
    # Setup
    user = User(username=DEFAULT_USERNAME, total_xp=100, vacation_mode=True)
    manager = MagicMock()
    effective_date = date(2025, 11, 20)
    config = get_default_scoring_config()

    # Create an overdue task that would normally incur a penalty
    task = Task(
        title="Overdue Task",
        creation_date=datetime(2025, 11, 1),
        due_date=datetime(2025, 11, 15),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
    )
    all_tasks = [task]

    # Execute
    apply_penalties(user, manager, effective_date, config, all_tasks)

    # Verify - XP should not change (vacation mode skips penalties)
    assert user.total_xp == 100
    manager.save_user.assert_not_called()


# --- Test User Multipliers ---


def test_build_scoring_config_with_user_multipliers_empty_user() -> None:
    """Test building config with user that has no tags or projects."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "tag_multipliers": {"existing_tag": 1.5},
        "project_multipliers": {"existing_project": 1.2},
    }
    user = User(username=DEFAULT_USERNAME)

    merged = build_scoring_config_with_user_multipliers(config, user)

    # Should preserve original config multipliers
    assert merged["tag_multipliers"] == {"existing_tag": 1.5}
    assert merged["project_multipliers"] == {"existing_project": 1.2}


def test_build_scoring_config_with_user_tag_multipliers() -> None:
    """Test building config with user-defined tag multipliers."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "tag_multipliers": {"config_tag": 1.3},
        "project_multipliers": {},
    }
    user = User(
        username=DEFAULT_USERNAME,
        defined_tags=[
            Tag(name="work", multiplier=2.0),
            Tag(name="personal", multiplier=0.5),
        ],
    )

    merged = build_scoring_config_with_user_multipliers(config, user)

    # User tags should be added
    assert merged["tag_multipliers"]["work"] == 2.0
    assert merged["tag_multipliers"]["personal"] == 0.5
    # Config tag should still be there
    assert merged["tag_multipliers"]["config_tag"] == 1.3


def test_build_scoring_config_with_user_project_multipliers() -> None:
    """Test building config with user-defined project multipliers."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "tag_multipliers": {},
        "project_multipliers": {"config_project": 1.1},
    }
    user = User(
        username=DEFAULT_USERNAME,
        defined_projects=[
            Project(name="CriticalProject", multiplier=2.0),
            Project(name="LowPrio", multiplier=0.8),
        ],
    )

    merged = build_scoring_config_with_user_multipliers(config, user)

    # User projects should be added
    assert merged["project_multipliers"]["CriticalProject"] == 2.0
    assert merged["project_multipliers"]["LowPrio"] == 0.8
    # Config project should still be there
    assert merged["project_multipliers"]["config_project"] == 1.1


def test_build_scoring_config_user_overrides_config_multipliers() -> None:
    """Test that user-defined multipliers override config file multipliers."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "tag_multipliers": {"work": 1.5},  # Will be overridden
        "project_multipliers": {"MyProject": 1.2},  # Will be overridden
    }
    user = User(
        username=DEFAULT_USERNAME,
        defined_tags=[Tag(name="work", multiplier=2.0)],  # Override
        defined_projects=[Project(name="MyProject", multiplier=1.8)],  # Override
    )

    merged = build_scoring_config_with_user_multipliers(config, user)

    # User values should override config values
    assert merged["tag_multipliers"]["work"] == 2.0
    assert merged["project_multipliers"]["MyProject"] == 1.8


def test_build_scoring_config_does_not_modify_original() -> None:
    """Test that original config is not modified."""
    config: Dict[str, Any] = {
        "base_score": 10,
        "tag_multipliers": {"original": 1.0},
        "project_multipliers": {},
    }
    user = User(
        username=DEFAULT_USERNAME,
        defined_tags=[Tag(name="new_tag", multiplier=2.0)],
    )

    merged = build_scoring_config_with_user_multipliers(config, user)

    # Original config should not be modified
    assert "new_tag" not in config["tag_multipliers"]
    assert config["tag_multipliers"] == {"original": 1.0}
    # Merged should have both
    assert merged["tag_multipliers"]["new_tag"] == 2.0
    assert merged["tag_multipliers"]["original"] == 1.0


def test_calculate_score_with_user_tag_multiplier() -> None:
    """Test that calculate_score uses user-defined tag multipliers."""
    config = get_default_scoring_config()
    user = User(
        username=DEFAULT_USERNAME,
        defined_tags=[Tag(name="urgent", multiplier=2.0)],
    )

    # Merge user multipliers into config
    merged_config = build_scoring_config_with_user_multipliers(config, user)

    task = Task(
        title="Urgent task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent"],
    )

    effective_date = date(2025, 1, 1)
    score_with_multiplier = calculate_score(task, None, merged_config, effective_date)

    # Without the tag multiplier
    score_without = calculate_score(task, None, config, effective_date)

    assert score_with_multiplier == manual_expected_score(
        task, merged_config, effective_date
    )
    assert score_without == manual_expected_score(task, config, effective_date)
    assert score_with_multiplier > score_without


def test_calculate_score_with_user_project_multiplier() -> None:
    """Test that calculate_score uses user-defined project multipliers."""
    config = get_default_scoring_config()
    user = User(
        username=DEFAULT_USERNAME,
        defined_projects=[Project(name="CriticalProject", multiplier=1.5)],
    )

    # Merge user multipliers into config
    merged_config = build_scoring_config_with_user_multipliers(config, user)

    task = Task(
        title="Critical task",
        creation_date=datetime(2025, 1, 1),
        project="CriticalProject",
    )

    effective_date = date(2025, 1, 1)
    score_with_multiplier = calculate_score(task, None, merged_config, effective_date)

    # Without the project multiplier
    score_without = calculate_score(task, None, config, effective_date)

    assert score_with_multiplier == manual_expected_score(
        task, merged_config, effective_date
    )
    assert score_without == manual_expected_score(task, config, effective_date)
    assert score_with_multiplier > score_without
