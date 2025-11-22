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


# pylint: disable=too-many-branches,too-many-statements
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
        "habit_streak_bonus": {
            "enabled": True,
            "bonus_per_streak_day": 1.0,
            "max_bonus": 50.0,
        },
        "status_bumps": {
            "in_progress_bonus": 5.0,
            "next_up_bonus": 10.0,
            "next_up_threshold_days": 3,
        },
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
            "due_date_proximity",
            "start_date_aging",
            "dependency_chain",
            "tag_multipliers",
            "project_multipliers",
            "priority_multiplier",
            # Optional keys for backward compatibility, but we'll check them if present
            # "habit_streak_bonus",
            # "status_bumps",
        ]
        for key in required_keys:
            if key not in config_data:
                raise ValueError(f"Missing required key '{key}' in scoring config.")

        # Ensure new keys are present even if not in required_keys list (for logic below)
        if "habit_streak_bonus" not in config_data:
            config_data["habit_streak_bonus"] = default_config["habit_streak_bonus"]
        if "status_bumps" not in config_data:
            config_data["status_bumps"] = default_config["status_bumps"]

        # Validate multiplier structures
        for mult_key in [
            "difficulty_multiplier",
            "duration_multiplier",
            "priority_multiplier",
        ]:
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

        # Validate due_date_proximity
        if not isinstance(config_data["due_date_proximity"], dict):
            raise ValueError("'due_date_proximity' must be a dictionary.")

        if "enabled" not in config_data["due_date_proximity"]:
            raise ValueError("'due_date_proximity' must contain 'enabled' key.")

        if not isinstance(config_data["due_date_proximity"]["enabled"], bool):
            raise ValueError("'due_date_proximity.enabled' must be a boolean.")

        if "overdue_multiplier_per_day" not in config_data["due_date_proximity"]:
            raise ValueError(
                "'due_date_proximity' must contain 'overdue_multiplier_per_day' key."
            )

        if (
            not isinstance(
                config_data["due_date_proximity"]["overdue_multiplier_per_day"],
                (int, float),
            )
            or config_data["due_date_proximity"]["overdue_multiplier_per_day"] < 0
        ):
            raise ValueError(
                "'due_date_proximity.overdue_multiplier_per_day' must be a non-negative number."
            )

        if "approaching_threshold_days" not in config_data["due_date_proximity"]:
            raise ValueError(
                "'due_date_proximity' must contain 'approaching_threshold_days' key."
            )

        if (
            not isinstance(
                config_data["due_date_proximity"]["approaching_threshold_days"],
                (int, float),
            )
            or config_data["due_date_proximity"]["approaching_threshold_days"] < 0
        ):
            raise ValueError(
                "'due_date_proximity.approaching_threshold_days' must be a non-negative number."
            )

        if "approaching_multiplier_per_day" not in config_data["due_date_proximity"]:
            raise ValueError(
                "'due_date_proximity' must contain 'approaching_multiplier_per_day' key."
            )

        if (
            not isinstance(
                config_data["due_date_proximity"]["approaching_multiplier_per_day"],
                (int, float),
            )
            or config_data["due_date_proximity"]["approaching_multiplier_per_day"] < 0
        ):
            raise ValueError(
                "'due_date_proximity.approaching_multiplier_per_day' must be a non-negative number."
            )

        # Validate start_date_aging
        if not isinstance(config_data["start_date_aging"], dict):
            raise ValueError("'start_date_aging' must be a dictionary.")

        if "enabled" not in config_data["start_date_aging"]:
            raise ValueError("'start_date_aging' must contain 'enabled' key.")

        if not isinstance(config_data["start_date_aging"]["enabled"], bool):
            raise ValueError("'start_date_aging.enabled' must be a boolean.")

        if "bonus_points_per_day" not in config_data["start_date_aging"]:
            raise ValueError(
                "'start_date_aging' must contain 'bonus_points_per_day' key."
            )

        if (
            not isinstance(
                config_data["start_date_aging"]["bonus_points_per_day"],
                (int, float),
            )
            or config_data["start_date_aging"]["bonus_points_per_day"] < 0
        ):
            raise ValueError(
                "'start_date_aging.bonus_points_per_day' must be a non-negative number."
            )

        # Validate dependency_chain configuration
        if not isinstance(config_data.get("dependency_chain"), dict):
            raise ValueError("'dependency_chain' must be a dictionary.")

        if "enabled" not in config_data["dependency_chain"]:
            raise ValueError("'dependency_chain' missing 'enabled' key.")

        if not isinstance(config_data["dependency_chain"]["enabled"], bool):
            raise ValueError("'dependency_chain.enabled' must be a boolean.")

        if "dependent_score_percentage" not in config_data["dependency_chain"]:
            raise ValueError(
                "'dependency_chain' missing 'dependent_score_percentage' key."
            )

        if not isinstance(
            config_data["dependency_chain"]["dependent_score_percentage"],
            (int, float),
        ):
            raise ValueError(
                "'dependency_chain.dependent_score_percentage' must be a number."
            )

        if not (
            0.0 <= config_data["dependency_chain"]["dependent_score_percentage"] <= 1.0
        ):
            raise ValueError(
                "'dependency_chain.dependent_score_percentage' must be between 0.0 and 1.0."
            )

        # Validate tag_multipliers
        if not isinstance(config_data["tag_multipliers"], dict):
            raise ValueError("'tag_multipliers' must be a dictionary.")

        for tag_name, tag_mult in config_data["tag_multipliers"].items():
            if not isinstance(tag_mult, (int, float)) or tag_mult < 1.0:
                raise ValueError(
                    f"Tag multiplier for '{tag_name}' must be a number >= 1.0."
                )

        # Validate project_multipliers
        if not isinstance(config_data["project_multipliers"], dict):
            raise ValueError("'project_multipliers' must be a dictionary.")

        for proj_name, proj_mult in config_data["project_multipliers"].items():
            if not isinstance(proj_mult, (int, float)) or proj_mult < 1.0:
                raise ValueError(
                    f"Project multiplier for '{proj_name}' must be a number >= 1.0."
                )

        return config_data

    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in scoring config file: {e}") from e
    except IOError as e:
        raise ValueError(f"Error reading scoring config file: {e}") from e


def calculate_due_date_multiplier(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """
    Calculate the due date proximity multiplier for a task.

    Returns a multiplier based on how close the task is to its due date:
    - Overdue tasks: 1.0 + (days_overdue * overdue_multiplier_per_day)
    - Approaching tasks: 1.0 + max(0, (threshold - days_until_due) * approaching_multiplier_per_day)
    - Future tasks (beyond threshold): 1.0 (no bonus)
    - No due date: 1.0 (no bonus)

    Args:
        task: The task to calculate the multiplier for
        config: The scoring configuration
        effective_date: The date to calculate from

    Returns:
        The due date multiplier (>= 1.0)
    """
    # Check if due date proximity scoring is enabled
    if not config.get("due_date_proximity", {}).get("enabled", False):
        return 1.0

    # No due date = no multiplier
    if not task.due_date:
        return 1.0

    # Calculate days until due (negative if overdue)
    due_date = task.due_date.date()
    days_until_due = (due_date - effective_date).days

    # Get configuration values
    overdue_mult_per_day = float(
        config["due_date_proximity"]["overdue_multiplier_per_day"]
    )
    threshold_days = int(config["due_date_proximity"]["approaching_threshold_days"])
    approaching_mult_per_day = float(
        config["due_date_proximity"]["approaching_multiplier_per_day"]
    )

    # Overdue tasks: aggressive multiplier
    if days_until_due < 0:
        days_overdue = abs(days_until_due)
        return 1.0 + (days_overdue * overdue_mult_per_day)

    # Approaching due date: gradual increase
    if days_until_due <= threshold_days:
        days_within_threshold = threshold_days - days_until_due
        return 1.0 + (days_within_threshold * approaching_mult_per_day)

    # Future task beyond threshold: no bonus
    return 1.0


def calculate_start_date_bonus(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """
    Calculate the start date aging bonus for a task.

    Adds linear bonus based on days past the start date.
    Only applies if start_date is set, in the past, and task is not overdue.

    Args:
        task: The task to calculate the bonus for
        config: The scoring configuration containing start_date_aging settings
        effective_date: The date to calculate from

    Returns:
        Bonus points to add to base score (0.0 if disabled or not applicable)
    """
    # Check if feature is enabled
    if not config.get("start_date_aging", {}).get("enabled", False):
        return 0.0

    # No start date set
    if not task.start_date:
        return 0.0

    start_date = task.start_date.date()

    # Start date is in the future
    if start_date > effective_date:
        return 0.0

    # If task has a due date and is overdue, don't apply start date bonus
    # (avoid double-counting urgency - due date proximity handles this)
    if task.due_date:
        due_date = task.due_date.date()
        if due_date < effective_date:
            return 0.0

    # Calculate days past start date
    days_past_start = (effective_date - start_date).days

    # Get config value with type cast
    bonus_per_day = float(config["start_date_aging"]["bonus_points_per_day"])

    # Linear bonus: days_past_start * 0.5 (default)
    return days_past_start * bonus_per_day


def calculate_dependency_chain_bonus(
    task: Task,
    all_tasks: Dict[str, Task],
    config: Dict[str, Any],
    effective_date: date,
    visited: Optional[set] = None,
) -> float:
    """
    Calculate bonus points from tasks that depend on this task.

    Recursively calculates scores of all tasks that list this task as a dependency,
    then adds a configurable percentage of those scores as a bonus.

    Args:
        task: The task to calculate dependency bonus for
        all_tasks: Dictionary mapping task IDs to Task objects (for lookup)
        config: The scoring configuration
        effective_date: The date to calculate from
        visited: Set of task IDs already visited (for circular dependency detection)

    Returns:
        Bonus points from dependent tasks (0.0 if disabled or no dependents)

    Raises:
        ValueError: If circular dependency is detected
    """
    # Check if feature is enabled
    if not config.get("dependency_chain", {}).get("enabled", False):
        return 0.0

    # Initialize visited set for circular dependency detection
    if visited is None:
        visited = set()

    # Check for circular dependency
    if task.id in visited:
        raise ValueError(f"Circular dependency detected involving task {task.id[:8]}")

    # Mark this task as visited
    visited.add(task.id)

    # Find all tasks that depend on this task
    dependent_tasks = [
        t for t in all_tasks.values() if task.id in t.dependencies and not t.is_complete
    ]

    # If no dependents, no bonus
    if not dependent_tasks:
        visited.remove(task.id)  # Unmark for other traversal paths
        return 0.0

    # Calculate total score of dependent tasks (recursively)
    total_dependent_score = 0.0
    for dependent_task in dependent_tasks:
        # Recursively calculate score (including their dependencies)
        dependent_score = calculate_score(
            dependent_task, all_tasks, config, effective_date, visited.copy()
        )
        total_dependent_score += dependent_score

    # Unmark this task for other traversal paths
    visited.remove(task.id)

    # Get percentage config value with type cast
    percentage = float(config["dependency_chain"]["dependent_score_percentage"])

    # Return percentage of total dependent scores
    return total_dependent_score * percentage


# pylint: disable=too-many-locals
def calculate_score(
    task: Task,
    all_tasks: Optional[Dict[str, Task]],
    config: Dict[str, Any],
    effective_date: date,
    visited: Optional[set] = None,
) -> int:
    """
    Calculate the score for a task based on its attributes and the scoring configuration.

    Args:
        task: The task to calculate the score for
        all_tasks: Dictionary of all tasks (for dependency chain calculation)
        config: The scoring configuration
        effective_date: The date to calculate the score for
        visited: Set of visited task IDs (for circular dependency detection)

    Returns:
        The calculated score as an integer
    """
    # Calculate additive base
    additive_base = config["base_score"]
    # Bonus for having a text description (rich text content)
    if task.text_description:
        additive_base += config["field_presence_bonus"].get("text_description", 5)

    # Add start date aging bonus (additive, not multiplicative)
    start_date_bonus = calculate_start_date_bonus(task, config, effective_date)
    additive_base += start_date_bonus

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

    # Get priority multiplier
    priority_level = task.priority
    priority_key = (
        priority_level.name
    )  # Enum.name gets the constant name (e.g., "HIGH")
    priority_mult = config.get("priority_multiplier", {}).get(priority_key, 1.0)

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

    # Calculate tag multipliers (all tags stack multiplicatively)
    tag_mult = 1.0
    if task.tags:
        for tag in task.tags:
            if tag in config["tag_multipliers"]:
                tag_mult *= float(config["tag_multipliers"][tag])

    # Calculate project multiplier
    project_mult = 1.0
    if task.project and task.project in config["project_multipliers"]:
        project_mult = float(config["project_multipliers"][task.project])

    # Calculate due date proximity multiplier
    due_date_mult = calculate_due_date_multiplier(task, config, effective_date)

    # Calculate habit streak bonus (additive)
    habit_bonus = 0.0
    if task.is_habit and config.get("habit_streak_bonus", {}).get("enabled", False):
        streak_bonus_per_day = config["habit_streak_bonus"].get(
            "bonus_per_streak_day", 1.0
        )
        max_streak_bonus = config["habit_streak_bonus"].get("max_bonus", 50.0)
        habit_bonus = min(task.streak_current * streak_bonus_per_day, max_streak_bonus)
        additive_base += habit_bonus

    # Calculate status bumps (additive)
    status_bonus = 0.0
    status_config = config.get("status_bumps", {})

    # "In Progress" bonus: Start date <= effective date and not complete
    if (
        task.start_date
        and task.start_date.date() <= effective_date
        and not task.is_complete
    ):
        status_bonus += status_config.get("in_progress_bonus", 0.0)

    # "Next Up" bonus: Due date within threshold
    if task.due_date and not task.is_complete:
        days_until_due = (task.due_date.date() - effective_date).days
        threshold = status_config.get("next_up_threshold_days", 3)
        if 0 <= days_until_due <= threshold:
            status_bonus += status_config.get("next_up_bonus", 0.0)

    additive_base += status_bonus

    # Calculate base score (before dependency bonus)
    # Priority, tags, and projects are multiplicative like difficulty/duration
    base_final_score = (
        additive_base
        * priority_mult
        * difficulty_mult
        * duration_mult
        * age_mult
        * due_date_mult
        * tag_mult
        * project_mult
    )

    # Add dependency chain bonus (additive, not multiplicative)
    dependency_bonus = 0.0
    if all_tasks is not None:
        dependency_bonus = calculate_dependency_chain_bonus(
            task, all_tasks, config, effective_date, visited
        )

    # Calculate final score with dependency bonus
    final_score = base_final_score + dependency_bonus

    # Return rounded integer
    return int(round(final_score))


def get_last_penalty_check_date() -> Optional[date]:
    """
    Get the date of the last penalty check.

    Returns:
        The date of the last penalty check, or None if no check has been performed.
    """
    # Path for storing the last penalty check date
    # Derive from scoring config path to allow mocking in tests
    config_path = get_scoring_config_path()
    data_dir = os.path.dirname(config_path)
    motido_data_dir = os.path.join(data_dir, "motido_data")
    penalty_file = os.path.join(motido_data_dir, "last_penalty_check.txt")

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
    # Derive from scoring config path to allow mocking in tests
    config_path = get_scoring_config_path()
    data_dir = os.path.dirname(config_path)
    motido_data_dir = os.path.join(data_dir, "motido_data")
    penalty_file = os.path.join(motido_data_dir, "last_penalty_check.txt")

    # Ensure directory exists
    os.makedirs(motido_data_dir, exist_ok=True)

    try:
        with open(penalty_file, "w", encoding="utf-8") as f:
            f.write(check_date.isoformat())
    except IOError as e:
        raise IOError(f"Error saving last penalty check date: {e}") from e


def add_xp(user: Any, manager: Any, points: int) -> None:
    """
    Add XP points to the user's total and persist to storage.

    Args:
        user: The User object to update
        manager: The DataManager instance to persist changes
        points: The number of XP points to add (can be negative for penalties).
    """
    # Update user's total XP
    user.total_xp += points

    # Persist the change to backend
    manager.save_user(user)

    # Print confirmation message
    if points > 0:
        print(f"Added {points} XP points! Total XP: {user.total_xp}")
    else:
        print(f"Deducted {abs(points)} XP points as penalty. Total XP: {user.total_xp}")


def withdraw_xp(user: Any, manager: Any, points: int) -> bool:
    """
    Withdraw XP points from the user's total and persist to storage.

    Args:
        user: The User object to update
        manager: The DataManager instance to persist changes
        points: The number of XP points to withdraw (must be positive).

    Returns:
        True if withdrawal was successful (sufficient funds), False otherwise.
    """
    if points <= 0:
        raise ValueError("Withdrawal amount must be positive.")

    if user.total_xp >= points:
        user.total_xp -= points
        manager.save_user(user)
        print(f"Withdrew {points} XP points. Total XP: {user.total_xp}")
        return True

    print(f"Insufficient XP. Required: {points}, Available: {user.total_xp}")
    return False


def apply_penalties(
    user: Any,
    manager: Any,
    effective_date: date,
    config: Dict[str, Any],
    all_tasks: list[Task],
) -> None:
    """
    Apply daily penalties for incomplete tasks.

    Args:
        user: The User object to update
        manager: The DataManager instance to persist changes
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
    # penalty_points = config["daily_penalty"]["penalty_points"] # Deprecated in favor of dynamic calculation

    # Create a dict of tasks for dependency resolution in calculate_score
    task_map = {t.id: t for t in all_tasks}

    # Iterate through dates from start_date + 1 to effective_date
    current_date = start_date + timedelta(days=1)
    while current_date <= effective_date:
        # Check each task
        for task in all_tasks:
            if not task.is_complete and task.creation_date.date() < current_date:
                # Calculate current score
                current_score = calculate_score(task, task_map, config, current_date)

                # Get multipliers to dampen the penalty
                difficulty_key = task.difficulty.name
                difficulty_mult = config["difficulty_multiplier"].get(
                    difficulty_key, 1.0
                )

                duration_key = task.duration.name
                duration_mult = config["duration_multiplier"].get(duration_key, 1.0)

                # Dampen penalty: penalty = score / (diff * dur)
                if current_score > 0:
                    penalty = int(current_score / (difficulty_mult * duration_mult))
                    if penalty > 0:
                        add_xp(user, manager, -penalty)

        # Move to next day
        current_date += timedelta(days=1)

    # Update the last penalty check date
    set_last_penalty_check_date(effective_date)
