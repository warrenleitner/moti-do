# core/scoring.py
# pylint: disable=too-many-lines
"""
Provides functionality for task scoring and XP calculation.

The default configuration is calibrated to yield a modest weekly XP total
for representative workloads (see tests for the calibration fixture) so
that XP feels meaningful without runaway inflation.
"""

import json
import os
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Callable, Dict, Optional

from motido.core.models import Difficulty, Duration, Task, User


def get_scoring_config_path() -> str:
    """Gets the absolute path to the scoring configuration file within the package data dir."""
    package_data_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    data_dir = os.path.join(package_data_dir, "data")
    return os.path.join(data_dir, "scoring_config.json")


def get_default_scoring_config() -> Dict[str, Any]:
    """
    Returns the default scoring configuration.

    This provides the canonical default values used when no config file exists
    or when the user resets to defaults.

    Returns:
        Dictionary containing all default scoring configuration values.
    """
    return {
        "base_score": 10,
        "component_weights": {
            "priority": 1.15,
            "difficulty": 1.05,
            "duration": 0.95,
            "age": 0.6,
            "due_date": 1.2,
            "tag": 0.5,
            "project": 0.6,
        },
        "difficulty_multiplier": {
            "NOT_SET": 1.0,
            "TRIVIAL": 1.05,
            "LOW": 1.2,
            "MEDIUM": 1.45,
            "HIGH": 1.8,
            "HERCULEAN": 2.1,
        },
        "duration_multiplier": {
            "NOT_SET": 1.0,
            "MINUSCULE": 1.05,
            "SHORT": 1.2,
            "MEDIUM": 1.45,
            "LONG": 1.8,
            "ODYSSEYAN": 2.1,
        },
        "age_factor": {
            "enabled": True,
            "unit": "days",
            "multiplier_per_unit": 0.025,
            "max_multiplier": 1.5,
        },
        "due_date_proximity": {
            "enabled": True,
            "unit": "days",
            "multiplier_per_unit": 0.02,
            "max_multiplier": 1.5,
        },
        "dependency_chain": {
            "enabled": True,
            "dependent_score_percentage": 0.12,
        },
        "tag_multipliers": {},
        "project_multipliers": {},
        "priority_multiplier": {
            "NOT_SET": 1.0,
            "TRIVIAL": 1.05,
            "LOW": 1.2,
            "MEDIUM": 1.45,
            "HIGH": 1.8,
            "DEFCON_ONE": 2.1,
        },
        "penalty_invert_weights": {
            "base": True,
            "priority": True,
            "difficulty": True,
            "duration": True,
            "age": True,
            "due_date": True,
            "tag": True,
            "project": True,
        },
        "habit_streak_bonus": {
            "enabled": True,
            "bonus_per_streak_day": 1.2,
            "max_bonus": 25.0,
        },
    }


# pylint: disable=too-many-branches,too-many-statements,too-many-locals
def load_scoring_config() -> Dict[str, Any]:
    """
    Loads the scoring configuration from the scoring_config.json file.
    Returns default config if the file doesn't exist.

    Raises:
        ValueError: If the config file is invalid or missing required fields.
    """
    config_path = get_scoring_config_path()
    default_config = get_default_scoring_config()

    if not os.path.exists(config_path):
        # Create default config if file doesn't exist
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(default_config, f, indent=2)
        return default_config

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config_data: Dict[str, Any] = json.load(f)

        # Normalize legacy due_date_proximity fields before validation
        proximity = config_data.get("due_date_proximity")
        if not isinstance(proximity, dict):
            raise ValueError("'due_date_proximity' must be a dictionary.")

        if "multiplier_per_unit" not in proximity:
            if "daily_multiplier_per_day" in proximity:
                proximity["multiplier_per_unit"] = proximity["daily_multiplier_per_day"]
            elif "approaching_multiplier_per_day" in proximity:
                proximity["multiplier_per_unit"] = proximity[
                    "approaching_multiplier_per_day"
                ]
        if "unit" not in proximity:
            proximity["unit"] = default_config["due_date_proximity"]["unit"]

        # Normalize age_factor to use the same shape as due_date_proximity
        age_factor = config_data.get("age_factor")
        if not isinstance(age_factor, dict):
            raise ValueError("'age_factor' must be a dictionary.")

        if "enabled" not in age_factor:
            age_factor["enabled"] = default_config["age_factor"]["enabled"]
        if "unit" not in age_factor:
            age_factor["unit"] = default_config["age_factor"]["unit"]
        if "max_multiplier" not in age_factor:
            age_factor["max_multiplier"] = default_config["age_factor"][
                "max_multiplier"
            ]

        # Normalize penalty_invert_weights to a per-component map
        default_penalty_map = default_config["penalty_invert_weights"]
        penalty_config = config_data.get("penalty_invert_weights", default_penalty_map)
        if isinstance(penalty_config, bool):
            penalty_config = {key: penalty_config for key in default_penalty_map}
        elif isinstance(penalty_config, dict):
            penalty_config = {
                key: bool(penalty_config.get(key, default_value))
                for key, default_value in default_penalty_map.items()
            }
        else:
            raise ValueError(
                "'penalty_invert_weights' must be a boolean or dictionary of booleans."
            )
        config_data["penalty_invert_weights"] = penalty_config

        # Validate config
        required_keys = [
            "base_score",
            "difficulty_multiplier",
            "duration_multiplier",
            "age_factor",
            "due_date_proximity",
            "dependency_chain",
            "tag_multipliers",
            "project_multipliers",
            "priority_multiplier",
        ]
        for key in required_keys:
            if key not in config_data:
                raise ValueError(f"Missing required key '{key}' in scoring config.")

        # Ensure new keys are present even if not in required_keys list (for logic below)
        if "habit_streak_bonus" not in config_data:
            config_data["habit_streak_bonus"] = default_config["habit_streak_bonus"]
        if "component_weights" not in config_data:
            config_data["component_weights"] = default_config["component_weights"]

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
        if (
            "enabled" not in config_data["age_factor"]
            or "unit" not in config_data["age_factor"]
            or "multiplier_per_unit" not in config_data["age_factor"]
            or "max_multiplier" not in config_data["age_factor"]
        ):
            raise ValueError(
                "'age_factor' must contain 'enabled', 'unit', 'multiplier_per_unit', and 'max_multiplier' keys."
            )

        if not isinstance(config_data["age_factor"]["enabled"], bool):
            raise ValueError("'age_factor.enabled' must be a boolean.")

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

        if (
            not isinstance(config_data["age_factor"]["max_multiplier"], (int, float))
            or config_data["age_factor"]["max_multiplier"] < 1.0
        ):
            raise ValueError("'age_factor.max_multiplier' must be a number >= 1.0.")

        # Validate due_date_proximity
        if (
            "enabled" not in config_data["due_date_proximity"]
            or "unit" not in config_data["due_date_proximity"]
            or "multiplier_per_unit" not in config_data["due_date_proximity"]
            or "max_multiplier" not in config_data["due_date_proximity"]
        ):
            raise ValueError(
                "'due_date_proximity' must contain 'enabled', 'unit', 'multiplier_per_unit', and 'max_multiplier' keys."
            )

        if not isinstance(config_data["due_date_proximity"]["enabled"], bool):
            raise ValueError("'due_date_proximity.enabled' must be a boolean.")

        if config_data["due_date_proximity"]["unit"] not in ["days", "weeks"]:
            raise ValueError(
                "'due_date_proximity.unit' must be either 'days' or 'weeks'."
            )

        if (
            not isinstance(
                config_data["due_date_proximity"]["multiplier_per_unit"],
                (int, float),
            )
            or config_data["due_date_proximity"]["multiplier_per_unit"] < 0
        ):
            raise ValueError(
                "'due_date_proximity.multiplier_per_unit' must be a non-negative number."
            )

        if (
            not isinstance(
                config_data["due_date_proximity"]["max_multiplier"], (int, float)
            )
            or config_data["due_date_proximity"]["max_multiplier"] < 1.0
        ):
            raise ValueError(
                "'due_date_proximity.max_multiplier' must be a number >= 1.0."
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

        # Validate optional weight maps when present
        if "component_weights" in config_data and not isinstance(
            config_data["component_weights"], dict
        ):
            raise ValueError("'component_weights' must be a dictionary.")

        return config_data

    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in scoring config file: {e}") from e
    except IOError as e:
        raise ValueError(f"Error reading scoring config file: {e}") from e


def save_scoring_config(config: Dict[str, Any]) -> None:
    """
    Save the scoring configuration to the scoring_config.json file.

    This validates the config before saving to ensure it's valid.

    Args:
        config: The scoring configuration to save

    Raises:
        ValueError: If the config is invalid
    """
    # Validate first by loading through the validation logic
    # We'll temporarily write to validate, then keep if valid
    config_path = get_scoring_config_path()
    default_config = get_default_scoring_config()

    # Validate required keys
    required_keys = [
        "base_score",
        "difficulty_multiplier",
        "duration_multiplier",
        "age_factor",
        "due_date_proximity",
        "dependency_chain",
        "priority_multiplier",
    ]
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required key '{key}' in scoring config.")

    # Ensure optional keys have defaults
    if "tag_multipliers" not in config:
        config["tag_multipliers"] = {}
    if "project_multipliers" not in config:
        config["project_multipliers"] = {}
    if "habit_streak_bonus" not in config:
        config["habit_streak_bonus"] = {
            "enabled": True,
            "bonus_per_streak_day": 1.0,
            "max_bonus": 50.0,
        }
    for key in ["age_factor", "due_date_proximity"]:
        default_section = default_config.get(key, {})
        current_section = config.get(key, {})
        if isinstance(current_section, dict):
            config[key] = {**default_section, **current_section}
        else:
            config[key] = default_section
    if "component_weights" not in config:
        config["component_weights"] = default_config["component_weights"]

    penalty_config = config.get("penalty_invert_weights", None)
    default_penalty = default_config["penalty_invert_weights"]
    if isinstance(penalty_config, bool):
        penalty_config = {key: penalty_config for key in default_penalty}
    elif isinstance(penalty_config, dict):
        penalty_config = {
            key: bool(penalty_config.get(key, default_value))
            for key, default_value in default_penalty.items()
        }
    else:
        penalty_config = default_penalty
    config["penalty_invert_weights"] = penalty_config

    try:
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config, f, indent=2)
    except IOError as e:
        raise ValueError(f"Error writing scoring config file: {e}") from e


def build_scoring_config_with_user_multipliers(
    config: Dict[str, Any], user: User
) -> Dict[str, Any]:
    """
    Build a scoring config with user's tag and project multipliers merged in.

    User-defined multipliers take precedence over config file multipliers.

    Args:
        config: The base scoring configuration
        user: The user whose multipliers should be applied

    Returns:
        A copy of the config with user multipliers merged into tag_multipliers
        and project_multipliers
    """
    # Create a shallow copy of the config
    merged_config = dict(config)

    # Merge tag multipliers from user's defined_tags
    tag_multipliers = dict(config.get("tag_multipliers", {}))
    for tag in user.defined_tags:
        # User-defined multipliers override config file multipliers
        tag_multipliers[tag.name] = tag.multiplier
    merged_config["tag_multipliers"] = tag_multipliers

    # Merge project multipliers from user's defined_projects
    project_multipliers = dict(config.get("project_multipliers", {}))
    for project in user.defined_projects:
        # User-defined multipliers override config file multipliers
        project_multipliers[project.name] = project.multiplier
    merged_config["project_multipliers"] = project_multipliers

    return merged_config


def merge_config_with_defaults(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge a partial scoring config with defaults for backward compatibility.
    """
    default_config = get_default_scoring_config()
    merged: Dict[str, Any] = {**default_config, **config}

    for key in [
        "component_weights",
        "difficulty_multiplier",
        "duration_multiplier",
        "priority_multiplier",
        "tag_multipliers",
        "project_multipliers",
        "due_date_proximity",
        "dependency_chain",
        "habit_streak_bonus",
    ]:
        merged[key] = {**default_config.get(key, {}), **config.get(key, {})}

    merged["age_factor"] = {
        **default_config.get("age_factor", {}),
        **config.get("age_factor", {}),
    }

    default_penalty = default_config.get("penalty_invert_weights", {})
    penalty_override = config.get("penalty_invert_weights", default_penalty)
    if isinstance(penalty_override, bool):
        merged_penalty = {key: penalty_override for key in default_penalty}
    elif isinstance(penalty_override, dict):
        merged_penalty = {
            key: bool(penalty_override.get(key, default_penalty[key]))
            for key in default_penalty
        }
    else:
        merged_penalty = default_penalty

    merged["penalty_invert_weights"] = merged_penalty

    return merged


def _get_weight(config: Dict[str, Any], key: str, fallback: float = 1.0) -> float:
    """Get a component weight with a fallback."""
    return float(config.get("component_weights", {}).get(key, fallback))


def _get_penalty_weight(
    config: Dict[str, Any], key: str, fallback: float = 1.0
) -> float:
    """Get a penalty weight with a fallback."""
    base_weight = float(config.get("component_weights", {}).get(key, fallback))
    invert_cfg = config.get("penalty_invert_weights", False)

    invert = False
    if isinstance(invert_cfg, bool):
        invert = invert_cfg
    elif isinstance(invert_cfg, dict):
        invert = bool(invert_cfg.get(key, False))

    if invert:
        if base_weight <= 0:
            return fallback
        return 1.0 / base_weight
    return base_weight


def _component_value(base_score: float, delta: float, weight: float) -> float:
    """Compute weighted component contribution."""
    contribution_delta = max(0.0, delta)
    return base_score * weight * contribution_delta


def _multiplier_delta(multiplier: float) -> float:
    """Return positive delta from a multiplier (>=1.0)."""
    return max(0.0, multiplier - 1.0)


def _inverted_delta(multiplier: float, ceiling: float) -> float:
    """Return inverted delta so smaller multipliers yield larger penalties."""
    if ceiling <= 1.0:
        return 0.0
    return max(0.0, (ceiling - multiplier) / (ceiling - 1.0))


def _get_max_multiplier(multiplier_map: Dict[str, Any]) -> float:
    """Return the maximum multiplier value from a multiplier map."""
    return max(float(value) for value in multiplier_map.values() if value is not None)


@dataclass(frozen=True)
class ComponentAggregationSettings:
    """Settings that drive additive component aggregation."""

    weight_func: Callable[[Dict[str, Any], str], float]
    inverted_keys: set[str] = field(default_factory=set)
    ceilings: dict[str, float] = field(default_factory=dict)


def _calculate_age_multiplier(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """Return the age multiplier for a task."""
    age_config = config.get("age_factor", {})
    if not age_config.get("enabled", True):
        return 1.0

    task_creation_date = task.creation_date.date()
    task_age = effective_date - task_creation_date
    unit_length = 7 if age_config.get("unit", "days") == "weeks" else 1
    age_in_units = max(0, task_age.days // unit_length)

    mult_per_unit = float(age_config.get("multiplier_per_unit", 0.0))
    max_multiplier = float(age_config.get("max_multiplier", 1.0))

    if mult_per_unit <= 0 or max_multiplier <= 1.0:
        return 1.0

    multiplier = 1.0 + (age_in_units * mult_per_unit)
    return min(max_multiplier, max(1.0, multiplier))


def _calculate_tag_multiplier(task: Task, config: Dict[str, Any]) -> float:
    """Return the combined multiplier for all tags on the task."""
    tag_mult = 1.0
    if task.tags:
        for tag in task.tags:
            if tag in config["tag_multipliers"]:
                tag_mult *= float(config["tag_multipliers"][tag])
    return tag_mult


def _calculate_project_multiplier(task: Task, config: Dict[str, Any]) -> float:
    """Return the project multiplier for the task if configured."""
    if task.project and task.project in config["project_multipliers"]:
        return float(config["project_multipliers"][task.project])
    return 1.0


def _collect_multipliers(
    task: Task, config: Dict[str, Any], effective_date: date
) -> tuple[dict[str, float], dict[str, float]]:
    """Build multiplier map and ceilings for all additive components."""
    priority_mult = float(
        config.get("priority_multiplier", {}).get(task.priority.name, 1.0)
    )
    difficulty_mult = float(
        config["difficulty_multiplier"].get(task.difficulty.name, 1.0)
    )
    duration_mult = float(config["duration_multiplier"].get(task.duration.name, 1.0))

    age_mult = _calculate_age_multiplier(task, config, effective_date)
    tag_mult = _calculate_tag_multiplier(task, config)
    project_mult = _calculate_project_multiplier(task, config)
    due_date_mult = calculate_due_date_multiplier(task, config, effective_date)

    multipliers: dict[str, float] = {
        "priority": priority_mult,
        "difficulty": difficulty_mult,
        "duration": duration_mult,
        "age": age_mult,
        "due_date": due_date_mult,
        "tag": tag_mult,
        "project": project_mult,
    }

    ceilings = {
        "difficulty": _get_max_multiplier(config["difficulty_multiplier"]),
        "duration": _get_max_multiplier(config["duration_multiplier"]),
    }

    return multipliers, ceilings


def _sum_weighted_components(
    base_score: float,
    multipliers: dict[str, float],
    config: Dict[str, Any],
    settings: ComponentAggregationSettings,
) -> float:
    """Aggregate weighted component contributions."""
    inverted_keys = settings.inverted_keys or set()
    ceilings = settings.ceilings or {}
    weight_func = settings.weight_func

    total = 0.0
    for key, multiplier in multipliers.items():
        if key in inverted_keys:
            ceiling = ceilings.get(key, multiplier)
            delta = _inverted_delta(multiplier, ceiling)
        else:
            delta = _multiplier_delta(multiplier)

        total += _component_value(
            base_score,
            delta,
            weight_func(config, key),
        )

    return total


def calculate_due_date_multiplier(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """
    Calculate the due date proximity multiplier for a task.

    Returns a multiplier based on how close the task is to its due date:
    - Future tasks beyond the configured window: 1.0 (no bonus)
    - Approaching tasks: 1.0 + (proximity_units * multiplier_per_unit)
    - Overdue tasks: multiplier increases and caps at max_multiplier
    - No due date: 1.0 (no bonus)

    Args:
        task: The task to calculate the multiplier for
        config: The scoring configuration
        effective_date: The date to calculate from

    Returns:
        The due date multiplier (>= 1.0)
    """
    proximity_config = config.get("due_date_proximity", {})

    # Check if due date proximity scoring is enabled
    if not proximity_config.get("enabled", False):
        return 1.0

    # No due date = no multiplier
    if not task.due_date:
        return 1.0

    # Calculate days until due (negative if overdue)
    due_date = task.due_date.date()
    days_until_due = (due_date - effective_date).days

    mult_per_unit = float(proximity_config.get("multiplier_per_unit", 0.0))
    max_multiplier = float(proximity_config.get("max_multiplier", 1.0))
    unit_length = 7 if proximity_config.get("unit", "days") == "weeks" else 1

    if mult_per_unit <= 0 or max_multiplier <= 1.0:
        return 1.0

    max_units = max(0.0, (max_multiplier - 1.0) / mult_per_unit)
    units_until_due = days_until_due / unit_length

    if units_until_due > max_units:
        return 1.0

    if units_until_due < 0:
        proximity_units = min(abs(units_until_due), max_units)
    else:
        proximity_units = max(0.0, max_units - units_until_due)

    proximity_delta = min(max_multiplier - 1.0, proximity_units * mult_per_unit)
    return 1.0 + proximity_delta


def calculate_start_date_bonus(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """
    Calculate the start date aging bonus for a task.

    Adds linear bonus based on days past the start date.
    Uses due_date_proximity configuration with inverted timing semantics.

    Args:
        task: The task to calculate the bonus for
        config: The scoring configuration containing due_date_proximity settings
        effective_date: The date to calculate from

    Returns:
        Bonus points to add to base score (0.0 if disabled or not applicable)
    """
    proximity_config = config.get("due_date_proximity", {})

    # Check if feature is enabled
    if not proximity_config.get("enabled", False):
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

    base_score = float(config.get("base_score", 0.0))
    mult_per_unit = float(proximity_config.get("multiplier_per_unit", 0.0))
    max_multiplier = float(proximity_config.get("max_multiplier", 1.0))
    unit_length = 7 if proximity_config.get("unit", "days") == "weeks" else 1

    if mult_per_unit <= 0 or max_multiplier <= 1.0:
        return 0.0

    max_bonus = base_score * (max_multiplier - 1.0)
    bonus_units = days_past_start / unit_length
    bonus = base_score * (bonus_units * mult_per_unit)
    return min(max_bonus, bonus)


def calculate_dependency_chain_bonus(
    task: Task,
    all_tasks: Dict[str, Task],
    config: Dict[str, Any],
    effective_date: date,
    visited: Optional[set[str]] = None,
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
    visited: Optional[set[str]] = None,
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
    config = merge_config_with_defaults(config)

    base_score = float(config.get("base_score", 0.0))
    multipliers, _ = _collect_multipliers(task, config, effective_date)

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

    total_components = _sum_weighted_components(
        base_score,
        multipliers,
        config,
        ComponentAggregationSettings(weight_func=_get_weight),
    )

    dependency_bonus = 0.0
    if all_tasks is not None:
        dependency_bonus = calculate_dependency_chain_bonus(
            task, all_tasks, config, effective_date, visited
        )

    final_score = additive_base + total_components + dependency_bonus
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


# pylint: disable=too-many-arguments,too-many-positional-arguments,unused-argument
def add_xp(
    user: Any,
    manager: Any,
    points: int,
    source: str = "task_completion",
    task_id: str | None = None,
    description: str = "",
    game_date: Optional[date] = None,
    persist: bool = True,
    print_confirmation: bool = True,
) -> None:
    """
    Add XP points to the user's total, aggregating into daily entries.

    All XP changes are aggregated into daily entries:
    - Positive XP (completions) → daily_earned entry for that date
    - Negative XP (penalties) → daily_lost entry for that date

    Args:
        user: The User object to update
        manager: The DataManager instance to persist changes
        points: The number of XP points to add (can be negative for penalties).
        source: The source of XP (task_completion, penalty, withdrawal, etc.)
        task_id: Optional associated task ID (not used for aggregated entries)
        description: Optional description of the transaction
        game_date: The game day this XP applies to (defaults to today)
    """
    # Import XPTransaction here to avoid circular import
    # pylint: disable=import-outside-toplevel
    from datetime import datetime as dt

    from motido.core.models import XPTransaction

    # Update user's total XP
    user.total_xp += points

    # Ensure xp_transactions list exists (for backward compatibility)
    if not hasattr(user, "xp_transactions"):
        user.xp_transactions = []

    # Determine the game date (default to today)
    effective_game_date = game_date if game_date is not None else date.today()

    # Determine aggregate source type based on points direction
    # Cast to Any to satisfy mypy - these are valid XPSource literal values
    aggregate_source: Any = "daily_earned" if points > 0 else "daily_lost"

    # Look for existing daily entry for this date and source type
    existing_entry = None
    for transaction in user.xp_transactions:
        if (
            hasattr(transaction, "game_date")
            and transaction.game_date == effective_game_date
            and transaction.source == aggregate_source
        ):
            existing_entry = transaction
            break

    if existing_entry:
        # Update existing entry
        existing_entry.amount += points
        existing_entry.timestamp = dt.now()
        # Update description to reflect the aggregate
        if points > 0:
            existing_entry.description = (
                f"Earned {existing_entry.amount} XP on "
                f"{effective_game_date.strftime('%Y-%m-%d')}"
            )
        else:
            existing_entry.description = (
                f"Lost {abs(existing_entry.amount)} XP on "
                f"{effective_game_date.strftime('%Y-%m-%d')}"
            )

        dirty_ids = getattr(user, "_dirty_xp_transaction_ids", None)
        if dirty_ids is None:
            dirty_ids = set()
            setattr(user, "_dirty_xp_transaction_ids", dirty_ids)
        dirty_ids.add(existing_entry.id)
    else:
        # Create new daily aggregate entry
        if points > 0:
            entry_description = (
                f"Earned {points} XP on {effective_game_date.strftime('%Y-%m-%d')}"
            )
        else:
            entry_description = (
                f"Lost {abs(points)} XP on {effective_game_date.strftime('%Y-%m-%d')}"
            )

        transaction = XPTransaction(
            amount=points,
            source=aggregate_source,
            timestamp=dt.now(),
            task_id=None,  # Aggregate entries don't track individual tasks
            description=entry_description,
            game_date=effective_game_date,
        )
        user.xp_transactions.append(transaction)

        dirty_ids = getattr(user, "_dirty_xp_transaction_ids", None)
        if dirty_ids is None:
            dirty_ids = set()
            setattr(user, "_dirty_xp_transaction_ids", dirty_ids)
        dirty_ids.add(transaction.id)

    if persist:
        manager.save_user(user)

    if print_confirmation:
        if points > 0:
            print(f"Added {points} XP points! Total XP: {user.total_xp}")
        else:
            print(
                f"Deducted {abs(points)} XP points as penalty. Total XP: {user.total_xp}"
            )


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
    # Import XPTransaction here to avoid circular import
    # pylint: disable=import-outside-toplevel
    from datetime import datetime as dt

    from motido.core.models import XPTransaction

    if points <= 0:
        raise ValueError("Withdrawal amount must be positive.")

    if user.total_xp >= points:
        user.total_xp -= points

        # Create transaction record
        transaction = XPTransaction(
            amount=-points,  # Negative for withdrawal
            source="withdrawal",
            timestamp=dt.now(),
            description=f"Manual withdrawal of {points} XP",
        )

        # Ensure xp_transactions list exists (for backward compatibility)
        if not hasattr(user, "xp_transactions"):
            user.xp_transactions = []
        user.xp_transactions.append(transaction)

        manager.save_user(user)
        print(f"Withdrew {points} XP points. Total XP: {user.total_xp}")
        return True

    print(f"Insufficient XP. Required: {points}, Available: {user.total_xp}")
    return False


def get_penalty_multiplier(
    difficulty: Difficulty, duration: Duration, config: Dict[str, Any]
) -> float:
    """
    Calculate penalty intensity by inverting difficulty/duration emphasis.

    Args:
        difficulty: The task's difficulty level
        duration: The task's duration level
        config: The scoring configuration containing multipliers

    Returns:
        Combined inverted penalty multiplier delta (higher means harsher penalty)
    """
    difficulty_xp: float = float(
        config["difficulty_multiplier"].get(difficulty.name, 1.0)
    )
    duration_xp: float = float(config["duration_multiplier"].get(duration.name, 1.0))
    max_difficulty = _get_max_multiplier(config["difficulty_multiplier"])
    max_duration = _get_max_multiplier(config["duration_multiplier"])
    difficulty_penalty = _inverted_delta(difficulty_xp, max_difficulty)
    duration_penalty = _inverted_delta(duration_xp, max_duration)
    return difficulty_penalty + duration_penalty


def calculate_penalty_score(
    task: Task, config: Dict[str, Any], effective_date: date
) -> float:
    """
    Calculate the penalty score for a task (penalty if not completed today).

    The penalty applies only for tasks that are due today or overdue.

    Args:
        task: The task to calculate penalty for
        config: The scoring configuration
        effective_date: The date to calculate penalty for

    Returns:
        The penalty score (positive value representing XP that would be lost)
    """
    config = merge_config_with_defaults(config)

    # No penalty for completed tasks
    if task.is_complete:
        return 0.0

    # No penalty for tasks not yet due
    if not task.due_date:
        return 0.0

    task_due_date = (
        task.due_date.date() if hasattr(task.due_date, "date") else task.due_date
    )

    if task_due_date > effective_date:
        return 0.0

    base_score: float = float(config.get("base_score", 10.0))
    multipliers, ceilings = _collect_multipliers(task, config, effective_date)

    penalty_total = _component_value(
        base_score,
        1.0,
        _get_penalty_weight(config, "base"),
    )
    penalty_total += _sum_weighted_components(
        base_score,
        multipliers,
        config,
        ComponentAggregationSettings(
            weight_func=_get_penalty_weight,
            inverted_keys={"difficulty", "duration"},
            ceilings=ceilings,
        ),
    )

    return max(0.0, penalty_total)


def calculate_task_scores(
    task: Task,
    all_tasks: Dict[str, Task],
    config: Dict[str, Any],
    effective_date: date,
) -> tuple[float, float, float]:
    """
    Calculate all scoring values for a task.

    Args:
        task: The task to calculate scores for
        all_tasks: Dict of all tasks for dependency resolution
        config: The scoring configuration
        effective_date: The date for score calculation

    Returns:
        Tuple of (xp_score, penalty_score, net_score)
    """
    # Calculate XP score
    xp_score = calculate_score(task, all_tasks, config, effective_date)

    # Calculate penalty score (only for due/overdue tasks)
    penalty_score = calculate_penalty_score(task, config, effective_date)

    # Net score = XP + penalty avoided
    net_score = xp_score + penalty_score

    return (xp_score, penalty_score, net_score)


def apply_penalties(
    user: Any,
    manager: Any,
    effective_date: date,
    config: Dict[str, Any],
    all_tasks: list[Task],
    persist: bool = True,
) -> None:
    """
    Apply daily penalties for incomplete tasks for a single day.

    This function applies penalties for the specific effective_date.
    The caller is responsible for iterating over multiple days if needed.

    Args:
        user: The User object to update
        manager: The DataManager instance to persist changes
        effective_date: The specific date to apply penalties for
        config: The scoring configuration
        all_tasks: List of all tasks to check for penalties
    """
    # Check if user is in vacation mode
    if getattr(user, "vacation_mode", False):
        print("Vacation mode enabled. Skipping penalties.")
        return

    penalties_applied = 0
    # Apply penalties for each incomplete task on this specific date
    for task in all_tasks:
        # Only penalize tasks created before this date
        if not task.is_complete and task.creation_date.date() < effective_date:
            # Penalties only apply to tasks that are due today or overdue.
            if not task.due_date:
                continue
            if task.due_date.date() > effective_date:
                continue

            penalty_value = calculate_penalty_score(task, config, effective_date)
            penalty = max(1, int(round(penalty_value)))

            penalties_applied += 1
            add_xp(
                user,
                manager,
                -penalty,
                source="penalty",
                task_id=task.id,
                description=f"Penalty for incomplete: {task.title}",
                game_date=effective_date,
                persist=False,
                print_confirmation=False,
            )

    if persist and penalties_applied > 0:
        manager.save_user(user)


def check_badges(user: Any, manager: Any, config: Dict[str, Any]) -> list[Any]:
    """
    Check if the user has earned any new badges based on current stats.

    Args:
        user: The User object to check badges for
        manager: The DataManager instance to persist changes
        config: The scoring configuration containing badge definitions

    Returns:
        List of newly earned Badge objects
    """
    # pylint: disable=import-outside-toplevel
    from datetime import datetime as dt

    from motido.core.models import Badge

    # Get badge definitions from config
    badge_defs = config.get("badges", [])
    if not badge_defs:
        return []

    # Calculate current stats
    completed_tasks = [t for t in user.tasks if t.is_complete]
    tasks_completed_count = len(completed_tasks)

    habits_completed_count = len([t for t in completed_tasks if t.is_habit])

    # Find best streak across all habits
    best_streak = 0
    for task in user.tasks:
        if task.is_habit:
            best_streak = max(best_streak, task.streak_best, task.streak_current)

    total_xp = user.total_xp

    # Get currently earned badge IDs
    earned_badge_ids = {b.id for b in user.badges if b.is_earned()}

    # Check each badge definition
    newly_earned = []
    for badge_def in badge_defs:
        badge_id = badge_def.get("id")
        if not badge_id or badge_id in earned_badge_ids:
            continue  # Already earned or invalid

        criteria = badge_def.get("criteria", {})
        earned = False

        # Check tasks_completed criteria
        if "tasks_completed" in criteria:
            if tasks_completed_count >= criteria["tasks_completed"]:
                earned = True

        # Check habits_completed criteria
        if "habits_completed" in criteria:
            if habits_completed_count >= criteria["habits_completed"]:
                earned = True

        # Check streak_days criteria
        if "streak_days" in criteria:
            if best_streak >= criteria["streak_days"]:
                earned = True

        # Check total_xp criteria
        if "total_xp" in criteria:
            if total_xp >= criteria["total_xp"]:
                earned = True

        if earned:
            new_badge = Badge(
                id=badge_id,
                name=badge_def.get("name", badge_id),
                description=badge_def.get("description", ""),
                glyph=badge_def.get("glyph", "🏅"),
                earned_date=dt.now(),
            )
            user.badges.append(new_badge)
            newly_earned.append(new_badge)

    # Save if any new badges were earned
    if newly_earned:
        manager.save_user(user)

    return newly_earned
