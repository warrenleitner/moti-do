"""Test fixtures for use in multiple test modules."""

# pylint: disable=duplicate-code

from datetime import date, datetime
from typing import Any, Dict, List, Tuple

from motido.core.models import Difficulty, Duration, Priority, Task


def get_default_scoring_config() -> Dict[str, Any]:
    """Return a default scoring configuration for tests."""
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


def get_simple_scoring_config() -> Dict[str, Any]:
    """Return a simplified scoring configuration for tests."""
    return get_default_scoring_config()


def get_weekly_workload_fixture() -> Tuple[date, List[Task]]:
    """
    Build a representative weekly workload for calibration testing.

    Returns:
        Tuple of effective date and a list of tasks reflecting a typical week.
    """
    effective_date = date(2025, 11, 17)
    tasks = [
        Task(
            title="Ship quarterly report",
            creation_date=datetime(2025, 11, 5),
            priority=Priority.HIGH,
            difficulty=Difficulty.HIGH,
            duration=Duration.LONG,
            due_date=datetime(2025, 11, 18),
            start_date=datetime(2025, 11, 7),
            text_description="Finalize Q4 reporting package",
            tags=["reporting"],
        ),
        Task(
            title="Customer outage fix",
            creation_date=datetime(2025, 11, 14),
            priority=Priority.DEFCON_ONE,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.SHORT,
            due_date=datetime(2025, 11, 16),
            text_description="Patch hotfix for incident TTR",
            tags=["incident"],
        ),
        Task(
            title="Refactor onboarding flow",
            creation_date=datetime(2025, 11, 1),
            priority=Priority.MEDIUM,
            difficulty=Difficulty.HIGH,
            duration=Duration.MEDIUM,
            start_date=datetime(2025, 11, 5),
            due_date=datetime(2025, 11, 30),
            text_description="Stabilize user onboarding paths",
            project="Growth",
        ),
        Task(
            title="Write regression tests",
            creation_date=datetime(2025, 11, 12),
            priority=Priority.MEDIUM,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.MEDIUM,
            due_date=datetime(2025, 11, 19),
            text_description="Expand coverage for auth flows",
            tags=["quality"],
        ),
        Task(
            title="Team roadmap planning",
            creation_date=datetime(2025, 11, 10),
            priority=Priority.MEDIUM,
            difficulty=Difficulty.LOW,
            duration=Duration.MEDIUM,
            start_date=datetime(2025, 11, 11),
            text_description="Align Q1 priorities with leads",
        ),
        Task(
            title="Weekly sync deck",
            creation_date=datetime(2025, 11, 13),
            priority=Priority.LOW,
            difficulty=Difficulty.LOW,
            duration=Duration.SHORT,
            due_date=datetime(2025, 11, 15),
            text_description="Slides for leadership sync",
        ),
        Task(
            title="Update API docs",
            creation_date=datetime(2025, 11, 15),
            priority=Priority.LOW,
            difficulty=Difficulty.TRIVIAL,
            duration=Duration.MINUSCULE,
            due_date=datetime(2025, 11, 22),
            text_description="Refresh public API reference",
            tags=["docs"],
        ),
        Task(
            title="Infra maintenance window",
            creation_date=datetime(2025, 11, 3),
            priority=Priority.HIGH,
            difficulty=Difficulty.MEDIUM,
            duration=Duration.LONG,
            start_date=datetime(2025, 11, 6),
            due_date=datetime(2025, 11, 20),
            text_description="Patch base images and rotate keys",
            project="Platform",
        ),
        Task(
            title="Automation spike",
            creation_date=datetime(2025, 11, 8),
            priority=Priority.HIGH,
            difficulty=Difficulty.HERCULEAN,
            duration=Duration.ODYSSEYAN,
            start_date=datetime(2025, 11, 9),
            due_date=datetime(2025, 11, 25),
            text_description="Prototype new deployment pipeline",
            project="Platform",
        ),
        Task(
            title="Daily standup note",
            creation_date=datetime(2025, 11, 10),
            priority=Priority.TRIVIAL,
            difficulty=Difficulty.TRIVIAL,
            duration=Duration.MINUSCULE,
            is_habit=True,
            recurrence_rule="daily",
            streak_current=5,
            streak_best=10,
            text_description="Jot highlights before standup",
        ),
    ]

    return effective_date, tasks
