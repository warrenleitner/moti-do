# core/scoring.py
"""
Provides functionality for task scoring and XP calculation.
"""

import json
import os
from datetime import date, timedelta
from typing import Any, Dict, Optional

from motido.core.models import Task


def get_scoring_config_path() -> str:
    """Gets the absolute path to the scoring configuration file within the package data dir."""
    package_data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(package_data_dir, "data")
    return os.path.join(data_dir, "scoring_config.json")


# pylint: disable=too-many-branches
def load_scoring_config() -> Dict[str, Any]:
    """
    Loads the scoring configuration from the scoring_config.json file.
    Returns default config if the file doesn't exist.

    Raises:
        ValueError: If the config file is invalid or missing required fields.
    """
    config_path = get_scoring_config_path()
    default_config: Dict[str, Any] = {
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

    if not os.path.exists(config_path):
        # Create default config if file doesn't exist
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=2)
        return default_config

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data: Dict[str, Any] = json.load(f)

        # Validate config
        required_keys = [
            "base_score",
            "field_presence_bonus",
            "difficulty_multiplier",
            "duration_multiplier",
            "age_factor",
            "daily_penalty",
        ]

        for key in required_keys:
            if key not in config_data:
                raise ValueError(f"Missing required key '{key}' in scoring config.")

        # Validate multiplier structures
        for mult_key in ["difficulty_multiplier", "duration_multiplier"]:
            if not isinstance(config_data[mult_key], dict):
                raise ValueError(f"'{mult_key}' must be a dictionary.")

            # Check that all values are numeric and >= 1.0
            for _, multiplier_value in config_data[mult_key].items():
                if (
                    not isinstance(multiplier_value, (int, float))
                    or multiplier_value < 1.0
                ):
                    raise ValueError(
                        f"All multipliers in '{mult_key}' must be numeric and >= 1.0"
                    )

        # Validate age_factor
        if not isinstance(config_data["age_factor"], dict):
            raise ValueError("'age_factor' must be a dictionary.")

        if (
            "unit" not in config_data["age_factor"]
            or "multiplier_per_unit" not in config_data["age_factor"]
        ):
            raise ValueError(
                "'age_factor' must contain 'unit' and 'multiplier_per_unit' keys."
            )

        if config_data["age_factor"]["unit"] not in ["days", "weeks"]:
            raise ValueError("'age_factor.unit' must be either 'days' or 'weeks'.")

        if (
            not isinstance(
                config_data["age_factor"]["multiplier_per_unit"], (int, float)
            )
            or config_data["age_factor"]["multiplier_per_unit"] < 0
        ):
            raise ValueError(
                "'age_factor.multiplier_per_unit' must be a non-negative number."
            )

        # Validate daily_penalty
        if not isinstance(config_data["daily_penalty"], dict):
            raise ValueError("'daily_penalty' must be a dictionary.")

        if "apply_penalty" not in config_data["daily_penalty"]:
            raise ValueError("'daily_penalty' must contain 'apply_penalty' key.")

        if not isinstance(config_data["daily_penalty"]["apply_penalty"], bool):
            raise ValueError("'daily_penalty.apply_penalty' must be a boolean.")

        if "penalty_points" not in config_data["daily_penalty"]:
            raise ValueError("'daily_penalty' must contain 'penalty_points' key.")

        if (
            not isinstance(config_data["daily_penalty"]["penalty_points"], (int, float))
            or config_data["daily_penalty"]["penalty_points"] < 0
        ):
            raise ValueError(
                "'daily_penalty.penalty_points' must be a non-negative number."
            )

        return config_data

    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in scoring config file: {e}") from e
    except IOError as e:
        raise ValueError(f"Error reading scoring config file: {e}") from e


# pylint: disable=too-many-locals
def calculate_score(task: Task, config: Dict[str, Any], effective_date: date) -> int:
    """
    Calculate the score for a task based on its attributes and the scoring configuration.

    Args:
        task: The task to calculate the score for
        config: The scoring configuration
        effective_date: The date to calculate the score for

    Returns:
        The calculated score as an integer
    """
    # Calculate additive base
    additive_base = config["base_score"]
    if task.description:
        additive_base += config["field_presence_bonus"]["description"]

    # Get difficulty multiplier
    difficulty_level = task.difficulty
    difficulty_key = (
        difficulty_level.name
    )  # Enum.name gets the constant name (e.g., "MEDIUM")
    difficulty_mult = config["difficulty_multiplier"].get(difficulty_key, 1.0)

    # Get duration multiplier
    duration_level = task.duration
    duration_key = (
        duration_level.name
    )  # Enum.name gets the constant name (e.g., "MEDIUM")
    duration_mult = config["duration_multiplier"].get(duration_key, 1.0)

    # Calculate age multiplier
    task_creation_date = task.creation_date.date()
    task_age = effective_date - task_creation_date

    # Determine age in appropriate units
    if config["age_factor"]["unit"] == "weeks":
        # Convert days to weeks (integer division)
        age_in_units = max(0, task_age.days // 7)
    else:  # Default to days
        age_in_units = max(0, task_age.days)

    # Calculate age multiplier
    mult_per_unit = config["age_factor"]["multiplier_per_unit"]
    age_mult = 1.0 + (age_in_units * mult_per_unit)
    age_mult = max(1.0, age_mult)  # Ensure age_mult is at least 1.0

    # Calculate final score
    final_score = additive_base * difficulty_mult * duration_mult * age_mult

    # Return rounded integer
    return int(round(final_score))


def get_last_penalty_check_date() -> Optional[date]:
    """
    Get the date of the last penalty check.

    Returns:
        The date of the last penalty check, or None if no check has been performed.
    """
    # Path for storing the last penalty check date
    package_data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(package_data_dir, "data", "motido_data")
    penalty_file = os.path.join(data_dir, "last_penalty_check.txt")

    if not os.path.exists(penalty_file):
        return None

    try:
        with open(penalty_file, "r", encoding="utf-8") as f:
            date_str = f.read().strip()
            return date.fromisoformat(date_str)
    except (IOError, ValueError):
        return None


def set_last_penalty_check_date(check_date: date) -> None:
    """
    Set the date of the last penalty check.

    Args:
        check_date: The date to set as the last penalty check date.
    """
    # Path for storing the last penalty check date
    package_data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(package_data_dir, "data", "motido_data")

    # Ensure directory exists
    os.makedirs(data_dir, exist_ok=True)

    penalty_file = os.path.join(data_dir, "last_penalty_check.txt")

    try:
        with open(penalty_file, "w", encoding="utf-8") as f:
            f.write(check_date.isoformat())
    except IOError as e:
        raise IOError(f"Error saving last penalty check date: {e}") from e


def add_xp(points: int) -> None:
    """
    Add XP points to the user's total.

    This is a placeholder function that will be implemented in a future release.
    For now, it just prints a message.

    Args:
        points: The number of XP points to add (can be negative for penalties).
    """
    if points > 0:
        print(f"Added {points} XP points!")
    else:
        print(f"Deducted {abs(points)} XP points as penalty.")

    # FUTURE: Implement actual XP tracking in a future release with a database table


def apply_penalties(
    effective_date: date, config: Dict[str, Any], all_tasks: list[Task]
) -> None:
    """
    Apply daily penalties for incomplete tasks.

    Args:
        effective_date: The date to calculate penalties for
        config: The scoring configuration
        all_tasks: List of all tasks to check for penalties
    """
    # Check if penalties are enabled
    if not config["daily_penalty"]["apply_penalty"]:
        return

    # Get the last penalty check date
    last_check = get_last_penalty_check_date()

    # If no previous check, use yesterday as the start date
    if last_check is None:
        start_date = effective_date - timedelta(days=1)
    else:
        # If last check is already today or in the future, nothing to do
        if last_check >= effective_date:
            return
        start_date = last_check

    # Get penalty points from config
    penalty_points = config["daily_penalty"]["penalty_points"]

    # Iterate through dates from start_date + 1 to effective_date
    current_date = start_date + timedelta(days=1)
    while current_date <= effective_date:
        # Check each task
        for task in all_tasks:
            if not task.is_complete and task.creation_date.date() < current_date:
                # Apply penalty for incomplete task
                add_xp(-penalty_points)
                # You could log the penalty here if desired

        # Move to next day
        current_date += timedelta(days=1)

    # Update the last penalty check date
    set_last_penalty_check_date(effective_date)
