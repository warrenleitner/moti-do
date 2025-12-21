"""Test fixtures for use in multiple test modules."""

# pylint: disable=duplicate-code

from typing import Any, Dict


def get_default_scoring_config() -> Dict[str, Any]:
    """Return a default scoring configuration for tests."""
    return {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
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


def get_simple_scoring_config() -> Dict[str, Any]:
    """Return a simplified scoring configuration for tests."""
    return {
        "base_score": 10,
        "field_presence_bonus": {"title": 5},
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
